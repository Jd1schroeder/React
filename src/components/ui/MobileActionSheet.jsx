import { useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useMobileSheetDismiss } from "../layout/useMobileSheetDismiss";
import "./MobileActionSheet.css";

export function MobileActionSheet({ title, onClose, children }) {
  const sheetRef = useRef(null);
  const sheetDismiss = useMobileSheetDismiss(onClose, sheetRef);

  return createPortal(
    <div className={`mobile-action-sheet-backdrop mobile-sheet-backdrop ${sheetDismiss.backdropClassName}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={sheetRef} className={`mobile-action-sheet mobile-edge-to-edge-sheet ${sheetDismiss.dragClassName}`} onTransitionEnd={sheetDismiss.onTransitionEnd} role="dialog" aria-modal="true" aria-labelledby="mobile-action-sheet-title">
        <header className="mobile-action-sheet-header mobile-sheet-drag-handle" {...sheetDismiss.dragHandleProps}>
          <h2 id="mobile-action-sheet-title">{title}</h2>
          <button type="button" className="mobile-action-sheet-close" onClick={onClose} aria-label="Close"><X size={24} aria-hidden="true" /></button>
        </header>
        <div className="mobile-action-sheet-actions">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
