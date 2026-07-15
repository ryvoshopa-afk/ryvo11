import React, { createContext, useContext, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, LogOut, AlertTriangle, HelpCircle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmationContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmationProvider');
  }
  return context;
}

export function ConfirmationProvider({ children, language }: { children: React.ReactNode; language: 'ar' | 'en' | 'fr' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
    }
  };

  const isRtl = language === 'ar';

  const getIcon = (type?: 'danger' | 'warning' | 'info') => {
    switch (type) {
      case 'danger':
        return (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <Trash2 className="h-7 w-7" />
          </div>
        );
      case 'warning':
        return (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <HelpCircle className="h-7 w-7" />
          </div>
        );
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {isOpen && options && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl dark:border-gray-800 dark:bg-gray-900"
              style={{ direction: isRtl ? 'rtl' : 'ltr' }}
            >
              {/* Close Button */}
              <button
                onClick={handleCancel}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Icon */}
              <div className="mt-2 mb-4">
                {getIcon(options.type)}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {options.title}
              </h3>

              {/* Description */}
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-2">
                {options.description}
              </p>

              {/* Actions Grid */}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition duration-150 cursor-pointer"
                >
                  {options.cancelText || (isRtl ? 'إلغاء' : 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`w-full px-5 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition duration-150 cursor-pointer ${
                    options.type === 'danger'
                      ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                      : options.type === 'warning'
                        ? 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600'
                        : 'bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600'
                  }`}
                >
                  {options.confirmText || (isRtl ? 'تأكيد' : 'Confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmationContext.Provider>
  );
}
