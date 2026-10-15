import { useState } from "react";
import {
  AlignLeft, ArrowLeft, Boxes, CalendarClock, CalendarDays, CircleDot, Flag,
  GripVertical, Hash, Link2, List, MapPin, Paperclip, Plus, Repeat2, Tags, Trash2, Type, X, UserRound, Wrench,
} from "lucide-react";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/useToast";
import { useWorkspace } from "../../components/layout/useWorkspace";
import { updateOrganization } from "../../services/organizationService";
import { getFeatureLabel } from "../../utils/featureLabels";
import { normalizeWorkOrderSettings } from "../../utils/workOrderSettings";
import { SettingsLayout } from "./SettingsLayout";
import "./WorkOrderFeatureSettingsPage.css";

const FIELD_OPTIONS = [
  { key: "asset", label: "Asset", icon: Boxes, defaultValue: "required" },
  { key: "assignee", label: "Assign to", icon: UserRound, defaultValue: "required" },
  { key: "attachments", label: "Attachments", icon: Paperclip, defaultValue: "optional" },
  { key: "categories", label: "Categories", icon: Tags, defaultValue: "required" },
  { key: "description", label: "Description", icon: AlignLeft, defaultValue: "optional" },
  { key: "dueDate", label: "Due Date", icon: CalendarClock, defaultValue: "required" },
  { key: "location", label: "Location", icon: MapPin, defaultValue: "optional" },
  { key: "parts", label: "Parts", icon: Wrench, defaultValue: "optional" },
  { key: "priority", label: "Priority", icon: Flag, defaultValue: "optional" },
  { key: "procedure", label: "Procedure", icon: List, defaultValue: "optional" },
  { key: "recurrence", label: "Recurrence", icon: Repeat2, defaultValue: "optional" },
  { key: "startDate", label: "Start Date", icon: CalendarDays, defaultValue: "optional" },
  { key: "vendors", label: "Vendors", icon: Boxes, defaultValue: "optional" },
];

const FIELD_SETTING_OPTIONS = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "hidden", label: "Hidden" },
];

const CUSTOM_FIELD_TYPES = [
  { value: "text", label: "Single Line Text", icon: Type },
  { value: "long_text", label: "Multi Line Text", icon: AlignLeft },
  { value: "number", label: "Number", icon: Hash },
  { value: "single_select", label: "Single Select", icon: CircleDot },
  { value: "date", label: "Date", icon: CalendarDays },
  { value: "datetime", label: "Date & Time", icon: CalendarClock },
  { value: "link", label: "Link", icon: Link2 },
];

function getDefaultFields(settings) {
  return Object.fromEntries(FIELD_OPTIONS.map(({ key, defaultValue }) => [key, settings.workOrderFields.defaultFields[key] ?? defaultValue]));
}

export function WorkOrderFieldsPage({ onNavigate }) {
  const workspace = useWorkspace();
  const organization = workspace.organization ?? {};
  const isAdmin = organization.roleDefinition?.system_key === "organization_admin" || ["owner", "admin"].includes(organization.role);
  const savedSettings = normalizeWorkOrderSettings(organization.work_order_settings);
  const [settings, setSettings] = useState(savedSettings);
  const [organizationId, setOrganizationId] = useState(organization.id);
  const [activeTab, setActiveTab] = useState("default");
  const [error, setError] = useState("");
  const { showToast } = useToast();
  const displayedSettings = organizationId === organization.id ? settings : savedSettings;
  const defaultFields = getDefaultFields(displayedSettings);
  const customFields = displayedSettings.workOrderFields.customFields;
  const workOrderLabel = getFeatureLabel(organization.feature_labels, "workOrder", "singular");

  const saveFields = async (workOrderFields, successMessage = "Work Order fields updated.") => {
    if (!organization.id || !isAdmin) return;
    const nextSettings = { ...displayedSettings, workOrderFields };
    setSettings(nextSettings);
    setOrganizationId(organization.id);
    setError("");
    try {
      await updateOrganization({ organizationId: organization.id, updates: { work_order_settings: nextSettings } });
      workspace.patchOrganization?.(organization.id, { work_order_settings: nextSettings });
      showToast(successMessage);
    } catch (saveError) {
      setSettings(displayedSettings);
      setError(saveError.message || "Unable to save Work Order fields.");
      showToast(saveError.message || "Unable to save Work Order fields.", { tone: "error" });
    }
  };

  const updateDefaultField = (key, value) => {
    const field = FIELD_OPTIONS.find((option) => option.key === key);
    return saveFields({ ...displayedSettings.workOrderFields, defaultFields: { ...defaultFields, [key]: value } }, `${field?.label ?? "Default"} is now ${value}.`);
  };
  const updateCustomField = (index, updates) => {
    const field = customFields[index];
    const fieldName = field?.name?.trim() || "Custom field";
    let message = `${fieldName} updated.`;
    if (Object.prototype.hasOwnProperty.call(updates, "required")) message = `${fieldName} is now ${updates.required ? "required" : "optional"}.`;
    else if (Object.prototype.hasOwnProperty.call(updates, "includeOnRequest")) message = `${fieldName} is now ${updates.includeOnRequest ? "included on" : "excluded from"} Request forms.`;
    else if (Object.prototype.hasOwnProperty.call(updates, "includeOnRequestPortal")) message = `${fieldName} is now ${updates.includeOnRequestPortal ? "included on" : "excluded from"} Request Portal forms.`;
    else if (Object.prototype.hasOwnProperty.call(updates, "copyOnRepeat")) message = `${fieldName} will ${updates.copyOnRepeat ? "be" : "not be"} copied to repeating Work Orders.`;
    else if (Object.prototype.hasOwnProperty.call(updates, "options")) {
      const previousOptions = field?.options ?? [];
      const nextOptions = updates.options ?? [];
      const addedOption = nextOptions.find((option) => !previousOptions.includes(option));
      const removedOption = previousOptions.find((option) => !nextOptions.includes(option));
      if (addedOption) message = `${addedOption.charAt(0).toUpperCase()}${addedOption.slice(1)} was added to ${fieldName}'s Single Select options.`;
      else if (removedOption) message = `${removedOption.charAt(0).toUpperCase()}${removedOption.slice(1)} was removed from ${fieldName}'s Single Select options.`;
      else message = `Options for ${fieldName} were updated.`;
    }
    else if (Object.prototype.hasOwnProperty.call(updates, "type")) {
      const typeLabel = CUSTOM_FIELD_TYPES.find((type) => type.value === updates.type)?.label ?? "updated";
      message = `${fieldName} is now ${typeLabel === "Link" ? "a Link" : typeLabel}.`;
    }
    return saveFields({ ...displayedSettings.workOrderFields, customFields: customFields.map((currentField, fieldIndex) => fieldIndex === index ? { ...currentField, ...updates } : currentField) }, message);
  };
  const removeCustomField = (index) => saveFields({ ...displayedSettings.workOrderFields, customFields: customFields.filter((_, fieldIndex) => fieldIndex !== index) }, "Custom field deleted.");
  const reorderCustomFields = (fromIndex, insertionIndex) => {
    if (fromIndex < 0 || insertionIndex < 0 || insertionIndex === fromIndex || insertionIndex === fromIndex + 1) return;
    const nextFields = [...customFields];
    const [movedField] = nextFields.splice(fromIndex, 1);
    const adjustedInsertionIndex = insertionIndex > fromIndex ? insertionIndex - 1 : insertionIndex;
    nextFields.splice(adjustedInsertionIndex, 0, movedField);
    saveFields({ ...displayedSettings.workOrderFields, customFields: nextFields }, "Custom fields reordered.");
  };
  const addCustomField = () => saveFields({ ...displayedSettings.workOrderFields, customFields: [...customFields, { id: `custom-${Date.now()}`, name: "", type: "text", options: [], required: false, copyOnRepeat: true, includeOnRequest: false, includeOnRequestPortal: false }] }, "Custom field added.");

  return (
    <div className="settings-page work-order-fields-page">
      <header className="settings-page-header"><div><p className="eyebrow">Organization Settings</p><h1>{workOrderLabel} fields</h1><p>Choose which fields appear on your {workOrderLabel.toLowerCase()} form.</p></div></header>
      <SettingsLayout pageName="Settings / Features" onNavigate={onNavigate} className="work-order-settings-layout">
        <main className="work-order-fields-content">
          <button type="button" className="work-order-feature-back" onClick={() => onNavigate("Settings / Features / Work Orders")}><ArrowLeft size={17} aria-hidden="true" /> Back to Work Order settings</button>
          {!isAdmin && <p className="work-order-feature-readonly">Only organization administrators can change these settings.</p>}
          {error && <p className="work-order-feature-error" role="alert">{error}</p>}
          <div className="work-order-fields-tabs" role="tablist" aria-label={`${workOrderLabel} field settings`}>
            <button type="button" role="tab" aria-selected={activeTab === "default"} className={activeTab === "default" ? "is-active" : ""} onClick={() => setActiveTab("default")}>Default Fields</button>
            <button type="button" role="tab" aria-selected={activeTab === "custom"} className={activeTab === "custom" ? "is-active" : ""} onClick={() => setActiveTab("custom")}>Custom Fields</button>
          </div>
          {activeTab === "default" ? <DefaultFields fields={defaultFields} assigneeMode={displayedSettings.workOrderFields.assigneeMode} onChange={updateDefaultField} onAssigneeModeChange={(value) => saveFields({ ...displayedSettings.workOrderFields, assigneeMode: value }, "Assignment requirement updated.")} disabled={!isAdmin} /> : <CustomFields fields={customFields} onChange={updateCustomField} onRemove={removeCustomField} onReorder={reorderCustomFields} onAdd={addCustomField} disabled={!isAdmin} />}
        </main>
      </SettingsLayout>
    </div>
  );
}

function DefaultFields({ fields, assigneeMode, onChange, onAssigneeModeChange, disabled }) {
  return <section className="work-order-fields-panel" role="tabpanel" aria-label="Default Fields"><p className="work-order-fields-help">When a field is required, users will not be able to create or update a work order without filling it.</p><div className="work-order-default-fields-header"><span>Field</span><span>Settings</span></div><div className="work-order-default-fields-list">{FIELD_OPTIONS.map(({ key, label, icon: Icon }) => <div className="work-order-default-field" key={key}><span className="work-order-field-icon"><Icon size={17} aria-hidden="true" /></span><span className="work-order-default-field-label">{label}</span>{key === "assignee" && <div className="work-order-assignee-options"><label><input type="radio" name="assignee-mode" checked={assigneeMode === "assignee"} onChange={() => onAssigneeModeChange("assignee")} disabled={disabled} /> Requires one assignee</label><label><input type="radio" name="assignee-mode" checked={assigneeMode === "team"} onChange={() => onAssigneeModeChange("team")} disabled={disabled} /> Requires one team</label></div>}<Select ariaLabel={`${label} field setting`} value={fields[key]} onChange={(value) => onChange(key, value)} disabled={disabled} options={FIELD_SETTING_OPTIONS} /></div>)}</div></section>;
}

function CustomFields({ fields, onChange, onRemove, onReorder, onAdd, disabled }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropInsertionIndex, setDropInsertionIndex] = useState(null);
  const finishDrag = () => { setDraggedIndex(null); setDropInsertionIndex(null); };
  const updateDropSlot = (event, insertionIndex) => { event.preventDefault(); setDropInsertionIndex(insertionIndex); };
  const commitDrop = (event, insertionIndex) => { event.preventDefault(); onReorder(draggedIndex, insertionIndex); finishDrag(); };
  return <section className="work-order-custom-fields-panel" role="tabpanel" aria-label="Custom Fields">{fields.length === 0 && <div className="work-order-custom-fields-empty">No custom fields have been added yet.</div>}{fields.map((field, index) => <div className="work-order-custom-field-slot" key={field.id ?? index}>{dropInsertionIndex === index && draggedIndex !== null && draggedIndex !== index && <div className="work-order-custom-field-drop-line" aria-label="Drop custom field here" onDragOver={(event) => updateDropSlot(event, index)} onDrop={(event) => commitDrop(event, index)} />}<CustomFieldCard field={field} index={index} onChange={onChange} onRemove={onRemove} onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); updateDropSlot(event, event.clientY < bounds.top + bounds.height / 2 ? index : index + 1); }} onDrop={(event) => commitDrop(event, dropInsertionIndex ?? index)} onDragEnd={finishDrag} disabled={disabled} /></div>)}{dropInsertionIndex === fields.length && draggedIndex !== null && <div className="work-order-custom-field-drop-line" aria-label="Drop custom field at end" onDragOver={(event) => updateDropSlot(event, fields.length)} onDrop={(event) => commitDrop(event, fields.length)} />}<button type="button" className="work-order-add-custom-field" onClick={onAdd} disabled={disabled}><Plus size={17} aria-hidden="true" /> Add Another Custom Field</button></section>;
}

function CustomFieldCard({ field, index, onChange, onRemove, onDragStart, onDragOver, onDrop, onDragEnd, disabled }) {
  const [optionDraft, setOptionDraft] = useState("");
  const options = Array.isArray(field.options) ? field.options : [];
  const addOption = (draft = optionDraft) => {
    const value = draft.trim();
    if (!value || options.includes(value)) return;
    onChange(index, { options: [...options, value] });
    setOptionDraft("");
  };
  return <article className="work-order-custom-field-card" onDragOver={onDragOver} onDrop={onDrop}>
    <button type="button" className="work-order-custom-field-drag" aria-label={`Reorder custom field ${index + 1}`} draggable={!disabled} onDragStart={onDragStart} onDragEnd={onDragEnd} disabled={disabled}><GripVertical size={18} aria-hidden="true" /></button>
    <div className="work-order-custom-field-body">
      <div className="work-order-custom-field-heading"><input aria-label={`Custom field ${index + 1} name`} defaultValue={field.name} placeholder="Field name" onBlur={(event) => onChange(index, { name: event.target.value.trim() })} disabled={disabled} /><Select ariaLabel={`Custom field ${index + 1} type`} value={field.type} onChange={(value) => onChange(index, { type: value })} disabled={disabled} options={CUSTOM_FIELD_TYPES} /></div>
      {field.type === "single_select" && <div className="work-order-custom-field-options"><span className="work-order-custom-field-options-label">Options</span><div className="work-order-custom-field-chips">{options.map((option) => <span className="work-order-custom-field-chip" key={option}>{option}<button type="button" aria-label={`Remove ${option}`} onClick={() => onChange(index, { options: options.filter((item) => item !== option) })} disabled={disabled}><X size={14} aria-hidden="true" /></button></span>)}<input aria-label={`Add option to custom field ${index + 1}`} value={optionDraft} placeholder="Type an option and press Enter" onChange={(event) => { const value = event.target.value; if (value.endsWith(",")) { addOption(value.slice(0, -1)); } else setOptionDraft(value); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addOption(); } }} disabled={disabled} /></div><small>Press Enter or comma to add an option.</small></div>}
      <label><input type="checkbox" checked={field.required} onChange={(event) => onChange(index, { required: event.target.checked })} disabled={disabled} /> Make this field required</label><label><input type="checkbox" checked={field.copyOnRepeat} onChange={(event) => onChange(index, { copyOnRepeat: event.target.checked })} disabled={disabled} /> Copy the values of this field on repeating Work Orders</label><label><input type="checkbox" checked={field.includeOnRequest} onChange={(event) => onChange(index, { includeOnRequest: event.target.checked })} disabled={disabled} /> Include this field on Request forms</label><label><input type="checkbox" checked={field.includeOnRequestPortal} onChange={(event) => onChange(index, { includeOnRequestPortal: event.target.checked })} disabled={disabled} /> Include this field on Request Portal forms</label>
    </div>
    <button type="button" className="work-order-custom-field-remove" aria-label={`Delete custom field ${index + 1}`} onClick={() => onRemove(index)} disabled={disabled}><Trash2 size={17} aria-hidden="true" /></button>
  </article>;
}
