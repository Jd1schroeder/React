import { useState } from "react";
import { Camera, LockKeyhole, LogOut, Mail, Monitor, Pencil, X } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Select } from "../../components/ui/Select";
import { supabase } from "../../lib/supabase";
import { updateAuthContact, updateProfile, updateUserPreferences, uploadAvatar } from "../../services/profileService";
import { useWorkspace } from "../../components/layout/useWorkspace";
import flagUnitedStates from "../../assets/flags/us.svg";
import { SettingsLayout } from "./SettingsLayout";
import "./ProfilePreferencesPage.css";

export function ProfilePreferencesPage({ onNavigate }) {
  const workspace = useWorkspace();
  const [avatarUrl, setAvatarUrl] = useState(() => workspace.profile?.avatar_url ?? workspace.user?.user_metadata?.avatar_url ?? "");
  const [avatarPath, setAvatarPath] = useState(() => workspace.profile?.avatar_path ?? "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [editForm, setEditForm] = useState(() => ({
    firstName: workspace.profile?.first_name ?? workspace.user?.user_metadata?.first_name ?? "",
    lastName: workspace.profile?.last_name ?? workspace.user?.user_metadata?.last_name ?? "",
    email: workspace.user?.email ?? "",
    phone: workspace.profile?.phone ?? workspace.user?.user_metadata?.phone ?? workspace.user?.phone ?? "",
  }));
  const [preferences, setPreferences] = useState(() => ({
    language: workspace.preferences?.language ?? "English",
    dateFormat: workspace.preferences?.date_format ?? "MM/DD/YYYY",
    timeFormat: workspace.preferences?.time_format ?? "11:59 PM",
    weekStart: workspace.preferences?.week_start ?? "Sunday",
  }));

  const user = workspace.user;
  const displayName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(" ") || user?.email || "Your profile";
  const role = workspace.organization?.role === "owner" ? "Administrator" : workspace.organization?.role || "Member";
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };
  const handleSignOut = async () => { await supabase.auth.signOut(); onNavigate("Login"); };
  const saveProfile = async () => {
    setIsSavingProfile(true);
    setProfileSaveError("");
    try {
      const uploadedAvatar = avatarFile ? await uploadAvatar(avatarFile) : null;
      const persistedAvatarPath = uploadedAvatar?.path ?? (avatarPath || undefined);
      await updateProfile({ firstName: editForm.firstName, lastName: editForm.lastName, phone: editForm.phone, avatarUrl: persistedAvatarPath });
      await updateAuthContact({ email: editForm.email });
      if (uploadedAvatar?.signedUrl) setAvatarUrl(uploadedAvatar.signedUrl);
      setAvatarPath(persistedAvatarPath ?? "");
      window.dispatchEvent(new Event("workbench:profile-updated"));
      setIsEditModalOpen(false);
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

  return <div className="settings-page profile-preferences-page">
    <header className="settings-page-header"><p className="eyebrow">Personal Settings</p><h1>Profile Preferences</h1><p>Manage your profile and personal workspace preferences.</p></header>
    <SettingsLayout pageName="Settings / Profile Preferences" onNavigate={onNavigate}>
      <section className="profile-preferences-content" aria-label="Profile preferences">
        <section className="profile-settings-card profile-personal-info-card">
          <div className="profile-identity">
            <label className="profile-avatar-upload"><input type="file" accept="image/gif,image/jpeg,image/png,image/heic,image/heif" onChange={handleAvatarChange} /><Avatar className="profile-avatar-display" src={avatarUrl} firstName={editForm.firstName} lastName={editForm.lastName} alt={`${displayName} profile`} /><span className="profile-avatar-overlay"><Camera size={22} /></span></label>
            <div className="profile-identity-copy"><div className="profile-name-row"><h2>{displayName}</h2><button type="button" className="profile-edit-button" onClick={() => setIsEditModalOpen(true)}><Pencil size={16} /><span className="sr-only">Edit personal info</span></button></div><p>{role}</p><div className="profile-info-grid"><div><span>Email</span><strong>{editForm.email || "Not provided"}</strong></div><div><span>Phone Number</span><strong>{editForm.phone || "Not provided"}</strong></div></div></div>
          </div>
          <button type="button" className="profile-signout-button" onClick={handleSignOut}><LogOut size={16} /> Sign out</button>
        </section>
        <section className="profile-settings-card profile-preferences-card"><div className="profile-card-heading"><h2>Localization Settings</h2></div><div className="profile-preference-list">
          <PreferenceSelect label="Language" value={preferences.language} onChange={(value) => savePreferences({ ...preferences, language: value })} ariaLabel="Language" options={[{ label: "English", value: "English" }, { label: "Spanish", value: "Spanish", disabled: true, icon: LockKeyhole }, { label: "French", value: "French", disabled: true, icon: LockKeyhole }]} />
          <PreferenceSelect label="Date Format" value={preferences.dateFormat} onChange={(value) => savePreferences({ ...preferences, dateFormat: value })} ariaLabel="Date Format" options={["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]} />
          <PreferenceSelect label="Time Format" value={preferences.timeFormat} onChange={(value) => savePreferences({ ...preferences, timeFormat: value })} ariaLabel="Time Format" options={["11:59 PM", "23:59"]} />
          <PreferenceSelect label="Beginning of Week" value={preferences.weekStart} onChange={(value) => savePreferences({ ...preferences, weekStart: value })} ariaLabel="Beginning of Week" options={["Sunday", "Monday"]} />
        </div></section>
        <section className="profile-settings-card profile-sessions-card"><h2>Sessions</h2><h3>Linked Devices</h3><div className="profile-empty-state"><Monitor size={18} /><span>No linked devices available.</span></div></section>
        <section className="profile-settings-card profile-quit-card"><div className="profile-quit-copy"><LogOut size={22} /><div><h2>Quit Organization</h2><p>If you quit, you will lose access to this organization and will need to be re-invited to join again.</p></div></div><button type="button" className="profile-danger-button" disabled>Quit Organization</button></section>
      </section>
    </SettingsLayout>
    {isEditModalOpen && <ProfileEditModal avatarUrl={avatarUrl} editForm={editForm} onAvatarChange={handleAvatarChange} onChange={(field, value) => setEditForm((current) => ({ ...current, [field]: value }))} onClose={() => setIsEditModalOpen(false)} onSave={saveProfile} isSaving={isSavingProfile} error={profileSaveError} />}
  </div>;
}

function PreferenceSelect({ label, ...props }) {
  return <label>{label}<Select {...props} /></label>;
}

function ProfileEditModal({ avatarUrl, editForm, error, isSaving, onAvatarChange, onChange, onClose, onSave }) {
  const isValid = editForm.firstName.trim() && editForm.email.trim() && editForm.phone.trim();
  return <div className="profile-edit-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="profile-edit-modal-header"><h2 id="profile-edit-title">Edit Account</h2><button type="button" className="profile-modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
      <div className="profile-edit-modal-content">
        <label className="profile-modal-avatar-upload"><input type="file" accept="image/gif,image/jpeg,image/png,image/heic,image/heif" onChange={onAvatarChange} /><Avatar className="profile-modal-avatar-display" src={avatarUrl} firstName={editForm.firstName} lastName={editForm.lastName} alt="Profile" /><span className="profile-modal-avatar-overlay"><Camera size={22} /></span></label>
        <ProfileModalField label="First Name" required value={editForm.firstName} onChange={(value) => onChange("firstName", value)} />
        <ProfileModalField label="Last Name" value={editForm.lastName} onChange={(value) => onChange("lastName", value)} />
        <div className="profile-modal-field"><label htmlFor="profile-edit-phone">Mobile Phone Number <span>(Required)</span></label><div className="profile-modal-phone"><button type="button" aria-label="Phone country code"><img src={flagUnitedStates} alt="" /><span>+1</span></button><input id="profile-edit-phone" type="tel" value={editForm.phone} onChange={(event) => onChange("phone", event.target.value)} /></div></div>
        <div className="profile-modal-field"><label htmlFor="profile-edit-email">Email <span>(Required)</span></label><div className="profile-modal-input-with-icon"><Mail size={18} /><input id="profile-edit-email" type="email" value={editForm.email} onChange={(event) => onChange("email", event.target.value)} /></div></div>
      </div>
      {error && <p className="profile-modal-error" role="alert">{error}</p>}
      <footer className="profile-edit-modal-footer"><button type="button" className="profile-modal-cancel" onClick={onClose} disabled={isSaving}>Cancel</button><button type="button" className="profile-modal-update" disabled={!isValid || isSaving} onClick={onSave}>{isSaving ? "Updating..." : "Update"}</button></footer>
    </section>
  </div>;
}

function ProfileModalField({ label, required = false, value, onChange }) {
  const id = `profile-edit-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div className="profile-modal-field"><label htmlFor={id}>{label} {required && <span>(Required)</span>}</label><input id={id} type="text" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
