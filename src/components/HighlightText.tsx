import React from 'react';
import { escapeRegex } from '../lib/searchUtils';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
  style?: React.CSSProperties;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, query, className, style }) => {
  if (!query || !query.trim() || !text) {
    return <span className={className} style={style}>{text}</span>;
  }
  const q = query.trim();
  try {
    const regex = new RegExp(`(${escapeRegex(q)})`, 'gi');
    const parts = text.split(regex);
    return (
      <span className={className} style={style}>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              style={{
                backgroundColor: '#ffd54f',
                color: '#000',
                padding: '1px 3px',
                borderRadius: '2px',
                fontWeight: 600,
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  } catch {
    return <span className={className} style={style}>{text}</span>;
  }
};
