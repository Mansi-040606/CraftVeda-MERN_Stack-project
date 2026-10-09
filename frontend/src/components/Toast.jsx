import { useEffect, useState } from 'react';

const emit = (type, msg) =>
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type, msg, id: Date.now() + Math.random() } }));

export const toast = {
  success: (msg) => emit('success', msg),
  error: (msg) => emit('error', msg),
};

export const errMsg = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.response?.data?.errors?.[0]?.msg || error?.message || fallback;

export default function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handler = (event) => {
      const item = event.detail;
      setItems((prev) => [...prev, item]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), 3500);
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {items.map((item) => (
        <div
          key={item.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white animate-pulse ${
            item.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {item.msg}
        </div>
      ))}
    </div>
  );
}
