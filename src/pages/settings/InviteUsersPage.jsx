import { useEffect, useState } from "react";
import { AlertTriangle, Link2, Plus, X } from "lucide-react";
import { Select } from "../../components/ui/Select";
import { createOrganizationInvitation, listOrganizationInvitations, revokeOrganizationInvitation } from "../../services/invitationService";
import { listOrganizationRoles } from "../../services/organizationService";
import { getCurrentWorkspace } from "../../services/workspaceService";
import { SettingsLayout } from "./SettingsLayout";
import "./InviteUsersPage.css";

export function InviteUsersPage({ onNavigate }) {
  const [invites, setInvites] = useState([{ name: "", contact: "", role: "member", roleId: "" }]);
  const [notifyInvites, setNotifyInvites] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [organizationId, setOrganizationId] = useState("");
  const [roles, setRoles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const canSend = invites.every((invite) => organizationId && invite.name.trim() && invite.contact.trim() && invite.roleId);

  useEffect(() => {
    getCurrentWorkspace().then(async (workspace) => {
      const id = workspace.organization?.id ?? "";
      setOrganizationId(id);
      if (id) {
        const [invitationRows, roleRows] = await Promise.all([listOrganizationInvitations(id), listOrganizationRoles(id)]);
        setInvitations(invitationRows);
        setRoles(roleRows);
        setInvites([{ name: "", contact: "", role: "member", roleId: roleRows.find((role) => role.system_key === "requester")?.id ?? "" }]);
      }
    }).catch(() => setOrganizationId(""));
  }, []);

  const updateInvite = (index, field, value) => setInvites((current) => current.map((invite, inviteIndex) => inviteIndex === index ? { ...invite, [field]: value } : invite));
  const removeInvite = (index) => setInvites((current) => current.length === 1 ? current : current.filter((_, inviteIndex) => inviteIndex !== index));
  const copyInviteLink = async () => {
    if (navigator.clipboard) await navigator.clipboard.writeText(inviteLink || `${window.location.origin}/signup`);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  };

  const sendInvites = async () => {
    setIsSending(true);
    setSendError("");
    try {
      const createdInvites = await Promise.all(invites.map((invite) => createOrganizationInvitation({
        organizationId,
        contactType: invite.contact.includes("@") ? "email" : "phone",
        contactValue: invite.contact,
        firstName: invite.name.trim().split(/\s+/)[0],
        lastName: invite.name.trim().split(/\s+/).slice(1).join(" "),
        role: invite.role,
        roleId: invite.roleId,
      })));
      setInviteLink(createdInvites[0]?.inviteLink ?? "");
      setInvitations((current) => [...createdInvites, ...current]);
      setInvites([{ name: "", contact: "", role: "member", roleId: roles.find((role) => role.system_key === "requester")?.id ?? "" }]);
    } catch (error) {
      setSendError(error.message || "Unable to create the invitations.");
    } finally {
      setIsSending(false);
    }
  };

  const revokeInvitation = async (invitationId) => {
    try {
      await revokeOrganizationInvitation(invitationId);
      setInvitations((current) => current.map((item) => item.id === invitationId ? { ...item, status: "revoked" } : item));
    } catch (error) {
      setSendError(error.message || "Unable to revoke the invitation.");
    }
  };

  return <div className="settings-page invite-users-page">
    <header className="settings-page-header"><p className="eyebrow">Personal Settings</p><h1>Invite Users</h1><p>Invite teammates to collaborate in this workspace.</p></header>
    <SettingsLayout pageName="Settings / Invite Users" onNavigate={onNavigate} className="invite-users-layout">
      <section className="settings-content invite-card">
        <div className="invite-table-header"><span>Full Name</span><span>Mobile Phone Number or Email</span><span>Role</span><span aria-hidden="true" /></div>
        <div className="invite-rows">{invites.map((invite, index) => <div className="invite-row" key={index}>
          <input value={invite.name} onChange={(event) => updateInvite(index, "name", event.target.value)} placeholder="Full name" aria-label={`Full name for invite ${index + 1}`} />
          <input value={invite.contact} onChange={(event) => updateInvite(index, "contact", event.target.value)} placeholder="Mobile phone number or email" aria-label={`Phone or email for invite ${index + 1}`} />
          <Select className="invite-account-type" value={invite.roleId} onChange={(value) => updateInvite(index, "roleId", value)} ariaLabel={`Role for invite ${index + 1}`} options={roles.map((role) => ({ value: role.id, label: role.name }))} placeholder="Select role" />
          <button type="button" className="invite-remove" onClick={() => removeInvite(index)} aria-label={`Remove invite ${index + 1}`}><X size={18} /></button>
        </div>)}</div>
        <button type="button" className="invite-add-button" onClick={() => setInvites((current) => [...current, { name: "", contact: "", role: "member", roleId: roles.find((role) => role.system_key === "requester")?.id ?? "" }])}><Plus size={16} /> Add another</button>
        <div className="invite-actions">
          <label className="invite-notify"><input type="checkbox" checked={notifyInvites} onChange={(event) => setNotifyInvites(event.target.checked)} /><span className="invite-switch" aria-hidden="true" /><span>Notify invitees</span></label>
          {!notifyInvites && <p className="invite-warning"><AlertTriangle size={18} /> Users will be added to the organization, but won&apos;t be notified by email or SMS.</p>}
          <button type="button" className="invite-send-button" disabled={!canSend || isSending} onClick={sendInvites}>{isSending ? "Creating invites..." : "Send Invite"}</button>
          <button type="button" className="invite-link-button" onClick={copyInviteLink}><Link2 size={17} /> {linkCopied ? "Invite link copied" : "Get an invite link to share"}</button>
        </div>
        {sendError && <p className="invite-error" role="alert">{sendError}</p>}
        {invitations.length > 0 && <div className="invitation-list"><h2>Recent invitations</h2>{invitations.map((invitation) => <div className="invitation-row" key={invitation.id}><div><strong>{[invitation.first_name, invitation.last_name].filter(Boolean).join(" ") || invitation.contact_value}</strong><small>{invitation.contact_type} Ã‚Â· {invitation.role} Ã‚Â· {invitation.status}</small></div>{invitation.status === "invited" && <button type="button" onClick={() => revokeInvitation(invitation.id)}>Revoke</button>}</div>)}</div>}
      </section>
    </SettingsLayout>
  </div>;
}
