import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlarmClock, ArrowLeft, Check, ChevronRight, Pause, Play, Plus, Square, Timer } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { MobileActionSheet } from "../../components/ui/MobileActionSheet";
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

function formatCompactDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours ? `${hours}h` : null, `${minutes}m`, `${remainder}s`].filter(Boolean).join(" ");
}

function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currencySymbolFor(currency)}${Number(amount || 0).toFixed(2)}`;
  }
}

function memberLabel(member) {
  return [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || member.name || member.email || member.contact_value || "Unnamed user";
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (elapsedSeconds < 60) return "less than a minute ago";
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
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
  const [isUserTimesOpen, setIsUserTimesOpen] = useState(false);
  const [userTimeEntryActionsEntry, setUserTimeEntryActionsEntry] = useState(null);
  const [deleteTimeEntryPending, setDeleteTimeEntryPending] = useState(null);
  const [isNewTimeUserPickerOpen, setIsNewTimeUserPickerOpen] = useState(false);
  const [userTimeEditStep, setUserTimeEditStep] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState({ userId: userId ?? "", hours: "", minutes: "", seconds: "", typeId: "", hourlyRate: "", notes: "" });
  const recordRef = useRef(record);
  const mobileTimerActionRef = useRef(null);
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
  const totalCost = useMemo(() => entries.reduce((total, entry) => total + (secondsForEntry(entry, now) / 3600) * Number(entry.hourly_rate || 0), 0), [entries, now]);
  const myEntries = useMemo(() => entries.filter((entry) => entry.user_id === userId), [entries, userId]);
  const myTotalSeconds = useMemo(() => myEntries.reduce((total, entry) => total + secondsForEntry(entry, now), 0), [myEntries, now]);
  const myTotalCost = useMemo(() => myEntries.reduce((total, entry) => total + (secondsForEntry(entry, now) / 3600) * Number(entry.hourly_rate || 0), 0), [myEntries, now]);
  const timeGroups = useMemo(() => {
    const groups = new Map();
    entries.forEach((entry) => {
      const name = entry.work_order_tracking_types?.name || "Work";
      if (!groups.has(name)) groups.set(name, new Map());
      const members = groups.get(name);
      const existing = members.get(entry.user_id) || { user_id: entry.user_id, seconds: 0, cost: 0, latestCreatedAt: entry.created_at };
      const entrySeconds = secondsForEntry(entry, now);
      existing.seconds += entrySeconds;
      existing.cost += (entrySeconds / 3600) * Number(entry.hourly_rate || 0);
      if (new Date(entry.created_at || 0).getTime() > new Date(existing.latestCreatedAt || 0).getTime()) existing.latestCreatedAt = entry.created_at;
      members.set(entry.user_id, existing);
    });
    return [...groups.entries()].map(([name, members]) => {
      const groupEntries = [...members.values()];
      return {
      name,
      entries: groupEntries,
      seconds: groupEntries.reduce((total, entry) => total + entry.seconds, 0),
      cost: groupEntries.reduce((total, entry) => total + entry.cost, 0),
      };
    });
  }, [entries, now]);

  const getEntryMember = (entry) => {
    const member = [...timeEntryMembers, ...memberDirectory].find((candidate) => (candidate.user_id ?? candidate.id) === entry.user_id);
    if (!member) return { name: entry.user_id === userId ? "You" : "User" };
    return {
      name: memberLabel(member),
      src: member.avatarUrl ?? member.profile?.avatar_url,
      firstName: member.firstName ?? member.profile?.first_name,
      lastName: member.lastName ?? member.profile?.last_name,
    };
  };
  const currentUserMember = getEntryMember({ user_id: userId });
  const timeEntryUserOptions = useMemo(() => {
    const candidates = [...timeEntryMembers, ...memberDirectory];
    const seen = new Set();
    const options = candidates.filter((member) => {
      const candidateId = member.user_id ?? member.id;
      if (!candidateId || seen.has(candidateId)) return false;
      seen.add(candidateId);
      return true;
    });
    if (userId && !seen.has(userId)) options.unshift({ id: userId, name: currentUserMember.name, avatarUrl: currentUserMember.src });
    return options;
  }, [currentUserMember.name, currentUserMember.src, memberDirectory, timeEntryMembers, userId]);

  useEffect(() => {
    if (!activeEntry) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeEntry]);

  const run = useCallback(async (action) => {
    setIsSaving(true);
    setError("");
    try {
      await action();
      await reload();
      onChanged?.();
      return true;
    } catch (actionError) {
      setError(actionError.message || "Unable to update Work Order time.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [onChanged, reload]);

  const startTimer = useCallback(() => {
    if (!types[0]?.id) {
      setError(isLoading ? "Time tracking is still loading." : "No Work Order time type is configured.");
      return;
    }
    void run(() => startWorkOrderTimer({ workOrderId, trackingTypeId: types[0].id, grants, record }));
  }, [grants, isLoading, record, run, types, workOrderId]);

  useEffect(() => {
    mobileTimerActionRef.current = (action = "start") => {
      if (!enabled || isSaving || isLoading) return;
      if (action === "pause" && activeEntry) {
        void run(() => pauseWorkOrderTimer({ timeEntryId: activeEntry.id, grants, record }));
      } else if (action === "stop" && (activeEntry || resumableEntry)) {
        void run(() => pauseWorkOrderTimer({ timeEntryId: (activeEntry || resumableEntry).id, finalize: true, grants, record }));
      } else if (action === "resume" && resumableEntry) {
        void run(() => resumeWorkOrderTimer({ timeEntryId: resumableEntry.id, grants, record }));
      } else if (action === "start" && !activeEntry) {
        if (resumableEntry) void run(() => resumeWorkOrderTimer({ timeEntryId: resumableEntry.id, grants, record }));
        else startTimer();
      }
    };
  }, [activeEntry, enabled, grants, isLoading, isSaving, record, resumableEntry, run, startTimer]);

  useEffect(() => {
    const handleMobileTimerAction = (event) => mobileTimerActionRef.current?.(event.detail?.action);
    const handleMobileTimerStart = () => mobileTimerActionRef.current?.("start");
    window.addEventListener("workbench:work-order-timer-action", handleMobileTimerAction);
    window.addEventListener("workbench:work-order-start-timer", handleMobileTimerStart);
    return () => {
      window.removeEventListener("workbench:work-order-timer-action", handleMobileTimerAction);
      window.removeEventListener("workbench:work-order-start-timer", handleMobileTimerStart);
    };
  }, [workOrderId]);

  useEffect(() => {
    const trackedEntry = activeEntry || resumableEntry;
    window.dispatchEvent(new CustomEvent("workbench:work-order-timer-state", {
      detail: {
        workOrderId,
        status: activeEntry ? "running" : resumableEntry ? "paused" : "idle",
        trackingTypeName: trackedEntry?.work_order_tracking_types?.name || types[0]?.name || "Work",
        elapsedSeconds: trackedEntry ? secondsForEntry(trackedEntry, now) : 0,
        isSaving,
      },
    }));
  }, [activeEntry, isSaving, now, resumableEntry, types, workOrderId]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent("workbench:work-order-timer-state", { detail: { workOrderId, status: "idle" } }));
  }, [workOrderId]);

  const addManualTime = async (event) => {
    event.preventDefault();
    const durationSeconds = (Number(form.hours) || 0) * 3600 + (Number(form.minutes) || 0) * 60 + (Number(form.seconds) || 0);
    await run(async () => {
      if (editingEntry) {
        await updateWorkOrderTimeEntry({ timeEntryId: editingEntry.id, trackingTypeId: form.typeId || types[0]?.id, durationSeconds, hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate), notes: form.notes, grants, record: recordRef.current });
      } else {
        await createWorkOrderTimeEntry({ workOrderId, userId: form.userId || userId, trackingTypeId: form.typeId || types[0]?.id, durationSeconds, hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate), notes: form.notes, grants, record: recordRef.current });
      }
      setIsAddOpen(false);
      setEditingEntry(null);
      setForm((current) => ({ ...current, hours: "", minutes: "", seconds: "", hourlyRate: "", notes: "" }));
    });
  };

  const editUserTimeEntry = (entry) => {
    setUserTimeEntryActionsEntry(null);
    setEditingEntry(entry);
    setForm({
      userId: entry.user_id,
      hours: Math.floor(Number(entry.duration_seconds || 0) / 3600).toString(),
      minutes: Math.floor((Number(entry.duration_seconds || 0) % 3600) / 60).toString(),
      seconds: Math.floor(Number(entry.duration_seconds || 0) % 60).toString(),
      typeId: entry.tracking_type_id || entry.work_order_tracking_types?.id || "",
      hourlyRate: entry.hourly_rate ?? 0,
      notes: entry.notes ?? "",
    });
    setUserTimeEditStep("category");
  };

  const closeUserTimeEdit = () => {
    setUserTimeEditStep(null);
    setEditingEntry(null);
  };

  const saveUserTimeEdit = async () => {
    const durationSeconds = (Number(form.hours) || 0) * 3600 + (Number(form.minutes) || 0) * 60 + (Number(form.seconds) || 0);
    const saved = await run(() => editingEntry
      ? updateWorkOrderTimeEntry({
        timeEntryId: editingEntry.id,
        trackingTypeId: form.typeId || types[0]?.id,
        durationSeconds,
        hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate),
        notes: form.notes,
        grants,
        record: recordRef.current,
      })
      : createWorkOrderTimeEntry({
        workOrderId,
        userId: form.userId || userId,
        trackingTypeId: form.typeId || types[0]?.id,
        durationSeconds,
        hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate),
        notes: form.notes,
        grants,
        record: recordRef.current,
      }));
    if (saved) closeUserTimeEdit();
  };

  const openNewUserTimeEntry = () => {
    setIsAddOpen(false);
    setEditingEntry(null);
    setForm((current) => ({
      ...current,
      userId: userId ?? "",
      hours: "",
      minutes: "",
      seconds: "",
      typeId: types[0]?.id || current.typeId || "",
      hourlyRate: "",
      notes: "",
    }));
    setIsNewTimeUserPickerOpen(true);
  };

  const selectNewTimeEntryUser = (member) => {
    setForm((current) => ({ ...current, userId: member.user_id ?? member.id }));
    setIsNewTimeUserPickerOpen(false);
    setUserTimeEditStep("category");
  };

  const deleteUserTimeEntry = (entry) => {
    setUserTimeEntryActionsEntry(null);
    setDeleteTimeEntryPending(entry);
  };

  const confirmDeleteUserTimeEntry = async () => {
    const deleted = await run(() => deleteWorkOrderTimeEntry({ timeEntryId: deleteTimeEntryPending.id, grants, record: recordRef.current }));
    if (deleted) setDeleteTimeEntryPending(null);
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

  const userTimeEditDialogs = <>
    {isNewTimeUserPickerOpen && <MobileActionSheet title="Select User" onClose={() => setIsNewTimeUserPickerOpen(false)}>
      <div className="work-order-time-user-options">
        {timeEntryUserOptions.map((member) => {
          const memberId = member.user_id ?? member.id;
          return <button type="button" className={form.userId === memberId ? "is-selected" : ""} key={memberId} onClick={() => selectNewTimeEntryUser(member)}><span>{memberLabel(member)}</span>{form.userId === memberId && <Check size={28} aria-hidden="true" />}</button>;
        })}
      </div>
    </MobileActionSheet>}
    {userTimeEditStep === "category" && <MobileActionSheet
      title={editingEntry ? "Change Time Category" : "Add Time Category"}
      showCancel={false}
      headerStart={<button type="button" className="mobile-action-sheet-header-action mobile-action-sheet-header-action-muted" onClick={closeUserTimeEdit}>Cancel</button>}
      headerEnd={<button type="button" className="mobile-action-sheet-header-action" onClick={() => setUserTimeEditStep("details")} disabled={!form.typeId}>Next</button>}
    >
      <div className="work-order-time-category-options">
        {types.map((type) => <button type="button" className={form.typeId === type.id ? "is-selected" : ""} key={type.id} onClick={() => setForm((current) => ({ ...current, typeId: type.id }))}><span>{type.name}</span>{form.typeId === type.id && <Check size={28} aria-hidden="true" />}</button>)}
      </div>
    </MobileActionSheet>}
    {userTimeEditStep === "details" && <MobileActionSheet
      title={editingEntry ? "Editing Time Entry" : "Adding Time Entry"}
      showCancel={false}
      headerStart={<button type="button" className="mobile-action-sheet-header-action mobile-action-sheet-header-action-muted" onClick={() => setUserTimeEditStep("category")}>Back</button>}
      headerEnd={<button type="button" className="mobile-action-sheet-header-action" onClick={() => void saveUserTimeEdit()} disabled={isSaving || ((Number(form.hours) || 0) * 3600 + (Number(form.minutes) || 0) * 60 + (Number(form.seconds) || 0)) <= 0}>Done</button>}
    >
      <div className="work-order-time-edit-fields">
        <div className="work-order-time-edit-selected-category"><strong>Selected Category:</strong><span>{types.find((type) => type.id === form.typeId)?.name || "—"}</span></div>
        <label>Time Spent<div className="work-order-time-edit-duration"><input aria-label="Hours" type="number" min="0" step="1" value={form.hours} onChange={(event) => setForm((current) => ({ ...current, hours: event.target.value }))} placeholder="0" /><span aria-hidden="true">:</span><input aria-label="Minutes" type="number" min="0" max="59" step="1" value={form.minutes} onChange={(event) => setForm((current) => ({ ...current, minutes: event.target.value }))} placeholder="0" /><span aria-hidden="true">:</span><input aria-label="Seconds" type="number" min="0" max="59" step="1" value={form.seconds} onChange={(event) => setForm((current) => ({ ...current, seconds: event.target.value }))} placeholder="0" /></div></label>
        <label>Hourly Rate (Optional)<span className="work-order-time-edit-rate"><span aria-hidden="true">{currencySymbol}</span><input aria-label={`Hourly rate in ${currency}`} type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(event) => setForm((current) => ({ ...current, hourlyRate: event.target.value }))} /></span></label>
      </div>
    </MobileActionSheet>}
  </>;

  if (isUserTimesOpen) return (
    <section className="work-order-time-user-times" aria-labelledby="work-order-time-user-times-title">
      <header className="mobile-app-header is-page-header">
        <button type="button" className="mobile-app-header-back" onClick={() => setIsUserTimesOpen(false)} aria-label="Back to Time Overview"><ArrowLeft size={26} aria-hidden="true" /></button>
        <h1 className="mobile-app-header-title" id="work-order-time-user-times-title">User Times</h1>
      </header>
      <header className="work-order-time-overview-header">
        <button type="button" onClick={() => setIsUserTimesOpen(false)} aria-label="Back to Time Overview"><ArrowLeft size={26} aria-hidden="true" /></button>
        <h3>User Times</h3>
      </header>
      <div className="work-order-time-user-times-summary">
        <Avatar className="work-order-time-user-times-avatar" src={currentUserMember.src} firstName={currentUserMember.firstName} lastName={currentUserMember.lastName} name={currentUserMember.name} alt="" />
        <strong>{currentUserMember.name}</strong>
        <span className="work-order-time-user-times-duration">{formatCompactDuration(myTotalSeconds)}</span>
        <span className="work-order-time-user-times-cost">Total Cost: {formatCurrency(myTotalCost, currency)}</span>
      </div>
      <div className="work-order-time-user-times-divider" />
      <div className="work-order-time-user-times-content">
        <h4>Time Entry</h4>
        {myEntries.length > 0 ? myEntries.map((entry) => {
          const entrySeconds = secondsForEntry(entry, now);
          const entryRate = Number(entry.hourly_rate || 0);
          const entryType = entry.work_order_tracking_types?.name || "Work";
          return (
            <button type="button" className="work-order-time-user-entry" key={entry.id} onClick={() => setUserTimeEntryActionsEntry(entry)} aria-label={`Actions for ${formatCompactDuration(entrySeconds)} ${entryType} time entry`}>
              <div className="work-order-time-user-entry-body">
                <div className="work-order-time-user-entry-duration"><strong>{formatCompactDuration(entrySeconds)}</strong><AlarmClock size={24} aria-hidden="true" /></div>
                <div className="work-order-time-user-entry-meta"><strong>{entryType}<span> - {formatRelativeTime(entry.created_at)}</span></strong><span>{formatCurrency(entryRate, currency)} per hour</span></div>
              </div>
              <ChevronRight size={28} aria-hidden="true" />
            </button>
          );
        }) : <p className="work-order-time-user-times-empty">No time entries have been logged by you.</p>}
      </div>
      <button type="button" className="work-order-time-overview-add" onClick={openNewUserTimeEntry} aria-label="Add time"><Plus size={28} aria-hidden="true" /></button>
      {addTimeDialog}
      {userTimeEntryActionsEntry && <MobileActionSheet title="" onClose={() => setUserTimeEntryActionsEntry(null)}>
        <button type="button" onClick={() => editUserTimeEntry(userTimeEntryActionsEntry)}>Edit</button>
        <button type="button" className="is-danger" onClick={() => deleteUserTimeEntry(userTimeEntryActionsEntry)}>Delete</button>
      </MobileActionSheet>}
      {deleteTimeEntryPending && <div className="work-order-time-delete-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setDeleteTimeEntryPending(null); }}>
        <section className="work-order-time-delete-confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-time-entry-title" aria-describedby="delete-time-entry-description">
          <div className="work-order-time-delete-confirmation-body">
            <h3 id="delete-time-entry-title">Delete Time Entry?</h3>
            <p id="delete-time-entry-description">Are you sure you want to delete this time entry? This action cannot be undone.</p>
          </div>
          <div className="work-order-time-delete-confirmation-actions">
            <button type="button" onClick={() => setDeleteTimeEntryPending(null)} disabled={isSaving}>Cancel</button>
            <button type="button" className="is-danger" onClick={() => void confirmDeleteUserTimeEntry()} disabled={isSaving}>{isSaving ? "Deleting..." : "Delete"}</button>
          </div>
        </section>
      </div>}
      {userTimeEditDialogs}
    </section>
  );

  if (isOverviewOpen) return (
    <section className="work-order-time-overview" aria-labelledby="work-order-time-overview-title">
      <header className="mobile-app-header is-page-header">
        <button type="button" className="mobile-app-header-back" onClick={() => setIsOverviewOpen(false)} aria-label="Back to Work Order time"><ArrowLeft size={26} aria-hidden="true" /></button>
        <h1 className="mobile-app-header-title" id="work-order-time-overview-title">Time Overview</h1>
      </header>
      <header className="work-order-time-overview-header">
        <button type="button" onClick={() => setIsOverviewOpen(false)} aria-label="Back to Work Order time"><ArrowLeft size={26} aria-hidden="true" /></button>
        <h3>Time Overview</h3>
        <button type="button" onClick={() => setIsAddOpen(true)}>Add Time</button>
      </header>
      <div className="work-order-time-overview-summary">
        <div className="work-order-time-overview-total"><strong>{formatCompactDuration(myTotalSeconds)}</strong><span>{formatCurrency(myTotalCost, currency)}</span><button type="button" className="is-selected" onClick={() => setIsUserTimesOpen(true)}>My Time</button></div>
        <div className="work-order-time-overview-total"><strong>{formatCompactDuration(totalSeconds)}</strong><span>{formatCurrency(totalCost, currency)}</span><span className="work-order-time-overview-total-label">Total Time</span></div>
      </div>
      <div className="work-order-time-overview-content">
        {timeGroups.length > 0 ? timeGroups.map((group) => (
          <section className="work-order-time-overview-group" key={group.name}>
            <h4>{group.name} {formatCompactDuration(group.seconds)} – {formatCurrency(group.cost, currency)}</h4>
            {group.entries.map((entry) => {
              const member = getEntryMember(entry);
              const entrySeconds = entry.seconds;
              const entryCost = entry.cost;
              return <div className="work-order-time-overview-entry" key={entry.user_id}>
                <Avatar className="work-order-time-overview-avatar" src={member.src} firstName={member.firstName} lastName={member.lastName} name={member.name} alt="" />
                <div className="work-order-time-overview-entry-details"><strong>{member.name}</strong><span>{formatRelativeTime(entry.latestCreatedAt)}</span><span>{formatCurrency(entryCost, currency)}</span></div>
                {entry.user_id === userId ? <button type="button" className="work-order-time-overview-entry-duration work-order-time-overview-entry-duration-link" onClick={() => setIsUserTimesOpen(true)} aria-label={`View ${formatCompactDuration(entrySeconds)} time entries`}>{formatCompactDuration(entrySeconds)}</button> : <strong className="work-order-time-overview-entry-duration">{formatCompactDuration(entrySeconds)}</strong>}
                <ChevronRight size={24} aria-hidden="true" />
              </div>;
            })}
          </section>
        )) : <p className="work-order-time-overview-empty">Add time entries to this Work Order.</p>}
      </div>
      <button type="button" className="work-order-time-overview-add" onClick={openNewUserTimeEntry} aria-label="Add time"><Plus size={28} aria-hidden="true" /></button>
      {addTimeDialog}
      {userTimeEditDialogs}
    </section>
  );

  return (
    <div className="work-order-time-tracking">
      <div className="detail-cost-row work-order-time-summary">
        <span className="work-order-time-overview-link"><Timer size={16} aria-hidden="true" /> Time</span>
        <div className="work-order-time-summary-actions">
          {isLoading ? (
            <span className="work-order-time-summary-value">Loading...</span>
          ) : totalSeconds > 0 ? (
            <button type="button" className="work-order-time-overview-value-link" onClick={() => setIsOverviewOpen(true)} aria-label="View time overview">
              <span className="work-order-time-summary-value">{formatCompactDuration(totalSeconds)}</span>
              <ChevronRight className="work-order-time-overview-chevron" size={20} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="work-order-time-add" onClick={() => setIsAddOpen(true)} disabled={isSaving}>
              Add <ChevronRight className="work-order-time-add-chevron" size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {totalSeconds > 0 && <div className="work-order-time-cost-row"><span>Time Cost:</span><strong>{formatCurrency(totalCost, currency)}</strong></div>}
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
          <button type="button" onClick={startTimer} disabled={isSaving || isLoading || !types[0]?.id}><Play size={16} aria-hidden="true" /> Start Timer</button>
        )}
      </div>
      {addTimeDialog}
    </div>
  );
}

