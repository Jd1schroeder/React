import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { getCurrentWorkspace } from "../../services/workspaceService";
import { assignOrganizationMemberRole, listOrganizationMembers, listOrganizationRoles, updateOrganizationMember } from "../../services/organizationService";
import { SettingsLayout } from "./SettingsLayout";
import { TeammateTabs } from "./TeammateTabs";
import "./ManageTeammatesPage.css";

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
          const [memberRows, roleRows] = await Promise.all([listOrganizationMembers(id), listOrganizationRoles(id)]);
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

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const name = [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ");
      const role = member.organization_roles?.name ?? member.role ?? "";
      return `${name} ${member.email ?? ""} ${role} ${member.status}`.toLowerCase().includes(query);
    });
  }, [members, search]);

  return <div className="settings-page manage-teammates-page">
    <header className="settings-page-header"><p className="eyebrow">Organization Settings</p><h1>Manage Teammates</h1><p>Manage members, roles, and workspace access.</p></header>
    <SettingsLayout pageName="Settings / Manage Teammates" onNavigate={onNavigate}>
      <section className="settings-content teammates-card" aria-labelledby="teammates-title">
        <div className="teammates-card-header"><div><h2 id="teammates-title">Teammates</h2><p>Active and invited members of this organization.</p></div><div className="teammates-card-actions"><label className="teammates-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" aria-label="Search users" />{search && <button type="button" className="teammates-clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}</label><Button onClick={() => onNavigate("Settings / Invite Users")}><Plus size={15} /> Invite users</Button></div></div>
        <TeammateTabs active="users" onNavigate={onNavigate} />
        {isLoading && <p className="teammates-state">Loading teammates...</p>}
        {!isLoading && error && <p className="teammates-error" role="alert">{error}</p>}
        {!isLoading && !error && !members.length && <p className="teammates-state">No teammates found.</p>}
        {!isLoading && !error && members.length > 0 && !filteredMembers.length && <p className="teammates-state">No teammates match your search.</p>}
        {!isLoading && !error && filteredMembers.length > 0 && <div className="teammates-list">{filteredMembers.map((member) => {
          const name = [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || "Unnamed teammate";
          return <div className="teammate-row" key={`${member.organization_id}-${member.user_id}`}>
            <div className="teammate-identity"><Avatar className="teammate-avatar" src={member.profile?.avatar_url?.startsWith("http") ? member.profile.avatar_url : ""} firstName={member.profile?.first_name} lastName={member.profile?.last_name} alt={name} /><div><strong>{name}</strong><small>{member.status === "active" ? "Active member" : member.status}</small></div></div>
            <Select value={member.role_id ?? ""} onChange={(value) => assignRole(member.user_id, value)} ariaLabel={`Role for ${name}`} options={roles.map((role) => ({ value: role.id, label: role.name }))} placeholder="Select role" />
            <button type="button" className="teammate-status-button" onClick={() => updateMember(member.user_id, { status: member.status === "suspended" ? "active" : "suspended" })}>{member.status === "suspended" ? "Reactivate" : "Suspend"}</button>
          </div>;
        })}</div>}
      </section>
    </SettingsLayout>
  </div>;
}
