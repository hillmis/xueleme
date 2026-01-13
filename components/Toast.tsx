
import React, { useEffect } from 'react';

interface ToastProps {
  title: string;
  description?: string;
  onClose: () => void;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ title, description, onClose, visible }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-[320px] glass rounded-2xl p-4 shadow-2xl animate-in slide-in-from-right duration-300">
      <h4 className="font-bold text-sm text-indigo-500 dark:text-indigo-400">{title}</h4>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
    </div>
  );
};
