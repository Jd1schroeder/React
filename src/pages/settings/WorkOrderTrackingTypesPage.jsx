import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreVertical, Plus, X } from "lucide-react";
import { useWorkspace } from "../../components/layout/useWorkspace";
import { HeaderSearch } from "../../components/layout/PanelLayout";
import { Button } from "../../components/ui/Button";
import { MobileActionSheet } from "../../components/ui/MobileActionSheet";
import { createWorkOrderTrackingType, deleteWorkOrderTrackingType, listWorkOrderTrackingTypes, updateWorkOrderTrackingType } from "../../services/workOrderTimeService";
import "./WorkOrderFeatureSettingsPage.css";

export function WorkOrderTrackingTypesPage({ onNavigate, kind = "cost" }) {
  const workspace = useWorkspace();
  const organizationId = workspace.organization?.id;
  const isTime = kind === "time";
  const typeLabel = isTime ? "Time" : "Cost";
  const typeLabelLower = typeLabel.toLowerCase();
  const pageTitle = `Custom Work Order ${typeLabel} Types`;
  const [types, setTypes] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [menuTypeId, setMenuTypeId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const formCloseTimerRef = useRef(null);
  const closeMobileMenu = useCallback(() => setMenuTypeId(""), []);

  useEffect(() => () => window.clearTimeout(formCloseTimerRef.current), []);

  const reload = useCallback(async () => {
    if (!organizationId) return;
    try {
      setTypes(await listWorkOrderTrackingTypes({ organizationId, kind }));
    } catch (loadError) {
      setError(loadError.message || `Unable to load ${typeLabelLower} types.`);
    }
  }, [organizationId, kind, typeLabelLower]);

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
      else await createWorkOrderTrackingType({ organizationId, kind, name });
      setName("");
      setEditingId("");
      await reload();
    } catch (saveError) {
      setError(saveError.message || `Unable to save ${typeLabelLower} type.`);
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
    setIsFormClosing(false);
    setIsFormOpen(true);
  };

  const editType = (type) => {
    setEditingId(type.id);
    setName(type.name);
    setMenuTypeId("");
    setIsFormClosing(false);
    setIsFormOpen(true);
  };

  const closeForm = (force = false) => {
    if (isFormClosing || (!force && isSaving)) return;
    setIsFormClosing(true);
    formCloseTimerRef.current = window.setTimeout(() => {
      setIsFormOpen(false);
      setIsFormClosing(false);
      clearForm();
    }, 280);
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
      setError(deleteError.message || `Unable to delete ${typeLabelLower} type.`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="work-order-tracking-types-page">
      <header className="work-order-tracking-types-page-header">
        <button type="button" onClick={() => onNavigate("Settings / Features / Work Orders")} aria-label="Back to Work Order feature settings"><ArrowLeft size={20} aria-hidden="true" /></button>
        <h1>{pageTitle}</h1>
        <div className="work-order-tracking-types-page-actions"><HeaderSearch value={searchTerm} onChange={setSearchTerm} placeholder={`Search ${typeLabel} Types`} ariaLabel={`Search ${typeLabel} Types`} /><Button onClick={startNewType}><Plus size={15} /> {`Create ${typeLabel} Type`}</Button></div>
      </header>
      <main className="work-order-tracking-types-page-main">
        <p className="work-order-tracking-types-page-description">Manage types linked to your work order {typeLabelLower}s</p>
        {error && <div className="work-order-feature-error" role="alert">{error}</div>}
        <section className="work-order-tracking-types-list-card" aria-label={`Work Order ${typeLabelLower} types`}>
          {filteredTypes.map((type) => (
            <div className="work-order-tracking-type-flat-row" key={type.id}>
              <span>{type.name}</span>
              <div className="work-order-tracking-type-menu-wrap">
                <button type="button" className="work-order-tracking-type-menu-button" onClick={() => setMenuTypeId(menuTypeId === type.id ? "" : type.id)} aria-label={`More options for ${type.name}`} aria-expanded={menuTypeId === type.id}><MoreVertical size={18} aria-hidden="true" /></button>
                {menuTypeId === type.id && <><div className="work-order-tracking-type-menu" role="menu"><button type="button" role="menuitem" onClick={() => editType(type)}>Edit {typeLabel} Type</button><button type="button" className="is-danger" role="menuitem" onClick={() => removeType(type)}>Delete {typeLabel} Type</button></div><MobileActionSheet title={type.name} onClose={closeMobileMenu}><button type="button" onClick={() => editType(type)}>Edit {typeLabel} Type</button><button type="button" className="is-danger" onClick={() => removeType(type)}>Delete {typeLabel} Type</button></MobileActionSheet></>}
              </div>
            </div>
          ))}
          {!filteredTypes.length && <p className="work-order-tracking-types-empty">No {typeLabelLower} types found.</p>}
        </section>
      </main>
      {isFormOpen && <div className={`work-order-time-modal-backdrop${isFormClosing ? " is-closing" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><form className={`work-order-time-modal work-order-tracking-type-editor${isFormClosing ? " is-closing" : ""}`} onSubmit={async (event) => { await save(event); closeForm(true); }} aria-labelledby="tracking-type-editor-title"><div className="work-order-time-modal-header"><h3 id="tracking-type-editor-title">{editingId ? `Edit ${typeLabel} Type` : `Add ${typeLabel} Type`}</h3><button type="button" onClick={() => closeForm()} aria-label="Close"><X size={20} strokeWidth={2} aria-hidden="true" /></button></div><label>{editingId ? `Rename ${typeLabelLower} type` : `${typeLabel} type name`}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength="100" /></label><div className="work-order-time-modal-actions"><button type="button" onClick={() => closeForm()}>Cancel</button><button type="submit" disabled={isSaving || !name.trim()}>{editingId ? "Save" : `Add ${typeLabelLower} type`}</button></div></form></div>}
      {deleteType && <div className="work-order-time-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setDeleteType(null); }}><section className="work-order-delete-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="delete-tracking-type-title" aria-describedby="delete-tracking-type-description"><div className="work-order-delete-confirmation-body"><h3 id="delete-tracking-type-title">Delete {typeLabel} Type</h3><p id="delete-tracking-type-description">Are you sure you want to delete “{deleteType.name}”?</p></div><div className="work-order-delete-confirmation-actions"><button type="button" onClick={() => setDeleteType(null)} disabled={isDeleting}>Cancel</button><button type="button" className="is-danger" onClick={() => void confirmDelete()} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete"}</button></div></section></div>}
    </div>
  );
}
