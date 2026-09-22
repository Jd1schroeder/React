import {
  AlertTriangle,
  Bell,
  Building2,
  Camera,
  CreditCard,
  Gauge,
  Info,
  Link2,
  LockKeyhole,
  LogOut,
  Mail,
  Monitor,
  Palette,
  Pencil,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Select } from "../components/ui/Select";
import { Avatar } from "../components/ui/Avatar";
import flagUnitedStates from "../assets/flags/us.svg";
import { supabase } from "../lib/supabase";
import { createOrganizationInvitation, listOrganizationInvitations, revokeOrganizationInvitation } from "../services/invitationService";
import { listOrganizationMembers, membershipRoles, updateOrganizationMember } from "../services/organizationService";
import { updateAuthContact, updateProfile, updateUserPreferences, uploadAvatar } from "../services/profileService";
import { getCurrentWorkspace } from "../services/workspaceService";
import { useWorkspace } from "../components/layout/useWorkspace";
import "./SettingsPage.css";

const settings = {
  "Settings / General": {
    group: "Organization Settings",
    title: "General",
    description: "Manage the basic details and defaults for this workspace.",
    icon: Building2,
  },
  "Settings / Features": {
    group: "Organization Settings",
    title: "Features",
    description: "Choose the capabilities available to your workspace.",
    icon: Gauge,
  },
  "Settings / Subscription": {
    group: "Organization Settings",
    title: "Subscription",
    description: "Review workspace plan and billing configuration.",
    icon: CreditCard,
  },
  "Settings / Manage Teammates": {
    group: "Organization Settings",
    title: "Manage Teammates",
    description: "Manage members, roles, and workspace access.",
    icon: UsersRound,
  },
  "Settings / Customizations": {
    group: "Organization Settings",
    title: "Customizations",
    description: "Configure workspace terminology and appearance.",
    icon: Palette,
  },
  "Settings / Integrations": {
    group: "Organization Settings",
    title: "Integrations",
    description: "Connect Workbench with the tools your team uses.",
    icon: Link2,
  },
  "Settings / Profile Preferences": {
    group: "Personal Settings",
    title: "Profile Preferences",
    description: "Set your personal preferences for Workbench.",
    icon: Palette,
  },
  "Settings / Notification Settings": {
    group: "Personal Settings",
    title: "Notification Settings",
    description: "Choose how Workbench should notify you.",
    icon: Bell,
  },
  "Settings / Invite Users": {
    group: "Personal Settings",
    title: "Invite Users",
    description: "Invite teammates to collaborate in this workspace.",
    icon: UsersRound,
  },
};

const organizationPages = [
  "Settings / General",
  "Settings / Features",
  "Settings / Subscription",
  "Settings / Manage Teammates",
  "Settings / Customizations",
  "Settings / Integrations",
];
const personalPages = [
  "Settings / Profile Preferences",
  "Settings / Notification Settings",
  "Settings / Invite Users",
];

const notificationGroups = [
  {
    title: "Work Orders",
    description: "Work order events can trigger in-app notifications and emails.",
    groups: [
      { title: "Created by me", events: ["All new comments", "Only mentions in comments", "Becomes overdue", "Status has changed"] },
      { title: "Assigned to me", events: ["All assigned work orders", "All new comments", "Only mentions in comments", "Becomes overdue", "Status has changed"] },
      { title: "Assigned to my team", events: ["All assigned work orders", "All new comments", "Only mentions in comments", "Becomes overdue", "Status has changed"] },
    ],
  },
  {
    title: "Requests",
    description: "Follow everything related to your requests.",
    groups: [{ title: "Requiring approval", events: ["Assigned to my teams", "Unassigned"] }],
  },
  {
    title: "Purchase Orders",
    description: "Configure how you receive notifications for purchase order events.",
    groups: [
      { title: "Created by me", events: ["Purchase order was approved", "Purchase order was rejected"] },
      { title: "Requires approval", events: ["Purchase order created and needs approval"] },
    ],
  },
  {
    title: "Procedure Notifications",
    description: "Control notifications when global procedures are published to your organization.",
    groups: [{ title: "", events: ["Procedure published or updated"] }],
  },
];

export function SettingsPage({ pageName, onNavigate }) {
  if (pageName === "Settings / Manage Teammates")
    return <ManageTeammatesPage onNavigate={onNavigate} />;
  if (pageName === "Settings / Invite Users")
    return <InviteUsersPage onNavigate={onNavigate} />;
  if (pageName === "Settings / Profile Preferences")
    return <ProfilePreferencesPage onNavigate={onNavigate} />;
  if (pageName === "Settings / Notification Settings")
    return <NotificationSettingsPage onNavigate={onNavigate} />;

  const current = settings[pageName] ?? settings["Settings / General"];
  const Icon = current.icon;

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <div>
          <p className="eyebrow">{current.group}</p>
          <h1>{current.title}</h1>
          <p>{current.description}</p>
        </div>
      </header>
      <SettingsLayout pageName={pageName} onNavigate={onNavigate}>
        <section
          className="settings-content"
          aria-labelledby="settings-content-title"
        >
          <div className="settings-content-icon">
            <Icon size={22} />
          </div>
          <h2 id="settings-content-title">{current.title}</h2>
          <p>
            This settings area is ready for its Supabase-backed configuration.
          </p>
          <div className="settings-placeholder">
            <span>No settings configured yet.</span>
            <small>
              We’ll connect this section as its data model is implemented.
            </small>
          </div>
          {pageName === "Settings / General" && <BuildVersion />}
        </section>
      </SettingsLayout>
    </div>
  );
}

function BuildVersion() {
  const [build, setBuild] = useState("");

  useEffect(() => {
    fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setBuild(data?.build ?? ""))
      .catch(() => setBuild(""));
  }, []);

  if (!build) return null;
  return <footer className="settings-build-version">{build}</footer>;
}

function ManageTeammatesPage({ onNavigate }) {
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

function InviteUsersPage({ onNavigate }) {
  const [invites, setInvites] = useState([
    { name: "", contact: "", role: "member" },
  ]);
  const [notifyInvites, setNotifyInvites] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [organizationId, setOrganizationId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const canSend = invites.every(
    (invite) => organizationId && invite.name.trim() && invite.contact.trim(),
  );

  useEffect(() => {
    getCurrentWorkspace().then(async (workspace) => {
      const id = workspace.organization?.id ?? "";
      setOrganizationId(id);
      if (id) setInvitations(await listOrganizationInvitations(id));
    }).catch(() => setOrganizationId(""));
  }, []);

  const updateInvite = (index, field, value) => {
    setInvites((current) =>
      current.map((invite, inviteIndex) =>
        inviteIndex === index ? { ...invite, [field]: value } : invite,
      ),
    );
  };

  const removeInvite = (index) => {
    setInvites((current) =>
      current.length === 1
        ? current
        : current.filter((_, inviteIndex) => inviteIndex !== index),
    );
  };

  const copyInviteLink = async () => {
    if (navigator.clipboard) await navigator.clipboard.writeText(inviteLink || `${window.location.origin}/signup`);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  };

  return (
    <div className="settings-page invite-users-page">
      <header className="settings-page-header">
        <p className="eyebrow">Personal Settings</p>
        <h1>Invite Users</h1>
        <p>Invite teammates to collaborate in this workspace.</p>
      </header>
      <SettingsLayout pageName="Settings / Invite Users" onNavigate={onNavigate} className="invite-users-layout">
        <section className="settings-content invite-card">
          <div className="invite-table-header">
            <span>Full Name</span>
            <span>Mobile Phone Number or Email</span>
            <span>Role</span>
            <span aria-hidden="true" />
          </div>
          <div className="invite-rows">
            {invites.map((invite, index) => (
              <div className="invite-row" key={index}>
                <input
                  value={invite.name}
                  onChange={(event) =>
                    updateInvite(index, "name", event.target.value)
                  }
                  placeholder="Full name"
                  aria-label={`Full name for invite ${index + 1}`}
                />
                <input
                  value={invite.contact}
                  onChange={(event) =>
                    updateInvite(index, "contact", event.target.value)
                  }
                  placeholder="Mobile phone number or email"
                  aria-label={`Phone or email for invite ${index + 1}`}
                />
                <Select
                  className="invite-account-type"
                  value={invite.role}
                  onChange={(value) =>
                    updateInvite(index, "role", value)
                  }
                  ariaLabel={`Role for invite ${index + 1}`}
                  options={membershipRoles}
                />
                <button
                  type="button"
                  className="invite-remove"
                  onClick={() => removeInvite(index)}
                  aria-label={`Remove invite ${index + 1}`}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="invite-add-button"
            onClick={() =>
              setInvites((current) => [
                ...current,
                { name: "", contact: "", role: "member" },
              ])
            }
          >
            <Plus size={16} /> Add another
          </button>
          <div className="invite-actions">
            <label className="invite-notify">
              <input
                type="checkbox"
                checked={notifyInvites}
                onChange={(event) => setNotifyInvites(event.target.checked)}
              />
              <span className="invite-switch" aria-hidden="true" />
              <span>Notify invitees</span>
            </label>
            {!notifyInvites && (
              <p className="invite-warning">
                <AlertTriangle size={18} /> Users will be added to the
                organization, but won’t be notified by email or SMS.
              </p>
            )}
            <button
              type="button"
              className="invite-send-button"
              disabled={!canSend || isSending}
              onClick={async () => {
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
                  })));
                  setInviteLink(createdInvites[0]?.inviteLink ?? "");
                  setInvitations((current) => [...createdInvites, ...current]);
                  setInvites([{ name: "", contact: "", role: "member" }]);
                } catch (error) {
                  setSendError(error.message || "Unable to create the invitations.");
                } finally {
                  setIsSending(false);
                }
              }}
            >
              {isSending ? "Creating invites..." : "Send Invite"}
            </button>
            <button
              type="button"
              className="invite-link-button"
              onClick={copyInviteLink}
            >
              <Link2 size={17} />{" "}
              {linkCopied
                ? "Invite link copied"
                : "Get an invite link to share"}
            </button>
          </div>
          {sendError && <p className="invite-error" role="alert">{sendError}</p>}
          {invitations.length > 0 && <div className="invitation-list"><h2>Recent invitations</h2>{invitations.map((invitation) => <div className="invitation-row" key={invitation.id}><div><strong>{[invitation.first_name, invitation.last_name].filter(Boolean).join(" ") || invitation.contact_value}</strong><small>{invitation.contact_type} · {invitation.role} · {invitation.status}</small></div>{invitation.status === "invited" && <button type="button" onClick={async () => { try { await revokeOrganizationInvitation(invitation.id); setInvitations((current) => current.map((item) => item.id === invitation.id ? { ...item, status: "revoked" } : item)); } catch (error) { setSendError(error.message || "Unable to revoke the invitation."); } }}>Revoke</button>}</div>)}</div>}
        </section>
      </SettingsLayout>
    </div>
  );
}

function NotificationSettingsPage({ onNavigate }) {
  const [notificationState, setNotificationState] = useState({});

  const toggleNotification = (key) => {
    setNotificationState((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="settings-page notification-settings-page">
      <header className="settings-page-header">
        <p className="eyebrow">Personal Settings</p>
        <h1>Notification Settings</h1>
        <p>Configure how you receive notifications on Workbench.</p>
      </header>
      <SettingsLayout pageName="Settings / Notification Settings" onNavigate={onNavigate}>
        <section className="notification-settings-content" aria-label="Notification settings">
          {notificationGroups.map((section) => (
            <NotificationSection
              key={section.title}
              section={section}
              notificationState={notificationState}
              onToggle={toggleNotification}
            />
          ))}
          <section className="notification-card notification-messages-card">
            <div>
              <h2>Messages</h2>
              <p>Select which in-app notifications you want to receive for message events.</p>
            </div>
            <Select
              value="Only direct messages and mentions"
              onChange={() => {}}
              ariaLabel="Message notifications"
              options={["All messages", "Only direct messages and mentions", "None"]}
            />
          </section>
        </section>
      </SettingsLayout>
    </div>
  );
}

function NotificationSection({ section, notificationState, onToggle }) {
  return (
    <section className="notification-card">
      <h2>{section.title}</h2>
      <p className="notification-card-description">{section.description}</p>
      <div className="notification-grid notification-grid-header" aria-hidden="true">
        <span />
        <span />
        <strong>Email</strong>
        <strong>In App</strong>
      </div>
      {section.groups.map((group) => (
        <div className="notification-group" key={group.title || section.title}>
          {group.title && <h3>{group.title}</h3>}
          {group.events.map((event) => {
            const eventKey = `${section.title}-${group.title}-${event}`;
            return (
              <div className="notification-grid notification-row" key={eventKey}>
                <span className="notification-row-spacer" />
                <span className="notification-event">
                  {event}
                  {event.toLowerCase().includes("mention") && (
                    <span
                      className="notification-info"
                      tabIndex="0"
                      aria-label="Mentions settings information"
                      data-tooltip="'Only mentions in comments' and 'All new comments' are exclusionary settings."
                    >
                      <Info size={14} aria-hidden="true" />
                    </span>
                  )}
                </span>
                <NotificationToggle
                  label={`${event} email`}
                  checked={notificationState[`${eventKey}-email`] ?? false}
                  onChange={() => onToggle(`${eventKey}-email`)}
                />
                <NotificationToggle
                  label={`${event} in app`}
                  checked={notificationState[`${eventKey}-app`] ?? false}
                  onChange={() => onToggle(`${eventKey}-app`)}
                />
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function NotificationToggle({ label, checked, onChange }) {
  return (
    <label className="notification-toggle">
      <span className="sr-only">{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span aria-hidden="true" />
    </label>
  );
}

function ProfilePreferencesPage({ onNavigate }) {
  const sharedWorkspace = useWorkspace();
  const workspace = sharedWorkspace;
  const [avatarUrl, setAvatarUrl] = useState(() => sharedWorkspace.profile?.avatar_url ?? sharedWorkspace.user?.user_metadata?.avatar_url ?? "");
  const [avatarPath, setAvatarPath] = useState(() => sharedWorkspace.profile?.avatar_path ?? "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [editForm, setEditForm] = useState(() => ({
    firstName: sharedWorkspace.profile?.first_name ?? sharedWorkspace.user?.user_metadata?.first_name ?? "",
    lastName: sharedWorkspace.profile?.last_name ?? sharedWorkspace.user?.user_metadata?.last_name ?? "",
    email: sharedWorkspace.user?.email ?? "",
    phone: sharedWorkspace.profile?.phone ?? sharedWorkspace.user?.user_metadata?.phone ?? sharedWorkspace.user?.phone ?? "",
  }));
  const [preferences, setPreferences] = useState(() => ({
    language: sharedWorkspace.preferences?.language ?? "English",
    dateFormat: sharedWorkspace.preferences?.date_format ?? "MM/DD/YYYY",
    timeFormat: sharedWorkspace.preferences?.time_format ?? "11:59 PM",
    weekStart: sharedWorkspace.preferences?.week_start ?? "Sunday",
  }));

  const user = workspace.user;
  const displayName =
    [user?.user_metadata?.first_name, user?.user_metadata?.last_name]
      .filter(Boolean)
      .join(" ") ||
    user?.email ||
    "Your profile";
  const role =
    workspace.organization?.role === "owner"
      ? "Administrator"
      : workspace.organization?.role || "Member";

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onNavigate("Login");
  };
  const updateEditField = (field, value) =>
    setEditForm((current) => ({ ...current, [field]: value }));
  const saveProfile = async () => {
    setIsSavingProfile(true);
    setProfileSaveError("");
    try {
      const uploadedAvatar = avatarFile ? await uploadAvatar(avatarFile) : null;
      const persistedAvatarPath = uploadedAvatar?.path ?? (avatarPath || undefined);
      await updateProfile({
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        avatarUrl: persistedAvatarPath,
      });
      await updateAuthContact({ email: editForm.email });
      if (uploadedAvatar?.signedUrl) setAvatarUrl(uploadedAvatar.signedUrl);
      setAvatarPath(persistedAvatarPath ?? "");
      window.dispatchEvent(new Event("workbench:profile-updated"));
      closeEditModal();
    } catch (error) {
      setProfileSaveError(error.message || "Unable to update your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePreferences = async (nextPreferences) => {
    setPreferences(nextPreferences);
    try {
      await updateUserPreferences({ ...nextPreferences, timezone: workspace.preferences?.timezone ?? "America/New_York" });
    } catch (error) {
      setProfileSaveError(error.message || "Unable to save this preference.");
    }
  };

  return (
    <div className="settings-page profile-preferences-page">
      <header className="settings-page-header">
        <p className="eyebrow">Personal Settings</p>
        <h1>Profile Preferences</h1>
        <p>Manage your profile and personal workspace preferences.</p>
      </header>
      <SettingsLayout pageName="Settings / Profile Preferences" onNavigate={onNavigate}>
        <section
          className="profile-preferences-content"
          aria-label="Profile preferences"
        >
          <section className="profile-settings-card profile-personal-info-card">
            <div className="profile-identity">
              <label className="profile-avatar-upload">
                <input
                  type="file"
                  accept="image/gif,image/jpeg,image/png,image/heic,image/heif"
                  onChange={handleAvatarChange}
                />
                <Avatar className="profile-avatar-display" src={avatarUrl} firstName={editForm.firstName} lastName={editForm.lastName} alt={`${displayName} profile`} />
                <span className="profile-avatar-overlay">
                  <Camera size={22} />
                </span>
              </label>
              <div className="profile-identity-copy">
                <div className="profile-name-row">
                  <h2>{displayName}</h2>
                  <button
                    type="button"
                    className="profile-edit-button"
                    onClick={openEditModal}
                  >
                    <Pencil size={16} />
                    <span className="sr-only">Edit personal info</span>
                  </button>
                </div>
                <p>{role}</p>
                <div className="profile-info-grid">
                  <div>
                    <span>Email</span>
                    <strong>{editForm.email || "Not provided"}</strong>
                  </div>
                  <div>
                    <span>Phone Number</span>
                    <strong>{editForm.phone || "Not provided"}</strong>
                  </div>
                </div>
              </div>
            </div>
            <button type="button" className="profile-signout-button" onClick={handleSignOut}>
              <LogOut size={16} />
              Sign out
            </button>
          </section>

          <section className="profile-settings-card profile-preferences-card">
            <div className="profile-card-heading">
              <h2>Localization Settings</h2>
            </div>
            <div className="profile-preference-list">
              <label>
                Language
                <Select
                  value={preferences.language}
                  onChange={(value) =>
                    savePreferences({ ...preferences, language: value })
                  }
                  ariaLabel="Language"
                  options={[
                    { label: "English", value: "English" },
                    {
                      label: "Spanish",
                      value: "Spanish",
                      disabled: true,
                      icon: LockKeyhole,
                    },
                    {
                      label: "French",
                      value: "French",
                      disabled: true,
                      icon: LockKeyhole,
                    },
                  ]}
                />
              </label>
              <label>
                Date Format
                <Select
                  value={preferences.dateFormat}
                  onChange={(value) =>
                    savePreferences({ ...preferences, dateFormat: value })
                  }
                  ariaLabel="Date Format"
                  options={["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]}
                />
              </label>
              <label>
                Time Format
                <Select
                  value={preferences.timeFormat}
                  onChange={(value) =>
                    savePreferences({ ...preferences, timeFormat: value })
                  }
                  ariaLabel="Time Format"
                  options={["11:59 PM", "23:59"]}
                />
              </label>
              <label>
                Beginning of Week
                <Select
                  value={preferences.weekStart}
                  onChange={(value) =>
                    savePreferences({ ...preferences, weekStart: value })
                  }
                  ariaLabel="Beginning of Week"
                  options={["Sunday", "Monday"]}
                />
              </label>
            </div>
          </section>

          <section className="profile-settings-card profile-sessions-card">
            <h2>Sessions</h2>
            <h3>Linked Devices</h3>
            <div className="profile-empty-state">
              <Monitor size={18} />
              <span>No linked devices available.</span>
            </div>
          </section>

          <section className="profile-settings-card profile-quit-card">
            <div className="profile-quit-copy">
              <LogOut size={22} />
              <div>
                <h2>Quit Organization</h2>
                <p>
                  If you quit, you will lose access to this organization and
                  will need to be re-invited to join again.
                </p>
              </div>
            </div>
            <button type="button" className="profile-danger-button" disabled>
              Quit Organization
            </button>
          </section>
        </section>
      </SettingsLayout>
      {isEditModalOpen && (
        <ProfileEditModal
          avatarUrl={avatarUrl}
          editForm={editForm}
          onAvatarChange={handleAvatarChange}
          onChange={updateEditField}
          onClose={closeEditModal}
          onSave={saveProfile}
          isSaving={isSavingProfile}
          error={profileSaveError}
        />
      )}
    </div>
  );
}

function ProfileEditModal({
  avatarUrl,
  editForm,
  error,
  isSaving,
  onAvatarChange,
  onChange,
  onClose,
  onSave,
}) {
  const isValid =
    editForm.firstName.trim() && editForm.email.trim() && editForm.phone.trim();

  return (
    <div
      className="profile-edit-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="profile-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="profile-edit-modal-header">
          <h2 id="profile-edit-title">Edit Account</h2>
          <button
            type="button"
            className="profile-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>
        <div className="profile-edit-modal-content">
          <label className="profile-modal-avatar-upload">
            <input
              type="file"
              accept="image/gif,image/jpeg,image/png,image/heic,image/heif"
              onChange={onAvatarChange}
            />
            <Avatar className="profile-modal-avatar-display" src={avatarUrl} firstName={editForm.firstName} lastName={editForm.lastName} alt="Profile" />
            <span className="profile-modal-avatar-overlay">
              <Camera size={22} />
            </span>
          </label>
          <ProfileModalField
            label="First Name"
            required
            value={editForm.firstName}
            onChange={(value) => onChange("firstName", value)}
          />
          <ProfileModalField
            label="Last Name"
            value={editForm.lastName}
            onChange={(value) => onChange("lastName", value)}
          />
          <div className="profile-modal-field">
            <label htmlFor="profile-edit-phone">
              Mobile Phone Number <span>(Required)</span>
            </label>
            <div className="profile-modal-phone">
              <button type="button" aria-label="Phone country code">
                <img src={flagUnitedStates} alt="" />
                <span>+1</span>
              </button>
              <input
                id="profile-edit-phone"
                type="tel"
                value={editForm.phone}
                onChange={(event) => onChange("phone", event.target.value)}
              />
            </div>
          </div>
          <div className="profile-modal-field">
            <label htmlFor="profile-edit-email">
              Email <span>(Required)</span>
            </label>
            <div className="profile-modal-input-with-icon">
              <Mail size={18} />
              <input
                id="profile-edit-email"
                type="email"
                value={editForm.email}
                onChange={(event) => onChange("email", event.target.value)}
              />
            </div>
          </div>
        </div>
        {error && <p className="profile-modal-error" role="alert">{error}</p>}
        <footer className="profile-edit-modal-footer">
          <button
            type="button"
            className="profile-modal-cancel"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="profile-modal-update"
            disabled={!isValid || isSaving}
            onClick={onSave}
          >
            {isSaving ? "Updating..." : "Update"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ProfileModalField({ label, required = false, value, onChange }) {
  const id = `profile-edit-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="profile-modal-field">
      <label htmlFor={id}>
        {label} {required && <span>(Required)</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SettingsLayout({ pageName, onNavigate, className = "", children }) {
  return (
    <div className={`settings-layout ${className}`.trim()}>
      <SettingsNavigation pageName={pageName} onNavigate={onNavigate} />
      <div className="settings-details">{children}</div>
    </div>
  );
}

function SettingsNavigation({ pageName, onNavigate }) {
  const renderNav = (pages) =>
    pages.map((page) => (
      <button
        key={page}
        type="button"
        className={
          page === pageName
            ? "settings-nav-item is-active"
            : "settings-nav-item"
        }
        onClick={() => onNavigate(page)}
      >
        {settings[page].title}
      </button>
    ));
  return (
    <aside className="settings-navigation" aria-label="Settings navigation">
      <section className="settings-nav-section" aria-labelledby="organization-settings-heading">
        <p id="organization-settings-heading" className="settings-nav-heading">Organization Settings</p>
        {renderNav(organizationPages)}
      </section>
      <div className="settings-nav-divider" />
      <section className="settings-nav-section" aria-labelledby="personal-settings-heading">
        <p id="personal-settings-heading" className="settings-nav-heading">Personal Settings</p>
        {renderNav(personalPages)}
      </section>
    </aside>
  );
}
