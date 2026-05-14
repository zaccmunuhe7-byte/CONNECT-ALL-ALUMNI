import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/client';

type UserSuggestion = {
  id: string;
  fullName: string;
  profilePictureUrl: string;
};

type MentionInputProps = {
  name?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
};

export function MentionInput({
  name,
  placeholder,
  required,
  value: controlledValue,
  onChange,
  onSubmit,
  multiline = false,
  maxLength,
  className = ''
}: MentionInputProps) {
  const [localValue, setLocalValue] = useState('');
  const value = controlledValue !== undefined ? controlledValue : localValue;
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setValue = useCallback((v: string) => {
    if (onChange) onChange(v);
    else setLocalValue(v);
  }, [onChange]);

  // Fetch user suggestions
  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api<UserSuggestion[]>(`/api/search/users?q=${encodeURIComponent(mentionQuery)}`);
        setSuggestions(results);
        setSelectedIndex(0);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [mentionQuery]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    const newValue = e.target.value;
    if (maxLength && newValue.length > maxLength) return;
    setValue(newValue);

    // Detect @ mentions
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([A-Za-z\s]*)$/);

    if (atMatch) {
      setMentionStart(cursorPos - atMatch[1].length - 1);
      setMentionQuery(atMatch[1]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  }

  function selectSuggestion(user: UserSuggestion) {
    const before = value.slice(0, mentionStart);
    const after = value.slice((inputRef.current as any)?.selectionStart || value.length);
    const newValue = `${before}@${user.fullName} ${after}`;
    setValue(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery('');

    // Focus back to input
    setTimeout(() => {
      const pos = before.length + user.fullName.length + 2; // +2 for @ and space
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
        return;
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }

    // Submit on Enter (for single-line inputs only, and not when suggestions are open)
    if (!multiline && e.key === 'Enter' && !showSuggestions && onSubmit) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value);
        setValue('');
      }
    }
  }

  // Close suggestions on outside click
  useEffect(() => {
    if (showSuggestions) {
      const handler = (e: MouseEvent) => {
        if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
          setShowSuggestions(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showSuggestions]);

  const commonProps = {
    ref: inputRef as any,
    name,
    placeholder,
    required,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    className: `mention-input ${className}`,
    autoComplete: 'off' as const,
  };

  return (
    <div className="mention-input-wrapper">
      {multiline ? (
        <textarea {...commonProps} />
      ) : (
        <input {...commonProps} />
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mention-suggestions" ref={suggestionsRef}>
          {suggestions.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              className={`mention-suggestion-item ${idx === selectedIndex ? 'active' : ''}`}
              onClick={() => selectSuggestion(user)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <img src={user.profilePictureUrl} alt="" className="mention-avatar" />
              <span className="mention-name">{user.fullName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Render text with @mentions highlighted as styled spans.
 */
export function renderMentions(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /@([A-Za-z][A-Za-z\s]{1,60}?)(?=\s@|\s*$|[.,!?;:\n])/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add highlighted mention
    parts.push(
      <span key={match.index} className="mention-highlight">
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
