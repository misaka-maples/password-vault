import React, { createContext, useContext, useState, useCallback } from 'react';
import { ThemedDialog, ThemedDialogOptions } from '../components/ThemedDialog';

interface ThemedDialogContextType {
  showDialog: (options: ThemedDialogOptions) => void;
  hideDialog: () => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: Partial<Omit<ThemedDialogOptions, 'title' | 'message' | 'onConfirm'>>
  ) => void;
  showAlert: (
    title: string,
    message: string,
    options?: Partial<Omit<ThemedDialogOptions, 'title' | 'message'>>
  ) => void;
}

const ThemedDialogContext = createContext<ThemedDialogContextType | undefined>(undefined);

export const ThemedDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ThemedDialogOptions | null>(null);

  const showDialog = useCallback((opts: ThemedDialogOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const hideDialog = useCallback(() => {
    setVisible(false);
  }, []);

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void | Promise<void>,
      extra?: Partial<Omit<ThemedDialogOptions, 'title' | 'message' | 'onConfirm'>>
    ) => {
      setOptions({
        title,
        message,
        cancelText: '取消',
        confirmText: '确定',
        confirmType: 'primary',
        onConfirm,
        ...extra,
      });
      setVisible(true);
    },
    []
  );

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      extra?: Partial<Omit<ThemedDialogOptions, 'title' | 'message'>>
    ) => {
      setOptions({
        title,
        message,
        confirmText: '我知道了',
        confirmType: 'primary',
        ...extra,
      });
      setVisible(true);
    },
    []
  );

  return (
    <ThemedDialogContext.Provider
      value={{
        showDialog,
        hideDialog,
        showConfirm,
        showAlert,
      }}
    >
      {children}
      <ThemedDialog visible={visible} options={options} onClose={hideDialog} />
    </ThemedDialogContext.Provider>
  );
};

export const useThemedDialog = () => {
  const context = useContext(ThemedDialogContext);
  if (!context) {
    throw new Error('useThemedDialog must be used within a ThemedDialogProvider');
  }
  return context;
};
