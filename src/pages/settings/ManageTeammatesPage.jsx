import { useEffect, useMemo, useState } from "react";
import { MoreVertical, Plus, Search, X } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { LoadingState } from "../../components/ui/LoadingState";
import { Select } from "../../components/ui/Select";
import { useDismissibleMenu } from "../../hooks/useDismissibleMenu";
import { getCurrentWorkspace } from "../../services/workspaceService";
import { updatePendingOrganizationInvitationRole } from "../../services/invitationService";
import { assignOrganizationMemberRole, listOrganizationMembers, listOrganizationRoles, updateOrganizationMember } from "../../services/organizationService";
import { SettingsLayout } from "./SettingsLayout";
import { TeammateTabs } from "./TeammateTabs";
import "./ManageTeammatesPage.css";

function TeammateRowActions({ member, name, onNavigate, onSuspend }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useDismissibleMenu(isOpen, () => setIsOpen(false));
  const close = () => setIsOpen(false);

  return <div ref={rootRef} className="teammate-row-actions">
    <button type="button" className="teammate-row-action" aria-label={`Actions for ${name}`} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}><MoreVertical size={18} /></button>
    {isOpen && <div className="teammate-row-menu" role="menu" aria-label={`Actions for ${name}`}>
      {member.user_id && <button type="button" role="menuitem" onClick={() => { close(); onNavigate(`/users/profile/${encodeURIComponent(member.user_id)}`); }}>View profile</button>}
      {!member.invitation_id && <button type="button" role="menuitem" className={member.status === "suspended" ? "" : "is-danger"} onClick={() => { close(); onSuspend(member.user_id, { status: member.status === "suspended" ? "active" : "suspended" }); }}>{member.status === "suspended" ? "Reactivate" : "Suspend"}</button>}
    </div>}
  </div>;
}

export function ManageTeammatesPage({ onNavigate }) {
  const [organizationId, setOrganizationId] = useState("");
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getCurrentWorkspace()
      .then(async (workspace) => {
        const id = workspace.organization?.id ?? "";
        setOrganizationId(id);
        if (id) {
          const [memberRows, roleRows] = await Promise.all([listOrganizationMembers(id, { includePendingInvitations: true }), listOrganizationRoles(id)]);
          setMembers(memberRows);
          setRoles(roleRows);
        }
      })
      .catch((loadError) => setError(loadError.message || "Unable to load teammates."))
      .finally(() => setIsLoading(false));
  }, []);

  const updateMember = async (userId, updates) => {
    try {
      const updated = await updateOrganizationMember({ organizationId, userId, ...updates });
      setMembers((current) => current.map((member) => member.user_id === userId ? { ...member, ...updated } : member));
    } catch (updateError) {
      setError(updateError.message || "Unable to update this teammate.");
    }
  };

  const assignRole = async (userId, roleId) => {
    try {
      const updated = await assignOrganizationMemberRole({ organizationId, userId, roleId });
      setMembers((current) => current.map((member) => member.user_id === userId ? { ...member, ...updated } : member));
    } catch (updateError) {
      setError(updateError.message || "Unable to assign this role.");
    }
  };

  const assignPendingRole = async (member, roleId) => {
    try {
      await updatePendingOrganizationInvitationRole(member.invitation_id, roleId);
      const assignedRole = roles.find((role) => role.id === roleId);
      setMembers((current) => current.map((item) => item.invitation_id === member.invitation_id
        ? { ...item, role_id: roleId, role: assignedRole?.system_key === "organization_admin" ? "admin" : "member", organization_roles: assignedRole }
        : item));
    } catch (updateError) {
      setError(updateError.message || "Unable to assign this role.");
    }
  };

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const name = [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ");
      const role = member.organization_roles?.name ?? member.role ?? "";
      return `${name} ${member.email ?? ""} ${role} ${member.status}`.toLowerCase().includes(query);
    });
  }, [members, search]);

  const memberColumns = [
    { key: "name", label: "Full Name", width: "44%", sortValue: (member) => [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || member.contact_value || "Unnamed teammate", render: (member) => {
      const name = [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || member.contact_value || "Unnamed teammate";
      return <div className="teammate-identity"><Avatar className="teammate-avatar" src={member.profile?.avatar_url?.startsWith("http") ? member.profile.avatar_url : ""} firstName={member.profile?.first_name} lastName={member.profile?.last_name} alt={name} /><div>{member.user_id ? <button type="button" className="teammate-profile-link" onClick={() => onNavigate(`/users/profile/${encodeURIComponent(member.user_id)}`)}>{name}</button> : <strong>{name}</strong>}</div></div>;
    } },
    { key: "role", label: "Role", width: "28%", sortValue: (member) => member.organization_roles?.name ?? member.role ?? "", render: (member) => member.invitation_id ? <Select value={member.role_id ?? ""} onChange={(value) => assignPendingRole(member, value)} ariaLabel={`Role for ${[member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || member.contact_value || "teammate"}`} options={roles.map((role) => ({ value: role.id, label: role.name }))} placeholder="Select role" /> : <Select value={member.role_id ?? ""} onChange={(value) => assignRole(member.user_id, value)} ariaLabel={`Role for ${[member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || "teammate"}`} options={roles.map((role) => ({ value: role.id, label: role.name }))} placeholder="Select role" /> },
    { key: "status", label: "Status", width: "20%", sortValue: (member) => member.status ?? "", render: (member) => member.invitation_id ? "Invitation pending" : member.status === "active" ? "Active" : member.status },
    { key: "actions", label: "", width: "48px", sortable: false, render: (member) => <TeammateRowActions member={member} name={[member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || member.contact_value || "Unnamed teammate"} onNavigate={onNavigate} onSuspend={updateMember} /> },
  ];

  return <div className="settings-page manage-teammates-page">
    <header className="settings-page-header"><p className="eyebrow">Organization Settings</p><h1>Manage Teammates</h1><p>Manage members, roles, and workspace access.</p></header>
    <SettingsLayout pageName="Settings / Manage Teammates" onNavigate={onNavigate}>
      <section className="settings-content teammates-card" aria-label="Manage teammates">
        <div className="teammates-card-header"><p className="teammates-context">Active and invited members of this organization.</p><div className="teammates-card-actions"><label className="teammates-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" aria-label="Search users" />{search && <button type="button" className="teammates-clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}</label><Button onClick={() => onNavigate("Settings / Invite Users")}><Plus size={15} /> Invite users</Button></div></div>
        <TeammateTabs active="users" onNavigate={onNavigate} />
        {isLoading && <LoadingState message="Loading users..." />}
        {!isLoading && error && <p className="teammates-error" role="alert">{error}</p>}
        {!isLoading && !error && !members.length && <p className="teammates-state">No teammates found.</p>}
        {!isLoading && !error && members.length > 0 && !filteredMembers.length && <p className="teammates-state">No teammates match your search.</p>}
        {!isLoading && !error && filteredMembers.length > 0 && <><div className="teammates-heading">My Teammates ({filteredMembers.length})</div><section className="teammates-table"><DataTable ariaLabel="Teammates" columns={memberColumns} rows={filteredMembers} rowKey={(member) => `${member.organization_id}-${member.user_id ?? member.invitation_id}`} initialSortKey="name" emptyState="No teammates found." /></section></>}
      </section>
    </SettingsLayout>
  </div>;
}
