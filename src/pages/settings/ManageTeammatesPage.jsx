import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Select } from "../../components/ui/Select";
import { getCurrentWorkspace } from "../../services/workspaceService";
import { listOrganizationMembers, membershipRoles, updateOrganizationMember } from "../../services/organizationService";
import { SettingsLayout } from "./SettingsLayout";
import "./ManageTeammatesPage.css";

export function ManageTeammatesPage({ onNavigate }) {
  const [organizationId, setOrganizationId] = useState("");
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentWorkspace()
      .then(async (workspace) => {
        const id = workspace.organization?.id ?? "";
        setOrganizationId(id);
        if (id) setMembers(await listOrganizationMembers(id));
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

  return <div className="settings-page manage-teammates-page">
    <header className="settings-page-header"><p className="eyebrow">Organization Settings</p><h1>Manage Teammates</h1><p>Manage members, roles, and workspace access.</p></header>
    <SettingsLayout pageName="Settings / Manage Teammates" onNavigate={onNavigate}>
      <section className="settings-content teammates-card" aria-labelledby="teammates-title">
        <div className="teammates-card-header"><div><h2 id="teammates-title">Teammates</h2><p>Active and invited members of this organization.</p></div><button type="button" className="invite-add-button" onClick={() => onNavigate("Settings / Invite Users")}><Plus size={16} /> Invite users</button></div>
        {isLoading && <p className="teammates-state">Loading teammates...</p>}
        {!isLoading && error && <p className="teammates-error" role="alert">{error}</p>}
        {!isLoading && !error && !members.length && <p className="teammates-state">No teammates found.</p>}
        {!isLoading && !error && members.length > 0 && <div className="teammates-list">{members.map((member) => {
          const name = [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || "Unnamed teammate";
          return <div className="teammate-row" key={`${member.organization_id}-${member.user_id}`}>
            <div className="teammate-identity"><Avatar className="teammate-avatar" src={member.profile?.avatar_url?.startsWith("http") ? member.profile.avatar_url : ""} firstName={member.profile?.first_name} lastName={member.profile?.last_name} alt={name} /><div><strong>{name}</strong><small>{member.status === "active" ? "Active member" : member.status}</small></div></div>
            <Select value={member.role} onChange={(value) => updateMember(member.user_id, { role: value })} ariaLabel={`Role for ${name}`} options={membershipRoles} />
            <button type="button" className="teammate-status-button" onClick={() => updateMember(member.user_id, { status: member.status === "suspended" ? "active" : "suspended" })}>{member.status === "suspended" ? "Reactivate" : "Suspend"}</button>
          </div>;
        })}</div>}
      </section>
    </SettingsLayout>
  </div>;
}
