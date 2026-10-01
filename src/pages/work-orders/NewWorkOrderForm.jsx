import { useState } from "react";
import {
  List,
  LockKeyhole,
  Paperclip,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { DatePicker } from "../../components/ui/DatePicker";
import { ImageDropzone } from "../../components/ui/ImageDropzone";
import { PresetNumberInput } from "../../components/ui/PresetNumberInput";
import { Select } from "../../components/ui/Select";

const priorityOptions = ["None", "Low", "Medium", "High"];

function FormField({ label, children, className = "" }) {
  return (
    <label className={`new-work-order-field ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function FormRow({ children, className = "" }) {
  return (
    <div className={`new-work-order-row ${className}`.trim()}>
      <div className="new-work-order-row-content">{children}</div>
    </div>
  );
}

function SearchSelect({ label, placeholder, value, onChange, options = [], disabled = false, icon, multiple = false }) {
  return (
    <FormField label={label}>
      <Select
        className="new-work-order-selector"
        ariaLabel={label}
        disabled={disabled}
        icon={icon}
        multiple={multiple}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        options={options}
      />
    </FormField>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <FormField label={label}>
      <DatePicker ariaLabel={label} value={value} onChange={onChange} />
    </FormField>
  );
}

export function NewWorkOrderForm({
  onCancel,
  onCreate,
  isSaving = false,
  error = "",
  assigneeOptions = [],
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    asset: "",
    assignee: [],
    dueDate: "",
    startDate: "",
    recurrence: "none",
    workType: "reactive",
    priority: "None",
    parts: "",
    categories: "",
    vendors: "",
  });
  const [, setPictures] = useState([]);
  const [, setThumbnail] = useState(null);
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    onCreate({
      title: form.title,
      description: form.description,
      priority: form.priority === "None" ? "Medium" : form.priority,
      assignedTo: form.assignee[0] || null,
      dueAt: form.dueDate
        ? new Date(`${form.dueDate}T23:59:59`).toISOString()
        : null,
    });
  };

  return (
    <section
      className="new-work-order-pane"
      aria-labelledby="new-work-order-title"
    >
      <header className="new-work-order-header">
        <div className="new-work-order-header-content">
          <h2 id="new-work-order-title">New Work Order</h2>
        </div>
      </header>
      <form className="new-work-order-form" onSubmit={submit}>
        <div className="new-work-order-scroll">
          <FormRow className="new-work-order-title-row">
            <FormField label="What needs to be done?" className="new-work-order-title-field">
              <input required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="What needs to be done? (Required)" />
            </FormField>
            <button type="button" className="new-work-order-secondary" disabled>
              <LockKeyhole size={15} aria-hidden="true" /> Use a Template
            </button>
          </FormRow>
          <FormRow><ImageDropzone onChange={setPictures} onThumbnailChange={setThumbnail} /></FormRow>
          <FormRow>
            <FormField label="Description">
              <textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Add a description" rows="4" />
            </FormField>
          </FormRow>
          <section className="new-work-order-suborders">
            <h3>Sub-Work Orders (0)</h3>
            <p>
              Split large tasks into sub-work orders to track work separately.
            </p>
            <button type="button" className="new-work-order-secondary" disabled>
              <LockKeyhole size={15} aria-hidden="true" /> Add sub-work orders
            </button>
          </section>
          <FormRow><SearchSelect label="Location" placeholder="Start typing..." value={form.location} onChange={(value) => update("location", value)} disabled icon={LockKeyhole} /></FormRow>
          <FormRow><SearchSelect label="Asset" placeholder="Start typing..." value={form.asset} onChange={(value) => update("asset", value)} disabled icon={LockKeyhole} /></FormRow>
          <FormRow>
            <section className="new-work-order-section new-work-order-procedure">
              <h3>Procedure</h3>
              <div className="new-work-order-procedure-inner">
                <List size={18} aria-hidden="true" />
                <p className="new-work-order-inline-action">Create or attach new Form, Procedure or Checklist</p>
              </div>
              <button type="button" className="new-work-order-secondary" disabled><LockKeyhole size={15} aria-hidden="true" /> Add Procedure</button>
            </section>
          </FormRow>
          <FormRow><SearchSelect label="Assign to" placeholder="Type name" value={form.assignee} onChange={(value) => update("assignee", value)} options={assigneeOptions} multiple /></FormRow>
          <FormRow>
            <fieldset className="new-work-order-fieldset">
              <legend>Estimated Time</legend>
              <div className="new-work-order-two-column">
                <FormField label="Hours">
                  <PresetNumberInput ariaLabel="Hours" defaultValue="0" options={[1, 2, 3, 4, 5, 6, 8, 10, 12, 24]} />
                </FormField>
                <FormField label="Minutes">
                  <PresetNumberInput ariaLabel="Minutes" defaultValue="0" maxValue={59} options={[0, 5, 10, 15, 20, 30, 45]} />
                </FormField>
              </div>
            </fieldset>
          </FormRow>
          <FormRow><DateField label="Due Date" value={form.dueDate} onChange={(value) => update("dueDate", value)} /></FormRow>
          <FormRow><DateField label="Start Date" value={form.startDate} onChange={(value) => update("startDate", value)} /></FormRow>
          <FormRow className="new-work-order-recurrence-row">
            <div className="new-work-order-two-column new-work-order-recurrence-fields">
              <FormField label="Recurrence">
                <Select className="new-work-order-recurrence" ariaLabel="Recurrence" value={form.recurrence} onChange={(value) => update("recurrence", value)} options={[
                  { value: "none", label: "Does not repeat" },
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly-date", label: "Monthly by date" },
                  { value: "monthly-weekday", label: "Monthly by weekday" },
                  { value: "yearly", label: "Yearly" },
                  { value: "periodically", label: "Periodically" },
                ]} />
              </FormField>
              <FormField label="Work Type">
                <Select ariaLabel="Work Type" value={form.workType} onChange={(value) => update("workType", value)} options={[
                  { value: "reactive", label: "Reactive" },
                  { value: "preventive", label: "Preventive" },
                ]} />
              </FormField>
            </div>
          </FormRow>
          <FormRow>
            <fieldset className="new-work-order-fieldset">
              <legend>Priority</legend>
              <div className="new-work-order-priority" role="group" aria-label="Priority">
                {priorityOptions.map((priority) => <button key={priority} type="button" className={form.priority === priority ? "selected" : ""} onClick={() => update("priority", priority)}>{priority}</button>)}
              </div>
            </fieldset>
          </FormRow>
          <FormRow>
            <section className="new-work-order-section">
              <h3>Files</h3>
              <label className="new-work-order-secondary new-work-order-file-button"><Paperclip size={16} /> Attach files<input type="file" multiple /></label>
            </section>
          </FormRow>
          <FormRow><SearchSelect label="Parts" placeholder="Start typing..." value={form.parts} onChange={(value) => update("parts", value)} disabled icon={LockKeyhole} /></FormRow>
          <FormRow><SearchSelect label="Categories" placeholder="Start typing..." value={form.categories} onChange={(value) => update("categories", value)} disabled icon={LockKeyhole} /></FormRow>
          <FormRow><SearchSelect label="Vendors" placeholder="Start typing..." value={form.vendors} onChange={(value) => update("vendors", value)} disabled icon={LockKeyhole} /></FormRow>
          {error && (
            <p className="new-work-order-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="new-work-order-footer">
          <button type="button" className="new-work-order-cancel" onClick={onCancel}>Cancel</button>
          <Button type="submit" className="new-work-order-create" disabled={isSaving || !form.title.trim()}>
            {isSaving ? "Creating..." : "Create"}
          </Button>
        </footer>
      </form>
    </section>
  );
}
