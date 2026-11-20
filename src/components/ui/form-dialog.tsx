"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export function FormDialog({ title, open, onClose, children }: {
  title: string; open: boolean; onClose: () => void; children: ReactNode;
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
      onMouseDown={(event) => { if (event.target === dialogRef.current) onClose(); }}
      aria-label={title}
      className="fixed inset-0 m-auto max-h-[min(94dvh,900px)] w-[calc(100%-1rem)] max-w-lg overflow-y-auto overscroll-contain rounded-[18px] border border-[#e3eaf4] bg-white p-0 text-[#25354e] shadow-[0_24px_80px_rgba(20,40,72,.18)] backdrop:bg-[#23344e]/40 sm:w-[calc(100%-2rem)]"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10, scale: .99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduced ? 0 : .2, ease: "easeOut" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf1f7] bg-white px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold tracking-tight text-[#2a3a54]">{title}</h2>
          <button
            type="button" aria-label="Close form" onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#7e8da0] hover:bg-[#f4f7fb]"
          ><X size={21} /></button>
        </div>
        <div className="p-4 pb-[max(20px,env(safe-area-inset-bottom,0px))] sm:p-6">{children}</div>
      </motion.div>
    </dialog>
  );
}
