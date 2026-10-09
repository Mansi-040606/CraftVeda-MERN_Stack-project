// Product categories — must match the backend Product enum.
export const CATEGORIES = [
  { value: 'textiles', label: 'Textiles' },
  { value: 'pottery', label: 'Pottery' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'woodwork', label: 'Woodwork' },
  { value: 'metalwork', label: 'Metalwork' },
  { value: 'painting', label: 'Painting' },
  { value: 'sculpture', label: 'Sculpture' },
  { value: 'embroidery', label: 'Embroidery' },
  { value: 'other', label: 'Other' },
];

// 'pottery' -> 'Pottery' (falls back to the raw value)
export const categoryLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label || value || '';
