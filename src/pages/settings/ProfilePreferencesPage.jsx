import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Camera, ChevronRight, LockKeyhole, LogOut, Mail, Monitor, Pencil, Smartphone, X } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Select } from "../../components/ui/Select";
import { supabase } from "../../lib/supabase";
import { listPasskeys, registerPasskey } from "../../services/authService";
import { updateAuthContact, updateProfile, updateUserPreferences, uploadAvatar } from "../../services/profileService";
import { isCurrentSessionValid, listCurrentUserSessions, registerCurrentSession, revokeCurrentUserSession, subscribeToSessionUpdates } from "../../services/sessionService";
import { formatDateForUser } from "../../utils/dateFormatting";
import { useWorkspace } from "../../components/layout/useWorkspace";
import { preloadNotificationSettings } from "../../services/notificationPreferenceService";
import flagUnitedStates from "../../assets/flags/us.svg";
import { SettingsLayout } from "./SettingsLayout";
import { PauseNotificationsSheet } from "./PauseNotificationsSheet";
import "./ProfilePreferencesPage.css";

export function ProfilePreferencesPage({ pageName = "Settings / Profile Preferences", sessionId, onNavigate }) {
  const isEditPage = pageName === "Settings / Edit Account";
  const isSessionDetailPage = pageName === "Settings / Linked Device";
  const workspace = useWorkspace();
  const [avatarUrl, setAvatarUrl] = useState(() => workspace.profile?.avatar_url ?? workspace.user?.user_metadata?.avatar_url ?? "");
  const [avatarPath, setAvatarPath] = useState(() => workspace.profile?.avatar_path ?? "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [pauseUntil, setPauseUntil] = useState(null);
  useEffect(() => {
    if (!pauseUntil) return undefined;
    const remaining = Math.max(0, pauseUntil.getTime() - Date.now());
    const timeoutId = window.setTimeout(() => setPauseUntil(null), remaining);
    return () => window.clearTimeout(timeoutId);
  }, [pauseUntil]);
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
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isConfirmingSessionRevoke, setIsConfirmingSessionRevoke] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [isRevokingSession, setIsRevokingSession] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyError, setPasskeyError] = useState("");
  const [passkeyNotice, setPasskeyNotice] = useState("");
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);

  const user = workspace.user;
  useEffect(() => {
    if (!user?.id || isEditPage || isSessionDetailPage) return;
    preloadNotificationSettings(user.id).catch(() => {});
  }, [user?.id, isEditPage, isSessionDetailPage]);
  const displayName = [editForm.firstName, editForm.lastName].filter(Boolean).join(" ") || user?.email || "Your profile";
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
      if (isEditPage) onNavigate("Settings / Profile Preferences");
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
  const addPasskey = async () => {
    setIsRegisteringPasskey(true);
    setPasskeyError("");
    setPasskeyNotice("");
    try {
      await registerPasskey();
      setPasskeys(await listPasskeys());
    } catch (error) {
      const message = error.message || "";
      if (error.name === "NotAllowedError" || error.name === "AbortError" || /timed out|not allowed to finish|cancel/i.test(message)) setPasskeyNotice("Passkey setup was canceled.");
      else setPasskeyError(message || "Unable to register this passkey.");
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribeFromUpdates;
    const refreshSessions = async () => {
      try {
        const rows = await listCurrentUserSessions();
        if (isMounted) {
          setSessions(rows);
          setSessionError("");
        }
      } catch (error) {
        if (isMounted) setSessionError(error.message || "Unable to load linked devices.");
      } finally {
        if (isMounted) setSessionsLoading(false);
      }
    };

    registerCurrentSession()
      .then(refreshSessions)
      .catch((error) => {
        isCurrentSessionValid()
          .then(async (isValid) => {
            if (!isValid) {
              await supabase.auth.signOut({ scope: "local" });
              if (isMounted) onNavigate("Login");
              return;
            }
            if (isMounted) setSessionError(error.message || "Unable to load linked devices.");
          })
          .catch(() => {
            if (isMounted) setSessionError(error.message || "Unable to load linked devices.");
          })
          .finally(() => {
            if (isMounted) setSessionsLoading(false);
          });
      });
    subscribeToSessionUpdates(user?.id, refreshSessions)
      .then((unsubscribe) => {
        if (isMounted) unsubscribeFromUpdates = unsubscribe;
        else unsubscribe();
      })
      .catch(() => {
        // The initial list remains usable when Realtime is unavailable.
      });
    const refreshIntervalId = window.setInterval(refreshSessions, 10000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshSessions();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      isMounted = false;
      window.clearInterval(refreshIntervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeFromUpdates?.();
    };
  }, [onNavigate, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    listPasskeys().then(setPasskeys).catch((error) => setPasskeyError(error.message || "Unable to load passkeys."));
  }, [user?.id]);

  const revokeSession = async (sessionToRevoke = selectedSession) => {
    if (!sessionToRevoke) return;
    setIsRevokingSession(true);
    setSessionError("");
    try {
      await revokeCurrentUserSession(sessionToRevoke.session_id);
      setIsConfirmingSessionRevoke(false);
      if (sessionToRevoke.is_current) {
        await supabase.auth.signOut({ scope: "local" });
        onNavigate("Login");
        return;
      }
      setSessions((current) => current.filter((session) => session.session_id !== sessionToRevoke.session_id));
      setSelectedSession(null);
      if (isSessionDetailPage) onNavigate("Settings / Profile Preferences");
    } catch (error) {
      setSessionError(error.message || "Unable to log out from this device.");
    } finally {
      setIsRevokingSession(false);
    }
  };

  const openEditAccount = () => {
    if (window.matchMedia?.("(max-width: 1199px)").matches) onNavigate("Settings / Edit Account");
    else setIsEditModalOpen(true);
  };

  const openSession = (session) => {
    if (window.matchMedia?.("(max-width: 1199px)").matches) {
      onNavigate(`/settings/profile-preferences/sessions/${encodeURIComponent(session.session_id)}`);
    } else {
      setSelectedSession(session);
    }
  };
  const requestSessionSignOut = () => {
    setSessionError("");
    setIsConfirmingSessionRevoke(true);
  };

  const activeSession = isSessionDetailPage
    ? sessions.find((session) => session.session_id === sessionId)
    : selectedSession;

  if (isSessionDetailPage) {
    return <>
      <LinkedDevicePage
        session={activeSession}
        isLoading={sessionsLoading}
        error={sessionError}
        timeZone={preferences.timezone ?? workspace.preferences?.timezone}
        dateFormat={preferences.dateFormat}
        onSignOut={requestSessionSignOut}
      />
      {isConfirmingSessionRevoke && activeSession && <SessionRevokeConfirmation session={activeSession} isRevoking={isRevokingSession} error={sessionError} onCancel={() => setIsConfirmingSessionRevoke(false)} onConfirm={() => revokeSession(activeSession)} />}
    </>;
  }

  if (isEditPage) {
    return <ProfileEditPage
      avatarUrl={avatarUrl}
      editForm={editForm}
      onAvatarChange={handleAvatarChange}
      onChange={(field, value) => setEditForm((current) => ({ ...current, [field]: value }))}
      onSave={saveProfile}
      isSaving={isSavingProfile}
      error={profileSaveError}
    />;
  }

  return <div className="settings-page profile-preferences-page">
    <header className="settings-page-header"><p className="eyebrow">Personal Settings</p><h1>Profile Preferences</h1><p>Manage your profile and personal workspace preferences.</p></header>
    <SettingsLayout pageName="Settings / Profile Preferences" onNavigate={onNavigate}>
      <section className="profile-preferences-content" aria-label="Profile preferences">
        <section className="profile-settings-card profile-personal-info-card">
          <div className="profile-identity">
            <div className="profile-avatar-readonly"><Avatar className="profile-avatar-display" src={avatarUrl} firstName={editForm.firstName} lastName={editForm.lastName} alt={`${displayName} profile`} /></div>
            <div className="profile-identity-copy"><div className="profile-name-row"><h2>{displayName}</h2><button type="button" className="profile-edit-button" onClick={openEditAccount}><Pencil size={16} /><span className="sr-only">Edit personal info</span></button></div><p>{role}</p><div className="profile-info-grid"><div><Mail size={19} aria-hidden="true" /><span className="sr-only">Email</span><strong>{editForm.email || "Not provided"}</strong></div><div><Smartphone size={19} aria-hidden="true" /><span className="sr-only">Phone Number</span><strong>{editForm.phone || "Not provided"}</strong></div></div></div>
          </div>
        </section>
        <button type="button" className="profile-pause-notifications" onClick={() => setIsPauseMenuOpen(true)}>{pauseUntil ? <BellRing size={20} aria-hidden="true" /> : <BellOff size={20} aria-hidden="true" />}<span>{pauseUntil ? "Resume Notifications" : "Pause Notifications"}</span></button>
        {pauseUntil && <p className="profile-pause-notice" role="status">Notifications paused until {formatPauseUntil(pauseUntil)}</p>}
        <section className="profile-settings-card profile-preferences-card"><div className="profile-card-heading"><h2>Account Settings</h2></div><button type="button" className="profile-mobile-notification-link" onClick={() => onNavigate("Settings / Notification Settings")}><span className="profile-mobile-setting-icon"><Bell size={22} aria-hidden="true" /></span><span>Notification Settings</span><ChevronRight size={20} aria-hidden="true" /></button><div className="profile-preference-list">
          <PreferenceSelect label="Language" value={preferences.language} onChange={(value) => savePreferences({ ...preferences, language: value })} ariaLabel="Language" options={[{ label: "English", value: "English" }, { label: "Spanish", value: "Spanish", disabled: true, icon: LockKeyhole }, { label: "French", value: "French", disabled: true, icon: LockKeyhole }]} />
          <PreferenceSelect label="Date Format" value={preferences.dateFormat} onChange={(value) => savePreferences({ ...preferences, dateFormat: value })} ariaLabel="Date Format" options={["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]} />
          <PreferenceSelect label="Time Format" value={preferences.timeFormat} onChange={(value) => savePreferences({ ...preferences, timeFormat: value })} ariaLabel="Time Format" options={["11:59 PM", "23:59"]} />
          <PreferenceSelect label="Beginning of Week" value={preferences.weekStart} onChange={(value) => savePreferences({ ...preferences, weekStart: value })} ariaLabel="Beginning of Week" options={["Sunday", "Monday"]} />
        </div></section>
        <section className="profile-settings-card profile-passkeys-card"><div className="profile-card-heading"><div><h2>Passkeys</h2><p>Use your phone's biometrics or device PIN to sign in securely.</p></div><button type="button" className="profile-passkey-button" onClick={addPasskey} disabled={isRegisteringPasskey}>{isRegisteringPasskey ? "Waiting for verification..." : "Add passkey"}</button></div>{passkeys.length > 0 && <div className="profile-passkey-list">{passkeys.map((passkey) => <div className="profile-passkey-row" key={passkey.id}><strong>{passkey.friendly_name || "Passkey"}</strong><span>Added {formatDateForUser(passkey.created_at, preferences.dateFormat, workspace.preferences?.timezone)}</span></div>)}</div>}{passkeyNotice && <p className="profile-passkey-notice">{passkeyNotice}</p>}{passkeyError && <p className="profile-session-error" role="alert">{passkeyError}</p>}</section>
        <section className="profile-settings-card profile-sessions-card"><h2>Sessions</h2><h3>Linked Devices</h3>{sessionsLoading ? <div className="profile-empty-state"><Monitor size={18} /><span>Loading linked devices...</span></div> : sessions.length ? <div className="profile-session-list">{sessions.map((session) => <button type="button" className="profile-session-row" key={session.session_id} onClick={() => openSession(session)}><span className="profile-session-icon">{session.device_type === "mobile" || session.device_type === "tablet" ? <Smartphone size={17} /> : <Monitor size={17} />}</span><strong>{session.device_name}</strong>{session.is_current && <span className="profile-session-current">This device</span>}<ChevronRight size={18} aria-hidden="true" /></button>)}</div> : <div className="profile-empty-state"><Monitor size={18} /><span>No linked devices available.</span></div>}{sessionError && <p className="profile-session-error" role="alert">{sessionError}</p>}</section>
        <section className="profile-settings-card profile-quit-card"><div className="profile-quit-copy"><LogOut size={22} /><div><h2>Quit Organization</h2><p>If you quit, you will lose access to this organization and will need to be re-invited to join again.</p></div></div><button type="button" className="profile-danger-button" disabled>Quit Organization</button></section>
        <section className="profile-settings-card profile-signout-card"><button type="button" className="profile-signout-button" onClick={handleSignOut}><LogOut size={20} aria-hidden="true" /><span>Sign Out</span><ChevronRight size={20} aria-hidden="true" /></button></section>
      </section>
    </SettingsLayout>
    {isEditModalOpen && <ProfileEditModal avatarUrl={avatarUrl} editForm={editForm} onAvatarChange={handleAvatarChange} onChange={(field, value) => setEditForm((current) => ({ ...current, [field]: value }))} onClose={() => setIsEditModalOpen(false)} onSave={saveProfile} isSaving={isSavingProfile} error={profileSaveError} />}
    {isPauseMenuOpen && <PauseNotificationsSheet pausedUntil={pauseUntil} onCancel={() => setIsPauseMenuOpen(false)} onResume={() => { setPauseUntil(null); setIsPauseMenuOpen(false); }} onSelect={(option) => { const duration = { "Pause for 30 minutes": 30 * 60_000, "Pause for 1 hour": 60 * 60_000, "Pause for 4 hours": 4 * 60 * 60_000, "Pause until tomorrow": 24 * 60 * 60_000, "Pause until next week": 7 * 24 * 60 * 60_000 }[option]; setPauseUntil(new Date(Date.now() + duration)); setIsPauseMenuOpen(false); }} />}
    {selectedSession && <LinkedDeviceModal session={selectedSession} timeZone={preferences.timezone ?? workspace.preferences?.timezone} dateFormat={preferences.dateFormat} onClose={() => setSelectedSession(null)} onRequestSignOut={requestSessionSignOut} />}
    {isConfirmingSessionRevoke && activeSession && <SessionRevokeConfirmation session={activeSession} isRevoking={isRevokingSession} error={sessionError} onCancel={() => setIsConfirmingSessionRevoke(false)} onConfirm={() => revokeSession(activeSession)} />}
  </div>;
}

function PreferenceSelect({ label, ariaLabel, options = [], onChange, value, ...props }) {
  const normalizedOptions = options.map((option) => typeof option === "string" ? { label: option, value: option } : option);
  return <label className="profile-preference-select-label">
    <span>{label}</span>
    <span className="profile-preference-select-desktop"><Select ariaLabel={ariaLabel ?? label} options={options} onChange={onChange} value={value} {...props} /></span>
    <span className="profile-preference-select-native">
      <select aria-label={ariaLabel ?? label} value={value} onChange={(event) => onChange?.(event.target.value)} {...props}>
        {normalizedOptions.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </span>
  </label>;
}

function ProfileAvatarPicker({ avatarUrl, editForm, onAvatarChange, className = "profile-modal-avatar-upload" }) {
  return <label className={className}><input type="file" accept="image/gif,image/jpeg,image/png,image/heic,image/heif" onChange={onAvatarChange} /><Avatar className="profile-modal-avatar-display" src={avatarUrl} firstName={editForm.firstName} lastName={editForm.lastName} alt="Profile" /><span className="profile-modal-avatar-overlay"><Camera size={22} /></span></label>;
}

function ProfileEditFields({ avatarUrl, editForm, onAvatarChange, onChange, includeAvatar = true }) {
  return <>
    {includeAvatar && <ProfileAvatarPicker avatarUrl={avatarUrl} editForm={editForm} onAvatarChange={onAvatarChange} />}
    <ProfileModalField label="First Name" required value={editForm.firstName} onChange={(value) => onChange("firstName", value)} />
    <ProfileModalField label="Last Name" value={editForm.lastName} onChange={(value) => onChange("lastName", value)} />
    <div className="profile-modal-field"><label htmlFor="profile-edit-phone">Mobile Phone Number <span>(Required)</span></label><div className="profile-modal-phone"><button type="button" aria-label="Phone country code"><img src={flagUnitedStates} alt="" /><span>+1</span></button><input id="profile-edit-phone" type="tel" value={editForm.phone} onChange={(event) => onChange("phone", event.target.value)} /></div></div>
    <div className="profile-modal-field"><label htmlFor="profile-edit-email">Email <span>(Required)</span></label><div className="profile-modal-input-with-icon"><Mail size={18} /><input id="profile-edit-email" type="email" value={editForm.email} onChange={(event) => onChange("email", event.target.value)} /></div></div>
  </>;
}

function ProfileEditPage({ avatarUrl, editForm, error, isSaving, onAvatarChange, onChange, onSave }) {
  const isValid = editForm.firstName.trim() && editForm.email.trim() && editForm.phone.trim();
  return <section className="profile-edit-page" aria-label="Edit account information">
    <div className="profile-edit-page-content">
      <ProfileAvatarPicker className="profile-modal-avatar-upload profile-edit-page-avatar" avatarUrl={avatarUrl} editForm={editForm} onAvatarChange={onAvatarChange} />
      <div className="profile-edit-page-card">
        <ProfileEditFields avatarUrl={avatarUrl} editForm={editForm} onAvatarChange={onAvatarChange} onChange={onChange} includeAvatar={false} />
        {error && <p className="profile-modal-error" role="alert">{error}</p>}
      </div>
    </div>
    <footer className="profile-edit-page-footer">
      <button type="button" className="profile-modal-update" disabled={!isValid || isSaving} onClick={onSave}>{isSaving ? "Updating..." : "Update"}</button>
    </footer>
  </section>;
}

function ProfileEditModal({ avatarUrl, editForm, error, isSaving, onAvatarChange, onChange, onClose, onSave }) {
  const isValid = editForm.firstName.trim() && editForm.email.trim() && editForm.phone.trim();
  return <div className="profile-edit-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="profile-edit-modal-header"><h2 id="profile-edit-title">Edit Account</h2><button type="button" className="profile-modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
      <div className="profile-edit-modal-content">
        <ProfileEditFields avatarUrl={avatarUrl} editForm={editForm} onAvatarChange={onAvatarChange} onChange={onChange} />
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

function LinkedDeviceDetails({ session, timeZone, dateFormat }) {
  const DeviceIcon = session.device_type === "mobile" || session.device_type === "tablet" ? Smartphone : Monitor;
  return <div className="profile-device-modal-content"><span className="profile-device-modal-icon"><DeviceIcon size={30} /><span className="sr-only">{session.device_type}</span></span><h3>{session.device_name}</h3><div className="profile-device-details"><div><span>Device type</span><strong>{session.device_type}</strong></div><div><span>Browser</span><strong>{session.browser_name}</strong></div><div><span>Operating system</span><strong>{session.operating_system}</strong></div><div><span>Last connection</span><strong>{formatSessionConnection(session.last_connection, dateFormat, timeZone)}</strong></div>{session.last_ip && <div><span>Last IP address</span><strong>{session.last_ip}</strong></div>}</div>{session.is_current && <p className="profile-device-current">This device</p>}</div>;
}

function LinkedDevicePage({ session, isLoading, error, timeZone, dateFormat, onSignOut }) {
  return <section className="profile-edit-page profile-linked-device-page" aria-label="Linked device details">
    <div className="profile-edit-page-content profile-linked-device-content">
      {isLoading ? <div className="profile-empty-state" aria-busy="true"><Monitor size={18} /><span>Loading device details...</span></div> : session ? <><div className="profile-device-page-card"><LinkedDeviceDetails session={session} timeZone={timeZone} dateFormat={dateFormat} /></div>{error && <p className="profile-session-error" role="alert">{error}</p>}</> : <div className="profile-empty-state" role="alert">{error || "This linked device could not be found."}</div>}
    </div>
    {session && <footer className="profile-edit-page-footer"><button type="button" className="profile-modal-update profile-device-signout-button" onClick={onSignOut}><LogOut size={18} aria-hidden="true" />Sign out</button></footer>}
  </section>;
}

function LinkedDeviceModal({ session, timeZone, dateFormat, onClose, onRequestSignOut }) {
  return <div className="profile-edit-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="profile-device-modal" role="dialog" aria-modal="true" aria-labelledby="linked-device-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="profile-edit-modal-header"><h2 id="linked-device-title">Linked Device</h2><button type="button" className="profile-modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
      <LinkedDeviceDetails session={session} timeZone={timeZone} dateFormat={dateFormat} />
      <footer className="profile-edit-modal-footer"><button type="button" className="profile-modal-cancel" onClick={onClose}>Cancel</button><button type="button" className="profile-modal-update" onClick={onRequestSignOut}><LogOut size={16} aria-hidden="true" />Sign out</button></footer>
    </section>
  </div>;
}

function SessionRevokeConfirmation({ session, isRevoking, error, onCancel, onConfirm }) {
  return <div className="profile-edit-modal-backdrop profile-session-confirmation-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isRevoking) onCancel(); }}>
    <section className="profile-edit-modal profile-session-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="session-signout-title" aria-describedby="session-signout-description" onMouseDown={(event) => event.stopPropagation()}>
      <header className="profile-edit-modal-header"><h2 id="session-signout-title">Sign out device?</h2><button type="button" className="profile-modal-close" onClick={onCancel} disabled={isRevoking} aria-label="Close"><X size={20} /></button></header>
      <div className="profile-session-confirmation-content"><p id="session-signout-description">{session.is_current ? "You will be signed out of this device and need to sign in again." : `You will need to sign in again on ${session.device_name}.`}</p>{error && <p className="profile-modal-error" role="alert">{error}</p>}</div>
      <footer className="profile-edit-modal-footer"><button type="button" className="profile-modal-cancel" onClick={onCancel} disabled={isRevoking}>Cancel</button><button type="button" className="profile-modal-update profile-session-confirm-button" onClick={onConfirm} disabled={isRevoking}><LogOut size={16} aria-hidden="true" />{isRevoking ? "Signing out..." : "Sign out"}</button></footer>
    </section>
  </div>;
}

function formatPauseUntil(date) {
  return new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatSessionConnection(value, dateFormat, timeZone) {
  const date = formatDateForUser(value, dateFormat, timeZone);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(value));
  return `${date}, ${time}`;
}
