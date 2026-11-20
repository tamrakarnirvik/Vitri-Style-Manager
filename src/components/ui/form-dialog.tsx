"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export function FormDialog({ title, open, onClose, children }: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onMouseDown={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-label={title}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/45"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" aria-label="Close form" onClick={onClose} className="rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </motion.div>
    </dialog>
  );
}
