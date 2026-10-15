import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useMobileSheetDismiss } from "../layout/useMobileSheetDismiss";
import "./MobileActionSheet.css";

export function MobileActionSheet({ title, onClose, children, variant = "default" }) {
  const sheetRef = useRef(null);
  const titleId = useId();
  const sheetDismiss = useMobileSheetDismiss(onClose, sheetRef);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    const firstAction = sheetRef.current?.querySelector("button");
    firstAction?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const buttons = sheetRef.current?.querySelectorAll("button");
      if (!buttons?.length) return;
      const firstButton = buttons[0];
      const lastButton = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault();
        lastButton.focus();
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault();
        firstButton.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className={`mobile-action-sheet-backdrop mobile-sheet-backdrop ${sheetDismiss.backdropClassName}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={sheetRef} className={`mobile-action-sheet mobile-edge-to-edge-sheet${variant === "menu" ? " mobile-action-sheet-menu" : ""} ${sheetDismiss.dragClassName}`} onTransitionEnd={sheetDismiss.onTransitionEnd} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="mobile-action-sheet-header mobile-sheet-drag-handle" {...sheetDismiss.dragHandleProps}>
          <h2 id={titleId}>{title}</h2>
        </header>
        <div className="mobile-action-sheet-actions">{children}</div>
        <button type="button" className="mobile-action-sheet-cancel" onClick={onClose}>Cancel</button>
      </section>
    </div>,
    document.body,
  );
}
