import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Plus, Square, Timer } from "lucide-react";
import {
  createWorkOrderTimeEntry,
  deleteWorkOrderTimeEntry,
  listWorkOrderTimeEntries,
  listWorkOrderTrackingTypes,
  pauseWorkOrderTimer,
  resumeWorkOrderTimer,
  startWorkOrderTimer,
  updateWorkOrderTimeEntry,
} from "../../services/workOrderTimeService";
import { currencySymbolFor } from "../../utils/currencyFormatting";

function secondsForEntry(entry, now) {
  const elapsed = entry.status === "running" && entry.active_started_at
    ? Math.max(0, Math.floor((now - new Date(entry.active_started_at).getTime()) / 1000))
    : 0;
  return Number(entry.duration_seconds ?? 0) + elapsed;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

function memberLabel(member) {
  return [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || member.name || member.email || member.contact_value || "Unnamed user";
}

export function WorkOrderTimeTracking({ organizationId, workOrderId, grants, record, userId, memberDirectory = [], timeEntryMembers = [], currency = "USD", isOrganizationAdmin = false, enabled = true, onChanged }) {
  const [types, setTypes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState({ userId: userId ?? "", hours: "", minutes: "", typeId: "", hourlyRate: "", notes: "" });
  const recordRef = useRef(record);
  useEffect(() => { recordRef.current = record; }, [record]);

  const reload = useCallback(async () => {
    if (!enabled) return;
    if (!organizationId || !workOrderId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [nextTypes, nextEntries] = await Promise.all([
        listWorkOrderTrackingTypes({ organizationId, kind: "time" }),
        listWorkOrderTimeEntries({ organizationId, workOrderId, grants, record: recordRef.current }),
      ]);
      setTypes(nextTypes);
      setEntries(nextEntries);
      setForm((current) => ({ ...current, typeId: current.typeId || nextTypes[0]?.id || "" }));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load Work Order time.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, organizationId, workOrderId, grants]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [reload]);

  const activeEntry = useMemo(() => entries.find((entry) => entry.user_id === userId && entry.status === "running"), [entries, userId]);
  const resumableEntry = useMemo(() => entries.find((entry) => entry.user_id === userId && entry.status === "paused"), [entries, userId]);
  const currencySymbol = useMemo(() => currencySymbolFor(currency), [currency]);
  const totalSeconds = useMemo(() => entries.reduce((total, entry) => total + secondsForEntry(entry, now), 0), [entries, now]);

  useEffect(() => {
    if (!activeEntry) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeEntry]);

  const run = async (action) => {
    setIsSaving(true);
    setError("");
    try {
      await action();
      await reload();
      onChanged?.();
    } catch (actionError) {
      setError(actionError.message || "Unable to update Work Order time.");
    } finally {
      setIsSaving(false);
    }
  };

  const addManualTime = async (event) => {
    event.preventDefault();
    const durationSeconds = (Number(form.hours) || 0) * 3600 + (Number(form.minutes) || 0) * 60;
    await run(async () => {
      if (editingEntry) {
        await updateWorkOrderTimeEntry({ timeEntryId: editingEntry.id, trackingTypeId: form.typeId || types[0]?.id, durationSeconds, hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate), notes: form.notes, grants, record: recordRef.current });
      } else {
        await createWorkOrderTimeEntry({ workOrderId, userId: form.userId || userId, trackingTypeId: form.typeId || types[0]?.id, durationSeconds, hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate), notes: form.notes, grants, record: recordRef.current });
      }
      setIsAddOpen(false);
      setEditingEntry(null);
      setForm((current) => ({ ...current, hours: "", minutes: "", hourlyRate: "", notes: "" }));
    });
  };

  if (!enabled) return null;

  const addTimeDialog = isAddOpen && (
    <div className="work-order-time-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAddOpen(false); }}>
      <form className="work-order-time-modal" onSubmit={addManualTime} aria-labelledby="add-time-title">
        <div className="work-order-time-modal-header"><h3 id="add-time-title">{editingEntry ? "Edit Time" : "Add Time"}</h3><button type="button" onClick={() => { setIsAddOpen(false); setEditingEntry(null); }} aria-label="Close"><span aria-hidden="true">×</span></button></div>
        {isOrganizationAdmin && <label>User<select value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })}>{timeEntryMembers.map((member) => <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>)}</select></label>}
        <div className="work-order-time-form-grid"><label>Hours<input type="number" min="0" step="1" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} /></label><label>Minutes<input type="number" min="0" max="59" step="1" value={form.minutes} onChange={(event) => setForm({ ...form, minutes: event.target.value })} /></label></div>
        <label>Type<select value={form.typeId} onChange={(event) => setForm({ ...form, typeId: event.target.value })}>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <label>Hourly rate (optional)<span className="work-order-currency-input"><span aria-hidden="true">{currencySymbol}</span><input aria-label={`Hourly rate in ${currency}`} type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })} /></span></label>
        <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows="3" /></label>
        <div className="work-order-time-modal-actions"><button type="button" onClick={() => { setIsAddOpen(false); setEditingEntry(null); }}>Cancel</button><button type="submit" disabled={isSaving || ((Number(form.hours) || 0) * 3600 + (Number(form.minutes) || 0) * 60) <= 0}>{editingEntry ? "Save Time" : "Add Time"}</button></div>
      </form>
    </div>
  );

  if (isOverviewOpen) return (
    <section className="work-order-time-overview" aria-labelledby="work-order-time-overview-title">
      <header className="work-order-time-overview-header"><button type="button" onClick={() => setIsOverviewOpen(false)} aria-label="Back to Work Order time"><span aria-hidden="true">‹</span></button><h3 id="work-order-time-overview-title">Time Overview</h3><button type="button" onClick={() => setIsAddOpen(true)}>Add Time</button></header>
      <div className="work-order-time-overview-summary"><div><strong>{formatDuration(totalSeconds)}</strong><span>Total Time</span></div><div><strong>{formatDuration(entries.filter((entry) => entry.user_id === userId).reduce((total, entry) => total + secondsForEntry(entry, now), 0))}</strong><button type="button">My Time</button></div></div>
      <div className="work-order-time-overview-content"><p>Add time entries to this Work Order</p><button type="button" onClick={() => setIsAddOpen(true)}>Add Time</button>{entries.length > 0 && <div className="work-order-time-entry-list">{entries.map((entry) => <div className="work-order-time-entry" key={entry.id}><span>{entry.user_id === userId ? "You" : "User"}</span><span>{entry.work_order_tracking_types?.name || "Work"}</span><strong>{formatDuration(secondsForEntry(entry, now))}</strong></div>)}</div>}</div>
      {addTimeDialog}
    </section>
  );

  return (
    <div className="work-order-time-tracking">
      <div className="detail-cost-row work-order-time-summary">
        <button type="button" className="work-order-time-overview-link" onClick={() => setIsOverviewOpen(true)}><Timer size={16} aria-hidden="true" /> Time</button>
        <span className="work-order-time-summary-value">{isLoading ? "Loading..." : formatDuration(totalSeconds)}</span>
        <button type="button" onClick={() => setIsAddOpen(true)} disabled={isSaving || isLoading}>
          Add <Plus size={14} aria-hidden="true" />
        </button>
      </div>
      {error && <p className="work-order-time-error" role="alert">{error}</p>}
      <div className="work-order-time-entry-list">
        {entries.map((entry) => (
          <div className="work-order-time-entry" key={entry.id}>
            <span>{entry.user_id === userId ? "You" : [...timeEntryMembers, ...memberDirectory].find((member) => (member.user_id ?? member.id) === entry.user_id)?.profile?.first_name || [...timeEntryMembers, ...memberDirectory].find((member) => (member.user_id ?? member.id) === entry.user_id)?.name || "User"}</span>
            <span>{entry.work_order_tracking_types?.name || "Work"}</span>
            <strong>{formatDuration(secondsForEntry(entry, now))}</strong>
            {entry.status !== "running" && (entry.user_id === userId || isOrganizationAdmin) && <span className="work-order-time-entry-actions"><button type="button" onClick={() => { setEditingEntry(entry); setForm({ userId: entry.user_id, hours: Math.floor(Number(entry.duration_seconds || 0) / 3600).toString(), minutes: Math.floor((Number(entry.duration_seconds || 0) % 3600) / 60).toString(), typeId: entry.tracking_type_id, hourlyRate: entry.hourly_rate ?? "", notes: entry.notes ?? "" }); setIsAddOpen(true); }}>Edit</button><button type="button" onClick={() => { if (window.confirm("Delete this time entry?")) void run(() => deleteWorkOrderTimeEntry({ timeEntryId: entry.id, grants, record: recordRef.current })); }}>Delete</button></span>}
          </div>
        ))}
      </div>
      <div className="work-order-time-overlay" aria-live="polite">
        <span className="work-order-time-overlay-value">{formatDuration(activeEntry ? secondsForEntry(activeEntry, now) : resumableEntry ? secondsForEntry(resumableEntry, now) : 0)}</span>
        {activeEntry ? (
          <>
            <button type="button" onClick={() => void run(() => pauseWorkOrderTimer({ timeEntryId: activeEntry.id, grants, record }))} disabled={isSaving}><Pause size={16} aria-hidden="true" /> Pause</button>
            <button type="button" onClick={() => void run(() => pauseWorkOrderTimer({ timeEntryId: activeEntry.id, finalize: true, grants, record }))} disabled={isSaving}><Square size={15} aria-hidden="true" /> Stop</button>
          </>
        ) : resumableEntry ? (
          <button type="button" onClick={() => void run(() => resumeWorkOrderTimer({ timeEntryId: resumableEntry.id, grants, record }))} disabled={isSaving}><Play size={16} aria-hidden="true" /> Resume Timer</button>
        ) : (
          <button type="button" onClick={() => void run(() => startWorkOrderTimer({ workOrderId, trackingTypeId: types[0]?.id, grants, record }))} disabled={isSaving || isLoading}><Play size={16} aria-hidden="true" /> Start Timer</button>
        )}
      </div>
      {addTimeDialog}
    </div>
  );
}

