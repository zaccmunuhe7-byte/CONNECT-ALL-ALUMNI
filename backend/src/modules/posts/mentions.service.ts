import { query } from '../../db/pool.js';

/**
 * Extract @mentions from text, look up users, save to DB, and create notifications.
 * Mention format: @Full Name (matches against user full_name).
 * We look for @word patterns and try to match against known users.
 */
export async function extractAndSaveMentions(
  text: string,
  entityType: 'post' | 'comment',
  entityId: string,
  authorId: string
): Promise<string[]> {
  // Match @username patterns (captures text after @ until end of word boundary)
  // Supports multi-word names: @John Doe => we'll try progressively
  const mentionPattern = /@([A-Za-z][A-Za-z\s]{1,60}?)(?=\s@|\s*$|[.,!?;:\n])/g;
  const rawMentions: string[] = [];
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name.length >= 2) {
      rawMentions.push(name);
    }
  }

  if (rawMentions.length === 0) return [];

  const mentionedUserIds: string[] = [];

  for (const name of rawMentions) {
    // Look up user by full_name (case-insensitive)
    const result = await query<{ id: string; full_name: string }>(
      `SELECT id, full_name FROM users
       WHERE lower(full_name) = lower($1) AND status = 'ACTIVE' AND id != $2
       LIMIT 1`,
      [name, authorId]
    );

    if (result.rowCount && result.rows[0]) {
      const userId = result.rows[0].id;
      mentionedUserIds.push(userId);

      // Save mention to the appropriate table
      if (entityType === 'post') {
        await query(
          `INSERT INTO post_mentions (post_id, mentioned_user_id)
           VALUES ($1, $2)
           ON CONFLICT (post_id, mentioned_user_id) DO NOTHING`,
          [entityId, userId]
        );
      } else {
        await query(
          `INSERT INTO comment_mentions (comment_id, mentioned_user_id)
           VALUES ($1, $2)
           ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING`,
          [entityId, userId]
        );
      }

      // Get author name for notification
      const authorResult = await query<{ full_name: string }>(
        'SELECT full_name FROM users WHERE id = $1',
        [authorId]
      );
      const authorName = authorResult.rows[0]?.full_name || 'Someone';

      // Create notification for mentioned user
      await query(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          entityType === 'post' ? 'post_mention' : 'comment_mention',
          `${authorName} mentioned you`,
          entityType === 'post'
            ? `${authorName} mentioned you in a post.`
            : `${authorName} mentioned you in a comment.`,
          entityId
        ]
      );
    }
  }

  return mentionedUserIds;
}
