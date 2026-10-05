import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { createPortal } from "react-dom";
import { UnsavedChangesContext } from "./UnsavedChangesContext";
import "./UnsavedChanges.css";

export function UnsavedChangesProvider({ children }) {
  const [hasUnsavedChanges, setHasUnsavedChangesState] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const pendingNavigationRef = useRef(null);
  const blocker = useBlocker(hasUnsavedChanges ? ({ currentLocation, nextLocation }) => (
    hasUnsavedChangesRef.current && (
      currentLocation.pathname !== nextLocation.pathname
      || currentLocation.search !== nextLocation.search
      || currentLocation.hash !== nextLocation.hash
    )
  ) : false);
  const isPromptVisible = isPromptOpen || blocker.state === "blocked";

  const setHasUnsavedChanges = useCallback((value) => {
    hasUnsavedChangesRef.current = Boolean(value);
    setHasUnsavedChangesState(Boolean(value));
  }, []);

  const guardNavigation = useCallback((navigate) => {
    if (!hasUnsavedChangesRef.current) {
      navigate();
      return;
    }
    pendingNavigationRef.current = navigate;
    setIsPromptOpen(true);
  }, []);

  const cancelNavigation = useCallback(() => {
    pendingNavigationRef.current = null;
    setIsPromptOpen(false);
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);

  const discardChangesAndContinue = useCallback(() => {
    const pendingNavigation = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    hasUnsavedChangesRef.current = false;
    setHasUnsavedChangesState(false);
    setIsPromptOpen(false);
    if (pendingNavigation) pendingNavigation();
    else if (blocker.state === "blocked") blocker.proceed();
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!isPromptVisible) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") cancelNavigation();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelNavigation, isPromptVisible]);

  const value = { guardNavigation, setHasUnsavedChanges };

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      {isPromptVisible && createPortal(
        <div
          className="unsaved-changes-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelNavigation();
          }}
        >
          <section
            className="unsaved-changes-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
            aria-describedby="unsaved-changes-description"
          >
            <h2 id="unsaved-changes-title">Discard unsaved changes?</h2>
            <p id="unsaved-changes-description">If you leave now, you’ll lose unsaved changes to this Work Order.</p>
            <div className="unsaved-changes-actions">
              <button type="button" className="unsaved-changes-cancel" onClick={cancelNavigation} autoFocus>Cancel</button>
              <button type="button" className="unsaved-changes-discard" onClick={discardChangesAndContinue}>Discard Changes</button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </UnsavedChangesContext.Provider>
  );
}
