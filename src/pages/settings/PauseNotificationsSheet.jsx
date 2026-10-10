import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PAUSE_OPTIONS = [
  "Pause for 30 minutes",
  "Pause for 1 hour",
  "Pause for 4 hours",
  "Pause until tomorrow",
  "Pause until next week",
];

export function PauseNotificationsSheet({ pausedUntil, onCancel, onResume, onSelect }) {
  const sheetRef = useRef(null);
  const dragStartRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const firstOption = sheetRef.current?.querySelector("button");
    firstOption?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
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
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [onCancel]);

  const handlePointerDown = (event) => {
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    dragStartRef.current = { y: event.clientY, time: performance.now(), pointerId: event.pointerId };
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setDragY(Math.max(0, event.clientY - start.y));
  };

  const handlePointerUp = (event) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const distance = Math.max(0, event.clientY - start.y);
    const elapsed = Math.max(1, performance.now() - start.time);
    dragStartRef.current = null;
    setIsDragging(false);
    if (distance > 110 || (distance > 30 && distance / elapsed > 0.65)) {
      setIsDismissing(true);
      window.setTimeout(onCancel, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 180);
      return;
    }
    setDragY(0);
  };

  return createPortal(
    <div className="profile-pause-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className={`profile-pause-sheet${isDragging ? " is-dragging" : ""}${isDismissing ? " is-dismissing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="profile-pause-title" ref={sheetRef} style={{ "--profile-pause-drag-y": `${dragY}px` }}>
        <div className="profile-pause-sheet-grabber" aria-hidden="true" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} />
        {pausedUntil ? <p className="profile-pause-until" id="profile-pause-title">Notifications paused until {new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }).format(pausedUntil)}</p> : <h2 id="profile-pause-title">Pause</h2>}
        <div className="profile-pause-options">
          {pausedUntil && <button type="button" className="profile-pause-option profile-pause-resume" onClick={onResume}>Resume</button>}
          {PAUSE_OPTIONS.map((option) => <button type="button" className="profile-pause-option" key={option} onClick={() => onSelect(option)}>{option}</button>)}
        </div>
        <button type="button" className="profile-pause-cancel" onClick={onCancel}>Cancel</button>
      </section>
    </div>,
    document.body,
  );
}
