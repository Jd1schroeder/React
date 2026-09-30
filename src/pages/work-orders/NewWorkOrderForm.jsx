import { useState } from "react";
import {
  LockKeyhole,
  Paperclip,
  Plus,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { DatePicker } from "../../components/ui/DatePicker";
import { ImageDropzone } from "../../components/ui/ImageDropzone";
import { Select } from "../../components/ui/Select";

const priorityOptions = ["None", "Low", "Medium", "High"];

function FormField({ label, required = false, children, className = "" }) {
  return (
    <label className={`new-work-order-field ${className}`.trim()}>
      <span>
        {label}
        {required && <em> (Required)</em>}
      </span>
      {children}
    </label>
  );
}

function SearchSelect({ label, required, placeholder, value, onChange, options = [], disabled = false, icon, multiple = false }) {
  return (
    <FormField label={label} required={required}>
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

function DateField({ label, required, value, onChange }) {
  return (
    <FormField label={label} required={required}>
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
          <div className="new-work-order-title-row">
            <FormField
              label="What needs to be done?"
              required
              className="new-work-order-title-field"
            >
              <input
                required
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="What needs to be done? (Required)"
              />
            </FormField>
            <button type="button" className="new-work-order-secondary" disabled>
              <LockKeyhole size={15} aria-hidden="true" />
              Use a Template
            </button>
          </div>
          <ImageDropzone onChange={setPictures} onThumbnailChange={setThumbnail} />
          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Add a description"
              rows="4"
            />
          </FormField>
          <section className="new-work-order-suborders">
            <h3>Sub-Work Orders (0)</h3>
            <p>
              Split large tasks into sub-work orders to track work separately.
            </p>
            <button type="button" className="new-work-order-secondary" disabled>
              <LockKeyhole size={15} aria-hidden="true" /> Add sub-work orders
            </button>
          </section>
          <SearchSelect
            label="Location"
            placeholder="Start typing..."
            value={form.location}
            onChange={(value) => update("location", value)}
            disabled
            icon={LockKeyhole}
          />
          <SearchSelect
            label="Asset"
            required
            placeholder="Start typing..."
            value={form.asset}
            onChange={(value) => update("asset", value)}
            disabled
            icon={LockKeyhole}
          />
          <section className="new-work-order-section">
            <h3>Procedure</h3>
            <p className="new-work-order-inline-action">
              Create or attach new Form, Procedure or Checklist
            </p>
            <button type="button" className="new-work-order-secondary">
              <Plus size={16} /> Add Procedure
            </button>
          </section>
          <SearchSelect
            label="Assign to"
            required
            placeholder="Type name"
            value={form.assignee}
            onChange={(value) => update("assignee", value)}
            options={assigneeOptions}
            multiple
          />
          <fieldset className="new-work-order-fieldset">
            <legend>Estimated Time</legend>
            <div className="new-work-order-two-column">
              <FormField label="Hours">
                <input type="number" min="0" defaultValue="0" />
              </FormField>
              <FormField label="Minutes">
                <input type="number" min="0" max="59" defaultValue="0" />
              </FormField>
            </div>
          </fieldset>
          <DateField
            label="Due Date"
            required
            value={form.dueDate}
            onChange={(value) => update("dueDate", value)}
          />
          <DateField
            label="Start Date"
            value={form.startDate}
            onChange={(value) => update("startDate", value)}
          />
          <div className="new-work-order-two-column">
            <FormField label="Recurrence">
              <Select
                className="new-work-order-recurrence"
                ariaLabel="Recurrence"
                value={form.recurrence}
                onChange={(value) => update("recurrence", value)}
                options={[
                  { value: "none", label: "Does not repeat" },
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly-date", label: "Monthly by date" },
                  { value: "monthly-weekday", label: "Monthly by weekday" },
                  { value: "yearly", label: "Yearly" },
                  { value: "periodically", label: "Periodically" },
                ]}
              />
            </FormField>
            <FormField label="Work Type">
              <Select
                ariaLabel="Work Type"
                value={form.workType}
                onChange={(value) => update("workType", value)}
                options={[
                  { value: "reactive", label: "Reactive" },
                  { value: "preventive", label: "Preventive" },
                ]}
              />
            </FormField>
          </div>
          <fieldset className="new-work-order-fieldset">
            <legend>Priority</legend>
            <div
              className="new-work-order-priority"
              role="group"
              aria-label="Priority"
            >
              {priorityOptions.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  className={form.priority === priority ? "selected" : ""}
                  onClick={() => update("priority", priority)}
                >
                  {priority}
                </button>
              ))}
            </div>
          </fieldset>
          <section className="new-work-order-section">
            <h3>Files</h3>
            <label className="new-work-order-secondary new-work-order-file-button">
              <Paperclip size={16} /> Attach files
              <input type="file" multiple />
            </label>
          </section>
          <SearchSelect
            label="Parts"
            placeholder="Start typing..."
            value={form.parts}
            onChange={(value) => update("parts", value)}
            disabled
            icon={LockKeyhole}
          />
          <SearchSelect
            label="Categories"
            required
            placeholder="Start typing..."
            value={form.categories}
            onChange={(value) => update("categories", value)}
            disabled
            icon={LockKeyhole}
          />
          <SearchSelect
            label="Vendors"
            placeholder="Start typing..."
            value={form.vendors}
            onChange={(value) => update("vendors", value)}
            disabled
            icon={LockKeyhole}
          />
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
