import React from 'react';
import { useUIContext } from '../context/ui';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface ModalProps extends React.PropsWithChildren {
  actions?: {
    label: string;
    onClick: () => void;
    disable?: boolean;
  }[];
}

const Modal: React.FC<ModalProps> = ({ actions, children }: ModalProps) => {
  const { setModalOpen } = useUIContext();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-[90%] max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl flex flex-col gap-4">
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 text-foreground"
          onClick={() => setModalOpen(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <div className="flex items-center justify-center">{children}</div>
        {actions?.length ? (
          <div className="flex flex-col gap-2">
            {actions.map(({ label, onClick, disable = false }) => (
              <Button
                key={label}
                onClick={() => onClick()}
                disabled={disable}
                className="w-full"
              >
                {label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Modal;

Modal.displayName = 'Modal';
