import { useRef, useState } from 'react';
import { toast } from '../Toast';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function validateImageFile(file, { maxBytes = MAX_IMAGE_BYTES } = {}) {
  if (!file) return 'No file selected';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" is not a JPG, PNG or WebP image`;
  }
  if (file.size > maxBytes) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" is ${mb} MB — the limit is 2 MB`;
  }
  return null;
}

/**
 * Hidden file input + button for a single image upload.
 * Validates type/size client-side, then hands the file to `onFile`.
 * Returns null on success; shows a toast on validation failure.
 */
export default function UploadButton({
  label = 'Upload image',
  onFile,
  className = '',
  disabled = false,
  busy = false,
  accept = ACCEPTED_IMAGE_TYPES.join(','),
}) {
  const inputRef = useRef(null);
  const [pending, setPending] = useState(false);

  const handle = async (file) => {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setPending(true);
    try {
      await onFile(file);
    } finally {
      setPending(false);
    }
  };

  const working = pending || busy;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          handle(file);
        }}
      />
      <button
        type="button"
        disabled={disabled || working}
        onClick={() => inputRef.current?.click()}
        className={`rounded-sm px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${className}`}
      >
        {working ? 'Uploading…' : label}
      </button>
    </>
  );
}
