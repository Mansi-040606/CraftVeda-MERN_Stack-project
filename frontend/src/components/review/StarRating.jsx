import { useState } from 'react';

// Star display (and optional interactive picker when onChange is provided).
function StarRating({ value = 0, onChange, size = 'text-lg' }) {
  const [hovered, setHovered] = useState(0);
  const interactive = typeof onChange === 'function';
  const shown = interactive && hovered > 0 ? hovered : value;

  return (
    <span
      className={`${size} ${interactive ? 'cursor-pointer' : ''} select-none`}
      onMouseLeave={() => setHovered(0)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`Rating: ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={interactive ? 'px-0.5' : ''}
          onClick={interactive ? () => onChange(star) : undefined}
          onMouseEnter={interactive ? () => setHovered(star) : undefined}
          role={interactive ? 'radio' : undefined}
          aria-checked={interactive ? shown === star : undefined}
          aria-label={interactive ? `${star} star${star > 1 ? 's' : ''}` : undefined}
        >
          {star <= shown ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

export default StarRating;
