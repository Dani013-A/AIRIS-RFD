import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white border border-brand-primary/25 p-6 shadow-2xl transition-all">
        <div className="flex items-center justify-between border-b border-gray-150 pb-4">
          <h3 className="text-lg font-extrabold text-brand-primary">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-brand-slate hover:bg-gray-100 hover:text-brand-primary"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
