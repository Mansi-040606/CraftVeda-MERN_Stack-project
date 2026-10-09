// Indian Rupee formatting, e.g. 12999 -> ₹12,999
export const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
