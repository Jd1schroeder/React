import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { createWorkOrderTrackingType, deleteWorkOrderTrackingType, listWorkOrderTrackingTypes, updateWorkOrderTrackingType } from "../../services/workOrderTimeService";

export function WorkOrderTrackingTypesModal({ organizationId, kind, onClose }) {
  const [types, setTypes] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const label = kind === "time" ? "time" : "cost";

  const reload = useCallback(async () => {
    try { setTypes(await listWorkOrderTrackingTypes({ organizationId, kind })); } catch (loadError) { setError(loadError.message || `Unable to load ${label} types.`); }
  }, [organizationId, kind, label]);
  useEffect(() => { const timer = window.setTimeout(() => { void reload(); }, 0); return () => window.clearTimeout(timer); }, [reload]);
  const save = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true); setError("");
    try {
      if (editingId) await updateWorkOrderTrackingType({ typeId: editingId, name });
      else await createWorkOrderTrackingType({ organizationId, kind, name });
      setName(""); setEditingId(""); await reload();
    } catch (saveError) { setError(saveError.message || `Unable to save ${label} type.`); } finally { setIsSaving(false); }
  };
  return <div className="work-order-time-modal-backdrop" role="presentation"><section className="work-order-time-modal" role="dialog" aria-modal="true" aria-labelledby="tracking-types-title"><button type="button" className="work-order-time-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button><h3 id="tracking-types-title">Manage custom {label} types</h3><p>System types are shared app standards. Custom types apply only to this organization.</p>{error && <p className="work-order-time-error" role="alert">{error}</p>}<div className="work-order-tracking-type-list">{types.map((type) => <div className="work-order-tracking-type-row" key={type.id}><span>{type.name}{type.is_system && <small>Standard</small>}</span>{!type.is_system && <span><button type="button" onClick={() => { setEditingId(type.id); setName(type.name); }}>Edit</button><button type="button" onClick={() => { if (window.confirm(`Delete ${type.name}?`)) void deleteWorkOrderTrackingType({ typeId: type.id }).then(reload).catch((deleteError) => setError(deleteError.message || `Unable to delete ${label} type.`)); }}>Delete</button></span>}</div>)}</div><form onSubmit={save}><label>{editingId ? `Rename ${label} type` : `New ${label} type`}<input value={name} onChange={(event) => setName(event.target.value)} maxLength="100" /></label><div className="work-order-time-modal-actions"><button type="button" onClick={() => { setEditingId(""); setName(""); }}>Clear</button><button type="submit" disabled={isSaving || !name.trim()}>{editingId ? "Save" : "Add type"}</button></div></form></section></div>;
}

