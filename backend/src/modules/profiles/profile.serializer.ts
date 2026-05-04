type ProfileRow = Record<string, unknown> & {
  viewer_is_owner?: boolean;
  viewer_is_admin?: boolean;
  email_visibility?: 'PUBLIC' | 'PRIVATE';
  phone_visibility?: 'PUBLIC' | 'PRIVATE';
  email?: string;
  phone_number?: string | null;
};

export function serializeProfile(row: ProfileRow) {
  const privileged = Boolean(row.viewer_is_owner || row.viewer_is_admin);
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: privileged || row.email_visibility === 'PUBLIC' ? row.email : undefined,
    phoneNumber: privileged || row.phone_visibility === 'PUBLIC' ? row.phone_number : undefined,
    role: privileged ? row.role : undefined,
    status: privileged ? row.status : undefined,
    education: {
      primarySchool: row.primary_school,
      highSchool: row.high_school,
      university: row.university
    },
    professional: {
      currentJob: row.current_job,
      currentWorkplace: row.current_workplace,
      pastJobs: row.past_jobs,
      workExperience: row.work_experience
    },
    media: {
      profilePictureUrl: row.profile_picture_url,
      images: row.images ?? []
    },
    privacy: privileged ? {
      emailVisibility: row.email_visibility,
      phoneVisibility: row.phone_visibility
    } : undefined
  };
}
