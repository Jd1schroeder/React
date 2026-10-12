import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import "./WorkOrderStartingIdModal.css";

export function WorkOrderStartingIdModal({ workOrderLabel = "Work Order", initialValue = 1, minimumValue = initialValue, error = "", isSaving = false, onClose, onSave }) {
  const [value, setValue] = useState(String(initialValue));
  const numericValue = Number(value);
  const isValid = /^\d+$/.test(value.trim()) && Number.isSafeInteger(numericValue) && numericValue > 0;
  const isAtLeastMinimum = isValid && numericValue >= Number(minimumValue);
  const hasChanges = isAtLeastMinimum && numericValue !== Number(initialValue);
  const validationError = isValid && !isAtLeastMinimum ? `Starting ID must be ${minimumValue} or greater.` : "";
  const displayedError = validationError || error;

  const submit = (event) => {
    event.preventDefault();
    if (isValid && hasChanges && !isSaving) onSave(numericValue);
  };

  return (
    <div className="work-order-starting-id-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
      <section className="work-order-starting-id-modal" role="dialog" aria-modal="true" aria-labelledby="work-order-starting-id-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="work-order-starting-id-modal-header">
          <h2 id="work-order-starting-id-title">{workOrderLabel} Starting ID</h2>
          <button type="button" className="work-order-starting-id-modal-close" onClick={onClose} disabled={isSaving} aria-label="Close"><X size={20} aria-hidden="true" /></button>
        </header>
        <form onSubmit={submit}>
          <div className="work-order-starting-id-modal-content">
            <p>Your selected ID will take effect on the next created {workOrderLabel}.</p>
            <label className="work-order-starting-id-field">
              <span>Starting ID</span>
              <input value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" autoFocus aria-describedby={displayedError ? "work-order-starting-id-error" : undefined} />
            </label>
            {displayedError && <p className="work-order-starting-id-error" id="work-order-starting-id-error" role="alert">{displayedError}</p>}
          </div>
          <footer className="work-order-starting-id-modal-footer">
            <button type="button" className="work-order-starting-id-cancel" onClick={onClose} disabled={isSaving}>Cancel</button>
            <Button className="work-order-starting-id-save" type="submit" disabled={!hasChanges || isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </footer>
        </form>
      </section>
    </div>
  );
}
