import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { createWorkOrderCostEntry, deleteWorkOrderCostEntry, listWorkOrderCostEntries, listWorkOrderTrackingTypes, updateWorkOrderCostEntry } from "../../services/workOrderTimeService";

function memberLabel(member) {
  return [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || member.name || member.email || "Unnamed user";
}

export function WorkOrderCostTracking({ organizationId, workOrderId, grants, record, userId, timeEntryMembers = [], isOrganizationAdmin = false, enabled = true }) {
  const [types, setTypes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ userId: userId ?? "", typeId: "", amount: "", description: "" });
  const recordRef = useRef(record);
  useEffect(() => { recordRef.current = record; }, [record]);

  const reload = useCallback(async () => {
    if (!enabled || !organizationId || !workOrderId) return;
    try {
      const [nextTypes, nextEntries] = await Promise.all([
        listWorkOrderTrackingTypes({ organizationId, kind: "cost" }),
        listWorkOrderCostEntries({ organizationId, workOrderId, grants, record: recordRef.current }),
      ]);
      setTypes(nextTypes);
      setEntries(nextEntries);
      setForm((current) => ({ ...current, typeId: current.typeId || nextTypes[0]?.id || "" }));
    } catch (loadError) { setError(loadError.message || "Unable to load Work Order costs."); }
  }, [enabled, organizationId, workOrderId, grants]);

  useEffect(() => { const timer = window.setTimeout(() => { void reload(); }, 0); return () => window.clearTimeout(timer); }, [reload]);
  if (!enabled) return null;
  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true); setError("");
    try {
      if (editingEntry) await updateWorkOrderCostEntry({ costEntryId: editingEntry.id, trackingTypeId: form.typeId || types[0]?.id, amount: Number(form.amount), description: form.description, grants, record: recordRef.current });
      else await createWorkOrderCostEntry({ workOrderId, userId: form.userId || userId, trackingTypeId: form.typeId || types[0]?.id, amount: Number(form.amount), description: form.description, grants, record: recordRef.current });
      setIsOpen(false); setEditingEntry(null); setForm((current) => ({ ...current, amount: "", description: "" })); await reload();
    } catch (submitError) { setError(submitError.message || "Unable to add Work Order cost."); } finally { setIsSaving(false); }
  };
  return <>
    <div className="detail-cost-row work-order-cost-summary"><span>Other Costs</span><button type="button" className="work-order-cost-add" onClick={() => setIsOpen(true)} disabled={isSaving}>Add <Plus className="work-order-cost-add-icon" size={14} aria-hidden="true" /><ChevronRight className="work-order-cost-add-chevron" size={20} aria-hidden="true" /></button></div>
    {entries.length > 0 && <div className="work-order-time-entry-list">{entries.map((entry) => <div className="work-order-time-entry" key={entry.id}><span>{entry.work_order_tracking_types?.name || "Other"}</span><span>{entry.description || "No description"}</span><strong>${Number(entry.amount || 0).toFixed(2)}</strong>{(entry.user_id === userId || isOrganizationAdmin) && <span className="work-order-time-entry-actions"><button type="button" onClick={() => { setEditingEntry(entry); setForm({ userId: entry.user_id, typeId: entry.tracking_type_id, amount: entry.amount, description: entry.description || "" }); setIsOpen(true); }}>Edit</button><button type="button" onClick={() => { if (window.confirm("Delete this cost entry?")) { setIsSaving(true); void deleteWorkOrderCostEntry({ costEntryId: entry.id, grants, record: recordRef.current }).then(reload).catch((deleteError) => setError(deleteError.message || "Unable to delete Work Order cost.")).finally(() => setIsSaving(false)); } }}>Delete</button></span>}</div>)}</div>}
    {error && <p className="work-order-time-error" role="alert">{error}</p>}
    {isOpen && <div className="work-order-time-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}><form className="work-order-time-modal" onSubmit={submit} aria-labelledby="add-cost-title"><h3 id="add-cost-title">{editingEntry ? "Edit Cost" : "Add Cost"}</h3>{isOrganizationAdmin && <label>User<select value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })}>{timeEntryMembers.map((member) => <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>)}</select></label>}<label>Amount<input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label><label>Type<select value={form.typeId} onChange={(event) => setForm({ ...form, typeId: event.target.value })}>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label>Description<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="work-order-time-modal-actions"><button type="button" onClick={() => { setIsOpen(false); setEditingEntry(null); }}>Cancel</button><button type="submit" disabled={isSaving || form.amount === ""}>{editingEntry ? "Save Cost" : "Add Cost"}</button></div></form></div>}
  </>;
}

