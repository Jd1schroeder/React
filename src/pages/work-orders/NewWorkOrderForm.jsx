import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CirclePlus,
  Info,
  List,
  LockKeyhole,
  Paperclip,
  X,
} from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { DatePicker } from "../../components/ui/DatePicker";
import { ImageDropzone } from "../../components/ui/ImageDropzone";
import { PresetNumberInput } from "../../components/ui/PresetNumberInput";
import { Select } from "../../components/ui/Select";
import { WORK_ORDER_ATTACHMENT_MAX_BYTES } from "../../utils/workOrderAttachments";
import { getWorkOrderScheduleRequirementError } from "../../utils/workOrderSettings";

const priorityOptions = ["None", "Low", "Medium", "High"];
const weekdayOptions = [
  { value: "0", label: "Sun" },
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
];
const ordinalOptions = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "last", label: "Last" },
];
const recurrenceIntervalOptions = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }));
function ordinalLabel(value) {
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][value % 10] ?? "th";
  return `${value}${suffix}`;
}
const monthDayOptions = Array.from({ length: 31 }, (_, index) => ({
  value: String(index + 1),
  label: `${ordinalLabel(index + 1)}${index >= 28 ? " (Or Last)" : ""}`,
}));
function getRecurrenceDefaults() {
  const today = new Date();
  const day = String(today.getDate());
  const weekday = String(today.getDay());
  const ordinal = Math.min(4, Math.floor((today.getDate() - 1) / 7) + 1);
  return {
    recurrenceInterval: "1",
    recurrenceWeekdays: [weekday],
    recurrenceMonthDay: day,
    recurrenceMonthWeek: String(ordinal),
    recurrenceMonthWeekday: weekday,
    recurrencePeriod: "30",
    recurrencePeriodUnit: "minutes",
  };
}

function buildRecurrenceRule(form) {
  if (form.recurrence === "none") return null;
  const rule = {
    frequency: form.recurrence,
    interval: Number(form.recurrenceInterval) || 1,
  };
  if (form.recurrence === "weekly") rule.weekdays = form.recurrenceWeekdays;
  if (form.recurrence === "monthly-date") rule.monthDay = Number(form.recurrenceMonthDay) || 1;
  if (form.recurrence === "monthly-weekday") {
    rule.monthWeek = form.recurrenceMonthWeek;
    rule.monthWeekday = Number(form.recurrenceMonthWeekday);
  }
  if (form.recurrence === "periodically") {
    rule.period = Number(form.recurrencePeriod) || 1;
    rule.periodUnit = form.recurrencePeriodUnit;
  }
  return rule;
}

function RecurrenceOptions({ form, update, showNotice, onDismissNotice }) {
  if (form.recurrence === "none") return null;
  const toggleWeekday = (value) => update("recurrenceWeekdays", form.recurrenceWeekdays.includes(value)
    ? form.recurrenceWeekdays.filter((day) => day !== value)
    : [...form.recurrenceWeekdays, value]);
  const recurrenceText = form.recurrence === "daily"
    ? "Repeats every day after completion of this Work Order."
    : form.recurrence === "weekly"
      ? `Repeats every ${form.recurrenceInterval} week${form.recurrenceInterval === "1" ? "" : "s"} on ${form.recurrenceWeekdays.map((day) => weekdayOptions.find((option) => option.value === day)?.label).join(", ") || "the selected day"} after completion of this Work Order.`
      : form.recurrence === "monthly-date"
        ? `Repeats every ${form.recurrenceInterval} month${form.recurrenceInterval === "1" ? "" : "s"} on the ${monthDayOptions.find((option) => option.value === form.recurrenceMonthDay)?.label ?? form.recurrenceMonthDay} day of the month after completion of this Work Order.`
        : form.recurrence === "monthly-weekday"
          ? `Repeats every ${form.recurrenceInterval} month${form.recurrenceInterval === "1" ? "" : "s"} on the ${ordinalOptions.find((option) => option.value === form.recurrenceMonthWeek)?.label ?? "selected"} ${weekdayOptions.find((option) => option.value === form.recurrenceMonthWeekday)?.label ?? "day"} of the month after completion of this Work Order.`
          : form.recurrence === "yearly"
            ? `Repeats every ${form.recurrenceInterval} year${form.recurrenceInterval === "1" ? "" : "s"} using the Start Date as the annual anchor and preserving the original due-date interval.`
            : `Repeats every ${form.recurrencePeriod} ${form.recurrencePeriodUnit} after completion of this Work Order.`;

  return <>
    <FormRow className="new-work-order-recurrence-options-row">
      {form.recurrence === "daily" && <div className="new-work-order-recurrence-days" role="group" aria-label="Recurrence days">
        {weekdayOptions.map((option) => <button key={option.value} type="button" className="selected" aria-pressed="true" onClick={() => toggleWeekday(option.value)}>{option.label}</button>)}
      </div>}
      {form.recurrence === "weekly" && <div className="new-work-order-recurrence-schedule">
        <FormField label="Every"><Select ariaLabel="Recurrence interval" value={form.recurrenceInterval} onChange={(value) => update("recurrenceInterval", value)} options={recurrenceIntervalOptions} /></FormField>
        <span className="new-work-order-recurrence-inline-label">week on</span>
        <div className="new-work-order-recurrence-days" role="group" aria-label="Recurrence days">
          {weekdayOptions.map((option) => <button key={option.value} type="button" className={form.recurrenceWeekdays.includes(option.value) ? "selected" : ""} aria-pressed={form.recurrenceWeekdays.includes(option.value)} onClick={() => toggleWeekday(option.value)}>{option.label}</button>)}
        </div>
      </div>}
      {form.recurrence === "monthly-date" && <div className="new-work-order-recurrence-schedule">
        <span className="new-work-order-recurrence-inline-label">Every</span>
        <Select ariaLabel="Recurrence interval" value={form.recurrenceInterval} onChange={(value) => update("recurrenceInterval", value)} options={recurrenceIntervalOptions} />
        <span className="new-work-order-recurrence-inline-label">month on the</span>
        <Select className="new-work-order-recurrence-month-day-select" ariaLabel="Day of month" value={form.recurrenceMonthDay} onChange={(value) => update("recurrenceMonthDay", value)} options={monthDayOptions} />
      </div>}
      {form.recurrence === "monthly-weekday" && <div className="new-work-order-recurrence-schedule">
        <span className="new-work-order-recurrence-inline-label">Every</span>
        <Select ariaLabel="Recurrence interval" value={form.recurrenceInterval} onChange={(value) => update("recurrenceInterval", value)} options={recurrenceIntervalOptions} />
        <span className="new-work-order-recurrence-inline-label">month on the</span>
        <Select ariaLabel="Week of month" value={form.recurrenceMonthWeek} onChange={(value) => update("recurrenceMonthWeek", value)} options={ordinalOptions} />
        <Select ariaLabel="Weekday" value={form.recurrenceMonthWeekday} onChange={(value) => update("recurrenceMonthWeekday", value)} options={weekdayOptions} />
      </div>}
      {form.recurrence === "yearly" && <div className="new-work-order-recurrence-schedule">
        <span className="new-work-order-recurrence-inline-label">Every</span>
        <Select ariaLabel="Recurrence interval" value={form.recurrenceInterval} onChange={(value) => update("recurrenceInterval", value)} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "5", label: "5" }]} />
        <span className="new-work-order-recurrence-inline-label">year from the Start Date</span>
      </div>}
      {form.recurrence === "periodically" && <div className="new-work-order-periodic-control">
        <input type="number" min="1" aria-label="Periodic interval" value={form.recurrencePeriod} onChange={(event) => update("recurrencePeriod", event.target.value)} />
        <Select ariaLabel="Periodic unit" value={form.recurrencePeriodUnit} onChange={(value) => update("recurrencePeriodUnit", value)} options={[{ value: "minutes", label: "minutes" }, { value: "hours", label: "hours" }]} />
      </div>}
      <p className="new-work-order-recurrence-summary">{recurrenceText}</p>
    </FormRow>
    {showNotice && <FormRow className="new-work-order-recurrence-notice-row"><aside className="new-work-order-recurrence-notice">
      <Info size={18} aria-hidden="true" />
      <div><strong>Planning recurring maintenance?</strong><p>Maintenance Plans let you schedule maintenance ahead of time, combine multiple maintenance intervals in one plan, and avoid overlapping recurring Work Orders.</p><button type="button" className="new-work-order-recurrence-plan-button" disabled><LockKeyhole size={15} aria-hidden="true" /> Create Maintenance Plan</button></div>
      <button type="button" className="new-work-order-recurrence-notice-close" aria-label="Dismiss recurring maintenance notice" onClick={onDismissNotice}><X size={17} aria-hidden="true" /></button>
    </aside></FormRow>}
  </>;
}

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

function AssignmentSearchSelect({ label, placeholder, value = [], onChange, options = [], onInviteTeammates }) {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedValues = Array.isArray(value) ? value : [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedSearch) return true;
    return `${option.label ?? ""} ${option.email ?? ""} ${option.phone ?? ""} ${option.searchText ?? ""}`.toLowerCase().includes(normalizedSearch);
  });
  const teams = filteredOptions.filter((option) => option.value?.startsWith("team:"));
  const users = filteredOptions.filter((option) => option.value?.startsWith("user:"));
  const selectedOptions = selectedValues.map((selectedValue) => options.find((option) => option.value === selectedValue)).filter(Boolean);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  const toggleOption = (option) => {
    const nextValue = selectedValues.includes(option.value)
      ? selectedValues.filter((selectedValue) => selectedValue !== option.value)
      : [...selectedValues, option.value];
    onChange(nextValue, option);
  };

  const renderOption = (option) => {
    const isSelected = selectedValues.includes(option.value);
    const isTeam = option.value?.startsWith("team:");
    return <button
      key={option.value}
      type="button"
      className={`new-work-order-assignment-option${isSelected ? " is-selected" : ""}`}
      role="option"
      aria-selected={isSelected}
      onClick={() => toggleOption(option)}
    >
      {isTeam
        ? <span className="new-work-order-assignment-team-avatar" aria-hidden="true">{(option.label ?? "T").slice(0, 2).toUpperCase()}</span>
        : <Avatar className="new-work-order-assignment-user-avatar" src={option.avatar?.src} firstName={option.avatar?.firstName} lastName={option.avatar?.lastName} name={option.avatar?.name ?? option.label} aria-hidden="true" />}
      <span className="new-work-order-assignment-option-label">{option.label}</span>
      <span className="new-work-order-assignment-checkbox" aria-hidden="true">{isSelected && <Check size={13} strokeWidth={2.5} />}</span>
    </button>;
  };

  return <FormField label={label}>
    <div ref={rootRef} className={`new-work-order-assignment-select${isOpen ? " is-open" : ""}`}>
      <div className="new-work-order-assignment-control" onClick={() => setIsOpen(true)}>
        <div className="new-work-order-assignment-value">
          {selectedOptions.map((option) => <span className="new-work-order-assignment-chip" key={option.value}>
            {option.value?.startsWith("team:")
              ? <span className="new-work-order-assignment-chip-avatar new-work-order-assignment-team-avatar" aria-hidden="true">{(option.label ?? "T").slice(0, 2).toUpperCase()}</span>
              : <Avatar className="new-work-order-assignment-chip-avatar new-work-order-assignment-user-avatar" src={option.avatar?.src} firstName={option.avatar?.firstName} lastName={option.avatar?.lastName} name={option.avatar?.name ?? option.label} aria-hidden="true" />}
            <span className="new-work-order-assignment-chip-label">{option.label}</span>
            <button type="button" className="new-work-order-assignment-chip-remove" aria-label={`Remove ${option.label}`} onClick={(event) => { event.stopPropagation(); toggleOption(option); }}><X size={14} aria-hidden="true" /></button>
          </span>)}
          <input
            type="search"
            aria-label="Search assignees"
            aria-expanded={isOpen}
            aria-controls="new-work-order-assignment-menu"
            placeholder={selectedOptions.length ? "" : placeholder}
            value={search}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => { setSearch(event.target.value); setIsOpen(true); }}
            onKeyDown={(event) => { if (event.key === "Escape") { setSearch(""); setIsOpen(false); } }}
          />
        </div>
        {selectedOptions.length > 0 && <button type="button" className="new-work-order-assignment-clear" aria-label="Clear assignees" onClick={(event) => { event.stopPropagation(); onChange([]); setSearch(""); }}><X size={18} aria-hidden="true" /></button>}
        <ChevronDown className="new-work-order-assignment-chevron" size={18} aria-hidden="true" />
      </div>
      {isOpen && <div id="new-work-order-assignment-menu" className="new-work-order-assignment-menu" role="listbox" aria-label="Assign to" aria-multiselectable="true">
        <button type="button" className="new-work-order-assignment-invite" onClick={() => onInviteTeammates?.()}><CirclePlus size={17} aria-hidden="true" /> Invite Teammates</button>
        {teams.length > 0 && <section className="new-work-order-assignment-group" aria-labelledby="new-work-order-assignment-teams"><h4 id="new-work-order-assignment-teams">Teams</h4>{teams.map(renderOption)}</section>}
        {users.length > 0 && <section className="new-work-order-assignment-group" aria-labelledby="new-work-order-assignment-users"><h4 id="new-work-order-assignment-users">Users</h4>{users.map(renderOption)}</section>}
        {!teams.length && !users.length && <p className="new-work-order-assignment-empty">No matching teams or users.</p>}
      </div>}
    </div>
  </FormField>;
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

function CustomFieldsSection({ fields = [], values, onChange }) {
  if (!fields.length) return null;
  return fields.map((field) => {
    const value = values[field.id] ?? "";
    const label = `${field.name || "Custom field"}${field.required ? " *" : ""}`;
    const update = (nextValue) => onChange(field.id, nextValue);
    let input;
    if (field.type === "long_text") input = <textarea value={value} onChange={(event) => update(event.target.value)} rows="3" />;
    else if (field.type === "number") input = <input type="number" value={value} onChange={(event) => update(event.target.value)} />;
    else if (field.type === "date") input = <input type="date" value={value} onChange={(event) => update(event.target.value)} />;
    else if (field.type === "datetime") input = <input type="datetime-local" value={value} onChange={(event) => update(event.target.value)} />;
    else if (field.type === "single_select") input = <Select className="new-work-order-selector" ariaLabel={label} placeholder="Select an option" value={value} onChange={update} options={(field.options ?? []).map((option) => ({ value: option, label: option }))} />;
    else input = <input type="text" inputMode={field.type === "link" ? "url" : undefined} value={value} onChange={(event) => update(event.target.value)} />;
    return <FormRow key={field.id}><FormField label={label}>{input}</FormField></FormRow>;
  });
}

export function NewWorkOrderForm({
  onCancel,
  onCreate,
  onUpdate,
  onDirtyChange,
  isSaving = false,
  error = "",
  assigneeOptions = [],
  canAssign = true,
  dateFormat,
  requiredSchedule = "none",
  customFields = [],
  mode = "create",
  initialWorkOrder = null,
  workOrderLabel = "Work Order",
  onInviteTeammates,
}) {
  const existingAssignments = initialWorkOrder?.work_order_assignments ?? [];
  const existingAttachments = initialWorkOrder?.work_order_attachments ?? [];
  const existingImages = mode === "edit"
    ? existingAttachments.filter((attachment) => attachment.kind === "image" || attachment.content_type?.startsWith("image/"))
    : [];
  const existingFiles = mode === "edit"
    ? existingAttachments.filter((attachment) => !existingImages.includes(attachment))
    : [];
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
  const recurrenceDefaults = getRecurrenceDefaults();
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
    recurrence: initialWorkOrder?.recurrence_rule?.frequency ?? initialWorkOrder?.recurrence ?? "none",
    ...recurrenceDefaults,
    ...(initialWorkOrder?.recurrence_rule ? {
      recurrenceInterval: String(initialWorkOrder.recurrence_rule.interval ?? recurrenceDefaults.recurrenceInterval),
      recurrenceWeekdays: initialWorkOrder.recurrence_rule.weekdays ?? recurrenceDefaults.recurrenceWeekdays,
      recurrenceMonthDay: String(initialWorkOrder.recurrence_rule.monthDay ?? recurrenceDefaults.recurrenceMonthDay),
      recurrenceMonthWeek: initialWorkOrder.recurrence_rule.monthWeek ?? recurrenceDefaults.recurrenceMonthWeek,
      recurrenceMonthWeekday: String(initialWorkOrder.recurrence_rule.monthWeekday ?? recurrenceDefaults.recurrenceMonthWeekday),
      recurrencePeriod: String(initialWorkOrder.recurrence_rule.period ?? recurrenceDefaults.recurrencePeriod),
      recurrencePeriodUnit: initialWorkOrder.recurrence_rule.periodUnit ?? recurrenceDefaults.recurrencePeriodUnit,
    } : {}),
    workType: initialWorkOrder?.work_type ?? "reactive",
    priority: initialWorkOrder?.priority ?? "None",
    parts: "",
    categories: "",
    vendors: "",
    customFieldValues: initialWorkOrder?.custom_field_values ?? {},
    hours: String(Math.floor(durationMinutes / 60)),
    minutes: String(durationMinutes % 60),
  }));
  const [pictures, setPictures] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [retainedImageIds, setRetainedImageIds] = useState(() => existingImages.map((attachment) => attachment.id));
  const [existingThumbnailAttachmentId, setExistingThumbnailAttachmentId] = useState(() =>
    existingImages.find((attachment) => attachment.is_thumbnail)?.id ?? existingImages[0]?.id ?? null,
  );
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [customFieldError, setCustomFieldError] = useState("");
  const [showRecurrenceNotice, setShowRecurrenceNotice] = useState(true);
  const getFileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;
  const [initialSnapshot] = useState(() => JSON.stringify({
      form,
      pictures: [],
      thumbnail: null,
      retainedImageIds,
      existingThumbnailAttachmentId,
      files: [],
  }));
  const currentSnapshot = JSON.stringify({
    form,
    pictures: pictures.map(getFileKey),
    thumbnail: thumbnail ? getFileKey(thumbnail) : null,
    retainedImageIds,
    existingThumbnailAttachmentId,
    files: files.map(getFileKey),
  });
  const isDirty = mode === "edit" && currentSnapshot !== initialSnapshot;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

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
    const nextScheduleError = getWorkOrderScheduleRequirementError(requiredSchedule, {
      dueDate: form.dueDate,
      startDate: form.startDate,
    });
    setScheduleError(nextScheduleError);
    if (nextScheduleError) return;
    const missingField = customFields.find((field) => field.required && !String(form.customFieldValues[field.id] ?? "").trim());
    const nextCustomFieldError = missingField ? `${missingField.name || "A custom field"} is required.` : "";
    setCustomFieldError(nextCustomFieldError);
    if (nextCustomFieldError) return;
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
      recurrenceRule: buildRecurrenceRule(form),
      estimatedDurationMinutes: durationMinutes || null,
      workType: form.workType,
      customFieldValues: form.customFieldValues,
      pictures,
      thumbnail,
      retainedAttachmentIds: mode === "edit"
        ? [...existingFiles.map((attachment) => attachment.id), ...retainedImageIds]
        : [],
      thumbnailAttachmentId: thumbnail ? null : existingThumbnailAttachmentId,
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
          <button type="button" className="new-work-order-mobile-back" aria-label="Back" onClick={onCancel}><ArrowLeft size={25} aria-hidden="true" /><span className="new-work-order-mobile-back-label">Back</span></button>
          <h2 id="new-work-order-title">{mode === "edit" ? `Edit ${workOrderLabel}` : `New ${workOrderLabel}`}</h2>
          <Button
            type="submit"
            form={`new-work-order-form-${mode}`}
            className="new-work-order-mobile-submit"
            aria-label={mode === "edit" ? `Save ${workOrderLabel}` : `Create ${workOrderLabel}`}
            disabled={isSaving || !form.title.trim()}
          >
            {isSaving ? (mode === "edit" ? "Saving..." : "Creating...") : (mode === "edit" ? "Save" : "Create")}
          </Button>
        </div>
      </header>
      <form id={`new-work-order-form-${mode}`} className="new-work-order-form" onSubmit={submit}>
        <div className="new-work-order-scroll">
          <FormRow className="new-work-order-title-row">
            <FormField label="What needs to be done?" className="new-work-order-title-field">
              <input required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="What needs to be done? (Required)" />
            </FormField>
            <button type="button" className="new-work-order-secondary new-work-order-template-button" disabled>
              <LockKeyhole size={15} aria-hidden="true" /> Use a Template
            </button>
          </FormRow>
          {existingFiles.length > 0 && (
            <FormRow>
              <section className="new-work-order-current-attachments" aria-label="Current attachments">
                <h3>Current files</h3>
                <ul>
                  {existingFiles.map((attachment) => (
                    <li key={attachment.id}>
                      <Paperclip size={16} aria-hidden="true" />
                      <span>{attachment.file_name}</span>
                    </li>
                  ))}
                </ul>
                <p>Current files are kept when you save.</p>
              </section>
            </FormRow>
          )}
          <FormRow><ImageDropzone
            sourcePicker={mode === "create"}
            initialAttachments={existingImages}
            onChange={setPictures}
            onThumbnailChange={setThumbnail}
            onExistingAttachmentsChange={setRetainedImageIds}
            onExistingThumbnailChange={setExistingThumbnailAttachmentId}
          /></FormRow>
          <FormRow>
            <FormField label="Description">
              <textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Add a description" rows="4" />
            </FormField>
          </FormRow>
          <section className="new-work-order-suborders">
            <h3>Sub-Work Orders <span className="new-work-order-suborders-count">(0)</span></h3>
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
          <FormRow>{canAssign
            ? <AssignmentSearchSelect label="Assign to (Required)" placeholder="Type name, email or phone number" value={form.assignee} onChange={(value) => update("assignee", value)} options={formAssigneeOptions} onInviteTeammates={onInviteTeammates} />
            : <SearchSelect label="Assign to" placeholder="Assignment unavailable" value={form.assignee} onChange={(value) => update("assignee", value)} options={formAssigneeOptions} multiple disabled />}</FormRow>
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
          <CustomFieldsSection fields={customFields} values={form.customFieldValues} onChange={(fieldId, value) => { setCustomFieldError(""); setForm((current) => ({ ...current, customFieldValues: { ...current.customFieldValues, [fieldId]: value } })); }} />
          <FormRow><DateField key={form.dueDate ? "due-date-selected" : "due-date-empty"} label="Due Date" dateFormat={dateFormat} value={form.dueDate} onChange={(value) => { update("dueDate", value); setScheduleError(""); if (!value) update("dueTime", ""); }} timeValue={form.dueTime} onTimeChange={(value) => update("dueTime", value)} /></FormRow>
          <FormRow><DateField label="Start Date" dateFormat={dateFormat} value={form.startDate} onChange={(value) => { update("startDate", value); setScheduleError(""); }} /></FormRow>
          {scheduleError && <FormRow><p className="new-work-order-error" role="alert">{scheduleError}</p></FormRow>}
          {customFieldError && <FormRow><p className="new-work-order-error" role="alert">{customFieldError}</p></FormRow>}
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
          <RecurrenceOptions form={form} update={update} showNotice={showRecurrenceNotice} onDismissNotice={() => setShowRecurrenceNotice(false)} />
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
