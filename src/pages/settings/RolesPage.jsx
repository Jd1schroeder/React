import { MoreVertical, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "../../components/ui/LoadingState";
import { Select } from "../../components/ui/Select";
import { getCurrentWorkspace } from "../../services/workspaceService";
import { createCustomOrganizationRole, deleteCustomOrganizationRole, listCustomOrganizationRoles, listOrganizationMembers, listOrganizationRoles, organizationRoleCatalog, updateCustomOrganizationRole } from "../../services/organizationService";
import { getBaselinePermissions, permissionCatalog, permissionScopeOptions } from "../../services/permissionCatalog";
import { useDismissibleMenu } from "../../hooks/useDismissibleMenu";
import { SettingsLayout } from "./SettingsLayout";
import { TeammateTabs } from "./TeammateTabs";
import "./RolesPage.css";

const emptyForm = { name: "", description: "", baselineRoleKey: "technician", sourceRoleName: "", permissions: {} };
const permissionGroups = permissionCatalog.reduce((groups, permission) => {
  groups[permission.module] ??= [];
  groups[permission.module].push(permission);
  return groups;
}, {});

function RoleRowActions({ role, isCustom, onView, onCopy, onEdit, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useDismissibleMenu(isOpen, () => setIsOpen(false));
  const close = () => setIsOpen(false);
  return <div ref={rootRef} className="role-row-actions">
    <button type="button" className="role-row-action" aria-label={`Actions for ${role.name}`} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}><MoreVertical size={18} /></button>
    {isOpen && <div className="role-row-menu" role="menu" aria-label={`Actions for ${role.name}`}>
      <button type="button" role="menuitem" onClick={() => { close(); onView(role); }}>View role</button>
      <button type="button" role="menuitem" onClick={() => { close(); onCopy(role); }}>Copy to new role</button>
      {isCustom && <button type="button" role="menuitem" onClick={() => { close(); onEdit(role); }}>Edit role</button>}
      {isCustom && <button type="button" role="menuitem" className="is-danger" onClick={() => { close(); onDelete(role); }}>Delete role</button>}
    </div>}
  </div>;
}

export function RolesPage({ onNavigate }) {
  const [organizationId, setOrganizationId] = useState("");
  const [customRoles, setCustomRoles] = useState([]);
  const [organizationRoles, setOrganizationRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [rolePendingDelete, setRolePendingDelete] = useState(null);
  const [replacementRoleId, setReplacementRoleId] = useState("");

  useEffect(() => {
    getCurrentWorkspace()
      .then(async (workspace) => {
        const id = workspace.organization?.id ?? "";
        setOrganizationId(id);
        if (id) {
          const [custom, all, memberRows] = await Promise.all([listCustomOrganizationRoles(id), listOrganizationRoles(id), listOrganizationMembers(id)]);
          setCustomRoles(custom);
          setOrganizationRoles(all);
          setMembers(memberRows);
          const requestedEditRoleId = new URLSearchParams(window.location.search).get("edit");
          const requestedRole = custom.find((role) => role.id === requestedEditRoleId);
          if (requestedRole) {
            setEditingRoleId(requestedRole.id);
            setForm({ name: requestedRole.name, description: requestedRole.description ?? "", baselineRoleKey: "", permissions: requestedRole.permissions ?? {} });
            setIsEditing(true);
          } else {
            const requestedCopyRoleId = new URLSearchParams(window.location.search).get("copy");
            const storedRole = custom.find((role) => role.id === requestedCopyRoleId) ?? all.find((role) => role.id === requestedCopyRoleId);
            const catalogRole = organizationRoleCatalog.find((role) => role.key === storedRole?.system_key);
            const sourceRole = storedRole?.is_system && catalogRole ? { ...catalogRole, ...storedRole } : storedRole;
            if (sourceRole) {
              const baselineRoleKey = sourceRole.key ?? sourceRole.system_key ?? emptyForm.baselineRoleKey;
              setEditingRoleId(null);
              setForm({ name: `${sourceRole.name} copy`, description: sourceRole.description ?? "", baselineRoleKey, sourceRoleName: sourceRole.name, permissions: sourceRole.permissions ?? getBaselinePermissions(baselineRoleKey) });
              setIsEditing(true);
            }
          }
        }
      })
      .catch((loadError) => setError(loadError.message || "Unable to load roles."))
      .finally(() => setIsLoading(false));
  }, []);

  const searchQuery = search.trim().toLowerCase();
  const filteredBuiltInRoles = useMemo(() => {
    if (!searchQuery) return organizationRoleCatalog;
    return organizationRoleCatalog.filter((role) => `${role.name} ${role.description}`.toLowerCase().includes(searchQuery));
  }, [searchQuery]);
  const filteredCustomRoles = useMemo(() => {
    const roles = searchQuery
      ? customRoles.filter((role) => `${role.name} ${role.description ?? ""}`.toLowerCase().includes(searchQuery))
      : customRoles;
    return [...roles].sort((left, right) => left.name.localeCompare(right.name));
  }, [customRoles, searchQuery]);
  const roleAssignmentCounts = useMemo(() => members.reduce((counts, member) => {
    if (member.role_id) counts[member.role_id] = (counts[member.role_id] ?? 0) + 1;
    return counts;
  }, {}), [members]);
  const assignedUserCount = (role) => {
    const roleId = role.id ?? organizationRoles.find((item) => item.system_key === role.key)?.id;
    return roleId ? roleAssignmentCounts[roleId] ?? 0 : 0;
  };
  const openRoleDetails = (role) => {
    const roleId = role.id ?? organizationRoles.find((item) => item.system_key === role.key)?.id;
    if (roleId) onNavigate(`/settings/teammates/roles/${encodeURIComponent(roleId)}`);
  };

  const openCreate = (sourceRole = null) => {
    setEditingRoleId(null);
    const baselineRoleKey = sourceRole?.key ?? emptyForm.baselineRoleKey;
    setForm({ name: sourceRole ? `${sourceRole.name} copy` : "", description: sourceRole?.description ?? "", baselineRoleKey, sourceRoleName: sourceRole?.name ?? "", permissions: sourceRole?.permissions ?? getBaselinePermissions(baselineRoleKey) });
    setError("");
    setIsEditing(true);
  };

  const openEdit = (role) => {
    setEditingRoleId(role.id);
    setForm({ name: role.name, description: role.description ?? "", baselineRoleKey: "", permissions: role.permissions ?? {} });
    setError("");
    setIsEditing(true);
  };

  const closeEditor = () => { if (!isSaving) setIsEditing(false); };
  const updateForm = (updates) => setForm((current) => ({ ...current, ...updates }));
  const selectBaseline = (baselineRoleKey) => updateForm({ baselineRoleKey, permissions: getBaselinePermissions(baselineRoleKey) });
  const setPermission = (permissionKey, scope) => setForm((current) => {
    const permissions = { ...current.permissions };
    if (scope === "none") delete permissions[permissionKey];
    else permissions[permissionKey] = scope;
    return { ...current, permissions };
  });

  const saveRole = async (event) => {
    event.preventDefault();
    if (!organizationId || !form.name.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      const payload = { organizationId, name: form.name, description: form.description, sourceRoleName: form.sourceRoleName, permissions: form.permissions };
      const role = editingRoleId
        ? await updateCustomOrganizationRole({ ...payload, roleId: editingRoleId })
        : await createCustomOrganizationRole({ ...payload, baselineRoleKey: form.baselineRoleKey });
      setCustomRoles((current) => {
        const next = editingRoleId ? current.map((item) => item.id === role.id ? role : item) : [...current, role];
        return next.sort((left, right) => left.name.localeCompare(right.name));
      });
      setOrganizationRoles((current) => editingRoleId ? current.map((item) => item.id === role.id ? { ...item, ...role } : item) : [...current, role]);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError.message || "Unable to save the role.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!rolePendingDelete || !replacementRoleId) return;
    setIsSaving(true);
    setError("");
    try {
      await deleteCustomOrganizationRole({ roleId: rolePendingDelete.id, replacementRoleId });
      setCustomRoles((current) => current.filter((role) => role.id !== rolePendingDelete.id));
      setOrganizationRoles((current) => current.filter((role) => role.id !== rolePendingDelete.id));
      setRolePendingDelete(null);
      setReplacementRoleId("");
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete the role.");
    } finally {
      setIsSaving(false);
    }
  };

  return <div className="settings-page roles-page">
    <header className="settings-page-header"><p className="eyebrow">Organization Settings</p><h1>Manage Teammates</h1><p>Manage members, roles, and workspace access.</p></header>
    <SettingsLayout pageName="Settings / Manage Teammates" onNavigate={onNavigate}>
      <section className="settings-content roles-card" aria-label="Manage teammates">
        <div className="roles-toolbar"><p className="roles-context">Define the roles available to people in this organization.</p><div className="roles-toolbar-actions"><label className="roles-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles" aria-label="Search roles" />{search && <button type="button" className="roles-clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}</label><button type="button" className="roles-primary-action" onClick={openCreate} disabled={isEditing}><Plus size={16} /> New role</button></div></div>
        <TeammateTabs active="roles" onNavigate={onNavigate} />
        {isEditing && <form className="role-create-form" onSubmit={saveRole}>
          <div className="role-create-heading"><div><h3>{editingRoleId ? "Edit custom role" : "Create custom role"}</h3><p>Choose a baseline, then tailor access for this organization.</p></div><button type="button" className="role-close-button" onClick={closeEditor} aria-label="Cancel role editing"><X size={18} /></button></div>
          {!editingRoleId && <label><span>Create from</span><Select ariaLabel="Create from role" value={form.baselineRoleKey} options={organizationRoleCatalog.map((role) => ({ value: role.key, label: role.name }))} onChange={selectBaseline} /></label>}
          <label><span>Name</span><input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} maxLength={80} required /></label>
          <label><span>Description</span><textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} rows={3} maxLength={240} /></label>
          <div className="permission-editor"><div className="permission-editor-heading"><h4>Permissions</h4><p>Use the narrowest scope that matches the role.</p></div>{Object.entries(permissionGroups).map(([module, permissions]) => <section className="permission-group" key={module}><h5>{module}</h5>{permissions.map((permission) => <div className="permission-row" key={permission.key}><div><strong>{permission.label}</strong><p>{permission.description}</p></div><Select ariaLabel={`${permission.label} scope`} value={form.permissions[permission.key] ?? "none"} options={[{ value: "none", label: "No access" }, ...(permission.actionOnly ? [{ value: "any", label: "Allowed" }] : permissionScopeOptions.filter((option) => permission.scopes.includes(option.value)))]} onChange={(scope) => setPermission(permission.key, scope)} /></div>)}</section>)}</div>
          <div className="role-create-actions"><button type="button" className="role-secondary-action" onClick={closeEditor}>Cancel</button><button type="submit" className="roles-primary-action" disabled={isSaving || !form.name.trim()}>{isSaving ? "Saving..." : editingRoleId ? "Save changes" : "Create role"}</button></div>
        </form>}
        {error && <p className="roles-error" role="alert">{error}</p>}
        {rolePendingDelete && <div className="role-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setRolePendingDelete(null); }}><section className="role-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-role-title"><h3 id="delete-role-title">Delete {rolePendingDelete.name}?</h3><p>Users assigned to this role must be reassigned before the role can be deleted.</p><Select ariaLabel="Replacement role" value={replacementRoleId} placeholder="Select replacement role" options={organizationRoles.filter((role) => role.id !== rolePendingDelete.id).map((role) => ({ value: role.id, label: role.name }))} onChange={setReplacementRoleId} /><div className="role-create-actions"><button type="button" className="role-secondary-action" onClick={() => setRolePendingDelete(null)} disabled={isSaving}>Cancel</button><button type="button" className="role-danger-action" onClick={confirmDelete} disabled={isSaving || !replacementRoleId}>{isSaving ? "Deleting..." : "Delete role"}</button></div></section></div>}
        <section className="roles-section" aria-labelledby="default-roles-title"><h3 id="default-roles-title">Built-in roles</h3>{filteredBuiltInRoles.length > 0 && <div className="roles-table"><div className="roles-table-row roles-table-header"><span>Name</span><span>Users assigned</span><span>Description</span><span aria-hidden="true" /></div>{filteredBuiltInRoles.map((role) => <div className="roles-table-row role-list-row" key={role.key}><button type="button" className="role-name-link" onClick={() => openRoleDetails(role)}>{role.name}</button><span>{assignedUserCount(role)}</span><span>{role.description}</span><RoleRowActions role={role} onView={openRoleDetails} onCopy={openCreate} /></div>)}</div>}{searchQuery && !filteredBuiltInRoles.length && <p className="roles-state">No built-in roles match your search.</p>}</section>
        <section className="roles-section" aria-labelledby="custom-roles-title"><h3 id="custom-roles-title">Custom roles</h3>{isLoading && <LoadingState message="Loading custom roles..." />}{!isLoading && !filteredCustomRoles.length && <p className="roles-state">{searchQuery ? "No custom roles match your search." : "No custom roles available."}</p>}{!isLoading && filteredCustomRoles.length > 0 && <div className="roles-table">{filteredCustomRoles.map((role) => <div className="roles-table-row custom-role-row" key={role.id}><button type="button" className="role-name-link" onClick={() => openRoleDetails(role)}>{role.name}</button><span>{assignedUserCount(role)}</span><span>{role.description || "No description provided."}</span><RoleRowActions role={role} isCustom onView={openRoleDetails} onCopy={openCreate} onEdit={openEdit} onDelete={(pendingRole) => { setRolePendingDelete(pendingRole); setReplacementRoleId(organizationRoles.find((item) => item.is_system)?.id ?? ""); }} /></div>)}</div>}</section>
      </section>
    </SettingsLayout>
  </div>;
}
