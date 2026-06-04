import React, { createContext, useContext, useState, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmContextType = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: string | ConfirmOptions): Promise<boolean> => {
    setIsOpen(true);
    if (typeof opts === 'string') {
      setOptions({ message: opts });
    } else {
      setOptions(opts);
    }
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <AlertDialogContent className="sm:max-w-[420px] rounded-2xl p-6 border border-border bg-card shadow-xl animate-in fade-in duration-200">
          <AlertDialogHeader className="space-y-1.5">
            <AlertDialogTitle className="text-base font-bold text-foreground">
              {options.title || 'Confirm Action'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {options.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4 flex items-center justify-end">
            <AlertDialogCancel onClick={handleCancel} className="text-xs font-bold rounded-xl border border-border/80 hover:bg-muted py-2 px-4 h-9">
              {options.cancelText || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 py-2 px-4 h-9 shadow-sm">
              {options.confirmText || 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
