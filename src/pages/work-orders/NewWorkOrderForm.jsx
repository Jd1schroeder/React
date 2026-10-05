import { useState } from "react";
import {
  CirclePlus,
  List,
  LockKeyhole,
  Paperclip,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { DatePicker } from "../../components/ui/DatePicker";
import { ImageDropzone } from "../../components/ui/ImageDropzone";
import { PresetNumberInput } from "../../components/ui/PresetNumberInput";
import { Select } from "../../components/ui/Select";
import { WORK_ORDER_ATTACHMENT_MAX_BYTES } from "../../utils/workOrderAttachments";

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

function DateField({ label, value, onChange, dateFormat, timeValue = "", onTimeChange }) {
  const [showTime, setShowTime] = useState(Boolean(timeValue));

  return (
    <FormField label={label}>
      <div className="new-work-order-date-controls">
        <DatePicker ariaLabel={label} dateFormat={dateFormat} value={value} onChange={onChange} />
        {label === "Due Date" && value && !showTime && <button type="button" className="new-work-order-add-time" onClick={() => setShowTime(true)}><CirclePlus size={17} aria-hidden="true" /> Add due time</button>}
        {label === "Due Date" && value && showTime && <div className="new-work-order-time-control"><input type="time" aria-label="Due time" value={timeValue} onChange={(event) => onTimeChange(event.target.value)} /><button type="button" aria-label="Remove due time" onClick={() => { onTimeChange(""); setShowTime(false); }}><X size={17} aria-hidden="true" /></button></div>}
      </div>
    </FormField>
  );
}

export function NewWorkOrderForm({
  onCancel,
  onCreate,
  onUpdate,
  isSaving = false,
  error = "",
  assigneeOptions = [],
  canAssign = true,
  dateFormat,
  mode = "create",
  initialWorkOrder = null,
}) {
  const existingAssignments = initialWorkOrder?.work_order_assignments ?? [];
  const currentAssignmentValues = existingAssignments.length
    ? existingAssignments.map((assignment) => assignment.user_id ? `user:${assignment.user_id}` : `team:${assignment.team_id}`)
    : [
      ...(initialWorkOrder?.assigned_to ? [`user:${initialWorkOrder.assigned_to}`] : []),
      ...(initialWorkOrder?.team_id ? [`team:${initialWorkOrder.team_id}`] : []),
    ];
  const formAssigneeOptions = [...assigneeOptions];
  for (const value of currentAssignmentValues) {
    if (!formAssigneeOptions.some((option) => option.value === value)) {
      formAssigneeOptions.push({ value, label: value.startsWith('user:') ? 'Assigned user' : 'Assigned team' });
    }
  }
  const durationMinutes = initialWorkOrder?.estimated_duration_minutes ?? 0;
  const [form, setForm] = useState(() => ({
    title: initialWorkOrder?.title ?? "",
    description: initialWorkOrder?.description ?? "",
    location: "",
    asset: "",
    assignee: existingAssignments.length
      ? existingAssignments.map((assignment) => assignment.user_id ? `user:${assignment.user_id}` : `team:${assignment.team_id}`)
      : [
        ...(initialWorkOrder?.assigned_to ? [`user:${initialWorkOrder.assigned_to}`] : []),
        ...(initialWorkOrder?.team_id ? [`team:${initialWorkOrder.team_id}`] : []),
      ],
    dueDate: initialWorkOrder?.due_date ?? "",
    dueTime: initialWorkOrder?.due_time?.slice(0, 5) ?? "",
    startDate: initialWorkOrder?.start_date ?? "",
    recurrence: "none",
    workType: initialWorkOrder?.work_type ?? "reactive",
    priority: initialWorkOrder?.priority ?? "None",
    parts: "",
    categories: "",
    vendors: "",
    hours: String(Math.floor(durationMinutes / 60)),
    minutes: String(durationMinutes % 60),
  }));
  const [pictures, setPictures] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const handleFilesSelected = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const oversizedFile = selectedFiles.find((file) => file.size > WORK_ORDER_ATTACHMENT_MAX_BYTES);
    if (oversizedFile) setFileError(`${oversizedFile.name} exceeds the 10 MB per-file limit.`);
    else {
      setFileError("");
      setFiles((current) => {
        const combined = [...current];
        for (const file of selectedFiles) {
          if (!combined.some((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified)) combined.push(file);
        }
        return combined;
      });
    }
    event.target.value = "";
  };
  const submit = (event) => {
    event.preventDefault();
    if (fileError) return;
    const durationMinutes = (Number(form.hours) || 0) * 60 + (Number(form.minutes) || 0);
    const values = {
      title: form.title,
      description: form.description,
      priority: form.priority === "None" ? null : form.priority,
      assignments: form.assignee.map((value) => {
        const [kind, id] = value.split(":", 2);
        return kind === "team" ? { teamId: id } : { userId: id };
      }),
      dueDate: form.dueDate || null,
      dueTime: form.dueDate && form.dueTime ? form.dueTime : null,
      startDate: form.startDate || null,
      estimatedDurationMinutes: durationMinutes || null,
      workType: form.workType,
      pictures,
      thumbnail,
      files,
    };
    if (mode === "edit") onUpdate?.(values);
    else onCreate?.(values);
  };

  return (
    <section
      className="new-work-order-pane"
      aria-labelledby="new-work-order-title"
    >
      <header className="new-work-order-header">
        <div className="new-work-order-header-content">
          <h2 id="new-work-order-title">{mode === "edit" ? "Edit Work Order" : "New Work Order"}</h2>
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
          {mode === "edit" && initialWorkOrder?.work_order_attachments?.length > 0 && (
            <FormRow>
              <section className="new-work-order-current-attachments" aria-label="Current attachments">
                <h3>Current attachments</h3>
                <ul>
                  {initialWorkOrder.work_order_attachments.map((attachment) => (
                    <li key={attachment.id}>
                      {attachment.kind === "image" || attachment.content_type?.startsWith("image/")
                        ? attachment.signed_url
                          ? <img src={attachment.signed_url} alt={attachment.file_name} loading="lazy" />
                          : <span className="new-work-order-current-attachment-unavailable">Image preview unavailable</span>
                        : <Paperclip size={16} aria-hidden="true" />}
                      <span>{attachment.file_name}</span>
                    </li>
                  ))}
                </ul>
                <p>Existing attachments are kept when you save.</p>
              </section>
            </FormRow>
          )}
          <FormRow><ImageDropzone onChange={setPictures} onThumbnailChange={setThumbnail} allowThumbnailSelection={mode !== "edit"} /></FormRow>
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
          <FormRow><SearchSelect label="Assign to" placeholder={canAssign ? "Type name" : "Assignment unavailable"} value={form.assignee} onChange={(value) => update("assignee", value)} options={formAssigneeOptions} multiple disabled={!canAssign} /></FormRow>
          <FormRow>
            <fieldset className="new-work-order-fieldset">
              <legend>Estimated Time</legend>
              <div className="new-work-order-two-column">
                <FormField label="Hours">
                  <PresetNumberInput ariaLabel="Hours" value={form.hours} onChange={(value) => update("hours", value)} options={[1, 2, 3, 4, 5, 6, 8, 10, 12, 24]} />
                </FormField>
                <FormField label="Minutes">
                  <PresetNumberInput ariaLabel="Minutes" value={form.minutes} onChange={(value) => update("minutes", value)} maxValue={59} options={[0, 5, 10, 15, 20, 30, 45]} />
                </FormField>
              </div>
            </fieldset>
          </FormRow>
          <FormRow><DateField key={form.dueDate ? "due-date-selected" : "due-date-empty"} label="Due Date" dateFormat={dateFormat} value={form.dueDate} onChange={(value) => { update("dueDate", value); if (!value) update("dueTime", ""); }} timeValue={form.dueTime} onTimeChange={(value) => update("dueTime", value)} /></FormRow>
          <FormRow><DateField label="Start Date" dateFormat={dateFormat} value={form.startDate} onChange={(value) => update("startDate", value)} /></FormRow>
          <FormRow className="new-work-order-recurrence-row">
            <div className="new-work-order-two-column new-work-order-recurrence-fields">
              <FormField label="Recurrence">
                <Select className="new-work-order-recurrence" ariaLabel="Recurrence" disabled icon={LockKeyhole} value={form.recurrence} onChange={(value) => update("recurrence", value)} options={[
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
            <label className="new-work-order-secondary new-work-order-file-button"><Paperclip size={16} /> Attach files<input type="file" multiple onChange={handleFilesSelected} /></label>
            {files.length > 0 && <ul className="new-work-order-attachment-list">{files.map((file) => <li key={`${file.name}-${file.size}-${file.lastModified}`}>{file.name}<button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((candidate) => candidate !== file))}><X size={14} aria-hidden="true" /></button></li>)}</ul>}
            {fileError && <p className="new-work-order-error" role="alert">{fileError}</p>}
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
            {isSaving ? (mode === "edit" ? "Saving..." : "Creating...") : (mode === "edit" ? "Save changes" : "Create")}
          </Button>
        </footer>
      </form>
    </section>
  );
}
