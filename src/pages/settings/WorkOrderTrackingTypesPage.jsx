import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MoreVertical, Plus, Search, X } from "lucide-react";
import { useWorkspace } from "../../components/layout/useWorkspace";
import { MobileActionSheet } from "../../components/ui/MobileActionSheet";
import { createWorkOrderTrackingType, deleteWorkOrderTrackingType, listWorkOrderTrackingTypes, updateWorkOrderTrackingType } from "../../services/workOrderTimeService";
import "./WorkOrderFeatureSettingsPage.css";

export function WorkOrderTrackingTypesPage({ onNavigate }) {
  const workspace = useWorkspace();
  const organizationId = workspace.organization?.id;
  const [types, setTypes] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [menuTypeId, setMenuTypeId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const closeMobileMenu = useCallback(() => setMenuTypeId(""), []);

  const reload = useCallback(async () => {
    if (!organizationId) return;
    try {
      setTypes(await listWorkOrderTrackingTypes({ organizationId, kind: "cost" }));
    } catch (loadError) {
      setError(loadError.message || "Unable to load cost types.");
    }
  }, [organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  useEffect(() => {
    if (!menuTypeId) return undefined;
    const closeMenuOnOutsideClick = (event) => {
      if (!(event.target instanceof Element) || !event.target.closest(".work-order-tracking-type-menu-wrap")) setMenuTypeId("");
    };
    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
  }, [menuTypeId]);

  const save = async (event) => {
    event.preventDefault();
    if (!name.trim() || !organizationId) return;
    setIsSaving(true);
    setError("");
    try {
      if (editingId) await updateWorkOrderTrackingType({ typeId: editingId, name });
      else await createWorkOrderTrackingType({ organizationId, kind: "cost", name });
      setName("");
      setEditingId("");
      await reload();
    } catch (saveError) {
      setError(saveError.message || "Unable to save cost type.");
    } finally {
      setIsSaving(false);
    }
  };

  const clearForm = () => {
    setEditingId("");
    setName("");
  };

  const filteredTypes = types.filter((type) => type.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  const startNewType = () => {
    clearForm();
    setMenuTypeId("");
    setIsFormOpen(true);
  };

  const editType = (type) => {
    setEditingId(type.id);
    setName(type.name);
    setMenuTypeId("");
    setIsFormOpen(true);
  };

  const removeType = (type) => {
    setMenuTypeId("");
    setDeleteType(type);
  };

  const confirmDelete = async () => {
    if (!deleteType) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteWorkOrderTrackingType({ typeId: deleteType.id });
      setDeleteType(null);
      await reload();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete cost type.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="work-order-tracking-types-page">
      <header className="work-order-tracking-types-page-header">
        <button type="button" onClick={() => onNavigate("Settings / Features / Work Orders")} aria-label="Back to Work Order feature settings"><ArrowLeft size={20} aria-hidden="true" /></button>
        <h1>Custom Work Order Cost Types</h1>
        <div className="work-order-tracking-types-page-actions"><label className="work-order-tracking-types-search"><Search size={17} aria-hidden="true" /><span className="visually-hidden">Search Cost Types</span><input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search Cost Types" />{searchTerm && <button type="button" className="work-order-tracking-types-search-clear" onClick={() => setSearchTerm("")} aria-label="Clear search"><X size={15} aria-hidden="true" /></button>}</label><button type="button" className="work-order-tracking-types-create" onClick={startNewType}><Plus size={17} aria-hidden="true" />Create Cost Type</button></div>
      </header>
      <main className="work-order-tracking-types-page-main">
        <p className="work-order-tracking-types-page-description">Manage types linked to your work order costs</p>
        {error && <div className="work-order-feature-error" role="alert">{error}</div>}
        <section className="work-order-tracking-types-list-card" aria-label="Work Order cost types">
          {filteredTypes.map((type) => (
            <div className="work-order-tracking-type-flat-row" key={type.id}>
              <span>{type.name}</span>
              <div className="work-order-tracking-type-menu-wrap">
                <button type="button" className="work-order-tracking-type-menu-button" onClick={() => setMenuTypeId(menuTypeId === type.id ? "" : type.id)} aria-label={`More options for ${type.name}`} aria-expanded={menuTypeId === type.id}><MoreVertical size={18} aria-hidden="true" /></button>
                {menuTypeId === type.id && <><div className="work-order-tracking-type-menu" role="menu"><button type="button" role="menuitem" onClick={() => editType(type)}>Edit</button><button type="button" className="is-danger" role="menuitem" onClick={() => removeType(type)}>Delete</button></div><MobileActionSheet title={type.name} onClose={closeMobileMenu}><button type="button" onClick={() => editType(type)}>Edit</button><button type="button" className="is-danger" onClick={() => removeType(type)}>Delete</button></MobileActionSheet></>}
              </div>
            </div>
          ))}
          {!filteredTypes.length && <p className="work-order-tracking-types-empty">No cost types found.</p>}
        </section>
      </main>
      {isFormOpen && <div className="work-order-time-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setIsFormOpen(false); }}><form className="work-order-time-modal work-order-tracking-type-editor" onSubmit={async (event) => { await save(event); setIsFormOpen(false); }} aria-labelledby="cost-type-editor-title"><div className="work-order-time-modal-header"><h3 id="cost-type-editor-title">{editingId ? "Edit Cost Type" : "Add Cost Type"}</h3><button type="button" onClick={() => { if (!isSaving) setIsFormOpen(false); }} aria-label="Close"><span aria-hidden="true">×</span></button></div><label>{editingId ? "Rename cost type" : "Cost type name"}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength="100" /></label><div className="work-order-time-modal-actions"><button type="button" onClick={() => { setIsFormOpen(false); clearForm(); }}>Cancel</button><button type="submit" disabled={isSaving || !name.trim()}>{editingId ? "Save" : "Add type"}</button></div></form></div>}
      {deleteType && <div className="work-order-time-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setDeleteType(null); }}><section className="work-order-delete-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="delete-cost-type-title" aria-describedby="delete-cost-type-description"><div className="work-order-delete-confirmation-body"><h3 id="delete-cost-type-title">Delete Cost Type</h3><p id="delete-cost-type-description">Are you sure you want to delete “{deleteType.name}”?</p></div><div className="work-order-delete-confirmation-actions"><button type="button" onClick={() => setDeleteType(null)} disabled={isDeleting}>Cancel</button><button type="button" className="is-danger" onClick={() => void confirmDelete()} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete"}</button></div></section></div>}
    </div>
  );
}
