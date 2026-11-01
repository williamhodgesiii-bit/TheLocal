"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import Portal from "./Portal";
import { Icon } from "./Icons";

/**
 * One sheet for everything that opens over the page: from the bottom on a phone (drag it down to
 * close), a small centered panel on a computer. Esc and a tap outside close it.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
  foot,
  wide,
  label,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
  wide?: boolean;
  /** accessible name when there's no visible title */
  label?: string;
}) {
  const drag = useDragControls();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 250);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, i: PanInfo) => {
    if (i.offset.y > 110 || i.velocity.y > 600) onClose();
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="sh-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onMouseDown={onClose}>
            <motion.div
              ref={panel}
              className={`sh ${wide ? "sh-wide" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-label={typeof title === "string" ? title : label}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 34, stiffness: 380 }}
              drag="y"
              dragControls={drag}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={onDragEnd}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="sh-grab" onPointerDown={(e) => drag.start(e)} aria-hidden>
                <span />
              </div>
              <div className="sh-head" onPointerDown={(e) => drag.start(e)}>
                {title ? <h2 className="sh-title">{title}</h2> : <span />}
                <button type="button" className="icon-btn" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close">
                  <Icon name="close" size={20} />
                </button>
              </div>
              <div className="sh-body">{children}</div>
              {foot && <div className="sh-foot">{foot}</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
