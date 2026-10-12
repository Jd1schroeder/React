import { useEffect, useState } from "react";
import {
  Archive,
  ClipboardList,
  FileDown,
  FileText,
  Gauge,
  MapPin,
  Package,
  LockKeyhole,
  ShieldCheck,
  Timer,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { useWorkspace } from "../../components/layout/useWorkspace";
import { listOrganizationMembers, updateOrganization, uploadOrganizationLogo } from "../../services/organizationService";
import { SettingsLayout } from "./SettingsLayout";
import { ProfileAvatarPicker } from "./ProfilePreferencesPage";
import { settings } from "./settingsConfig";

export function GeneralSettingsPage({ pageName, onNavigate }) {
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
        {pageName === "Settings / General"
          ? <GeneralSettingsContent />
          : <section className="settings-content" aria-labelledby="settings-content-title">
            <div className="settings-content-icon"><Icon size={22} /></div>
            <h2 id="settings-content-title">{current.title}</h2>
            <p>This settings area is ready for its Supabase-backed configuration.</p>
            <div className="settings-placeholder">
              <span>No settings configured yet.</span>
              <small>We&apos;ll connect this section as its data model is implemented.</small>
            </div>
          </section>}
      </SettingsLayout>
    </div>
  );
}

const preferenceOptions = {
  language: [{ value: "en", label: "English (Default)" }],
  currency: [{ value: "usd", label: "USD (US Dollar)" }],
  dateFormat: [
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  ],
  timeFormat: [
    { value: "11:59 PM", label: "11:59 PM" },
    { value: "23:59", label: "23:59" },
  ],
};

const timeZoneOptions = [
  ["Etc/GMT+12", "UTC-12:00 — International Date Line West (Baker Island, Howland Island)"],
  ["Pacific/Pago_Pago", "UTC-11:00 — Samoa Standard Time (American Samoa, Midway Atoll)"],
  ["Pacific/Honolulu", "UTC-10:00 — Hawaii-Aleutian Time (Hawaii, Cook Islands)"],
  ["America/Anchorage", "UTC-09:00 — Alaska Time (Alaska, US)"],
  ["America/Los_Angeles", "UTC-08:00 — Pacific Time (West Coast US & Canada)"],
  ["America/Denver", "UTC-07:00 — Mountain Time (Mountain US & Canada, Western Mexico)"],
  ["America/Chicago", "UTC-06:00 — Central Time (Central US & Canada, Central America)"],
  ["America/New_York", "UTC-05:00 — Eastern Time (New York, Eastern US & Canada)"],
  ["America/Detroit", "UTC-05:00 — Eastern Time (Eastern US & Canada, Colombia, Peru)"],
  ["America/St_Johns", "UTC-03:30 — Newfoundland Time (Newfoundland and Labrador)"],
  ["America/Sao_Paulo", "UTC-03:00 — Argentina, Brazil, Greenland, Uruguay"],
  ["Atlantic/South_Georgia", "UTC-02:00 — Mid-Atlantic / South Georgia Island"],
  ["Atlantic/Azores", "UTC-01:00 — Azores, Cabo Verde"],
  ["UTC", "UTC±00:00 — Coordinated Universal Time (London, Reykjavik, Accra)"],
  ["Europe/Paris", "UTC+01:00 — Central European Time (Paris, Berlin, Rome, Lagos)"],
  ["Africa/Cairo", "UTC+02:00 — Eastern European / Central Africa Time (Cairo, Athens, Johannesburg)"],
  ["Europe/Moscow", "UTC+03:00 — Moscow / Arabia Time (Moscow, Riyadh, Nairobi)"],
  ["Asia/Tehran", "UTC+03:30 — Iran Standard Time (Tehran)"],
  ["Asia/Dubai", "UTC+04:00 — Arabian Time (Dubai, Baku, Tbilisi)"],
  ["Asia/Kabul", "UTC+04:30 — Afghanistan Time (Kabul)"],
  ["Asia/Karachi", "UTC+05:00 — Pakistan Time (Karachi, Tashkent, Ekaterinburg)"],
  ["Asia/Kolkata", "UTC+05:30 — India / Sri Lanka Time (Mumbai, New Delhi, Colombo)"],
  ["Asia/Kathmandu", "UTC+05:45 — Nepal Time (Kathmandu)"],
  ["Asia/Dhaka", "UTC+06:00 — Bangladesh / Almaty Time (Dhaka, Almaty)"],
  ["Asia/Yangon", "UTC+06:30 — Myanmar / Cocos Islands Time (Yangon)"],
  ["Asia/Bangkok", "UTC+07:00 — Indochina Time (Bangkok, Jakarta, Hanoi)"],
  ["Asia/Singapore", "UTC+08:00 — China / Singapore / Western Australia Time"],
  ["Australia/Eucla", "UTC+08:45 — Australian Central Western Time (Eucla)"],
  ["Asia/Tokyo", "UTC+09:00 — Japan / Korea Time (Tokyo, Seoul)"],
  ["Australia/Darwin", "UTC+09:30 — Australian Central Time (Adelaide, Darwin)"],
  ["Australia/Sydney", "UTC+10:00 — Australian Eastern / Chamorro Time (Sydney, Brisbane, Guam)"],
  ["Australia/Lord_Howe", "UTC+10:30 — Lord Howe Island Time"],
  ["Pacific/Noumea", "UTC+11:00 — Solomon Islands / New Caledonia Time"],
  ["Pacific/Auckland", "UTC+12:00 — New Zealand / Fiji Time (Auckland, Suva)"],
  ["Pacific/Chatham", "UTC+12:45 — Chatham Islands Time"],
  ["Pacific/Tongatapu", "UTC+13:00 — Tonga / Samoa Time"],
  ["Pacific/Kiritimati", "UTC+14:00 — Kiritimati / Line Islands Time"],
].map(([value, label]) => ({ value, label }));

function GeneralSettingsContent() {
  const workspace = useWorkspace();
  const organization = workspace.organization ?? {};
  const [preferences, setPreferences] = useState({
    language: "en",
    currency: "usd",
    dateFormat: workspace.preferences?.date_format ?? "MM/DD/YYYY",
    timeFormat: workspace.preferences?.time_format ?? "11:59 PM",
    timeZone: workspace.preferences?.timezone ?? organization.timezone ?? "America/Detroit",
  });
  const [memberCount, setMemberCount] = useState(null);
  const [isOrganizationModalOpen, setIsOrganizationModalOpen] = useState(false);

  useEffect(() => {
    if (!organization.id) return undefined;
    let active = true;
    listOrganizationMembers(organization.id)
      .then((members) => { if (active) setMemberCount(members.length); })
      .catch(() => { if (active) setMemberCount(null); });
    return () => { active = false; };
  }, [organization.id]);

  const updatePreference = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));
  const memberLabel = memberCount === null ? "Members" : `${memberCount} Members`;

  return (
    <div className="settings-general-content">
      <section className="general-organization-card" aria-labelledby="organization-summary-title">
        <Avatar src={organization.logo_url} name={organization.name} className="general-organization-logo" alt={`${organization.name ?? "Organization"} logo`} />
        <div className="general-organization-details">
          <h2 id="organization-summary-title">{organization.name ?? "Your organization"}</h2>
          <p>{organization.description || "Workspace organization"}</p>
          <p>{organization.slug || "Organization"} <span aria-hidden="true">|</span> {memberLabel}</p>
          <p>Organization ID: {organization.organization_number ?? "—"}</p>
          <span className="general-plan-badge">{organization.plan_name ?? "Plan not configured"}</span>
        </div>
        <Button variant="ghost" className="general-edit-profile" onClick={() => setIsOrganizationModalOpen(true)}>Edit Profile</Button>
      </section>

      <section className="general-settings-card" aria-labelledby="preferences-title">
        <h2 id="preferences-title">Preferences</h2>
        <div className="general-preferences-grid">
          <PreferenceRow label="Organization Language"><Select ariaLabel="Organization Language" value={preferences.language} options={preferenceOptions.language} onChange={(value) => updatePreference("language", value)} /></PreferenceRow>
          <PreferenceRow label="Currency"><Select ariaLabel="Currency" value={preferences.currency} options={preferenceOptions.currency} onChange={(value) => updatePreference("currency", value)} /></PreferenceRow>
          <PreferenceRow label="Date Format"><Select ariaLabel="Date Format" value={preferences.dateFormat} options={preferenceOptions.dateFormat} onChange={(value) => updatePreference("dateFormat", value)} /></PreferenceRow>
          <PreferenceRow label="Time Format"><Select ariaLabel="Time Format" value={preferences.timeFormat} options={preferenceOptions.timeFormat} onChange={(value) => updatePreference("timeFormat", value)} /></PreferenceRow>
          <PreferenceRow label="Time Zone"><Select ariaLabel="Time Zone" value={preferences.timeZone} options={timeZoneOptions} onChange={(value) => updatePreference("timeZone", value)} /></PreferenceRow>
        </div>
      </section>

      <DataTileSection title="Export Data" tiles={exportTiles} locked />
      <DataTileSection title="Import Data" tiles={importTiles} locked disabledLabel="Other items soon" />

      <section className="general-settings-card general-workstation-card" aria-labelledby="workstation-title">
        <h2 id="workstation-title">Workstation Mode</h2>
        <div className="general-workstation-row is-locked">
          <LockKeyhole size={30} aria-hidden="true" />
          <div><strong>Enable Workstation Mode</strong><span>Allow this device to be used by multiple user accounts.</span></div>
          <Button disabled>Turn this Device into a Workstation</Button>
        </div>
      </section>

      <BuildVersion />
      {isOrganizationModalOpen && <OrganizationProfileModal organization={organization} onClose={() => setIsOrganizationModalOpen(false)} onSaved={workspace.refreshWorkspace} />}
    </div>
  );
}

function OrganizationProfileModal({ organization, onClose, onSaved }) {
  const [name, setName] = useState(organization.name ?? "");
  const [address, setAddress] = useState(organization.description ?? "");
  const [logoUrl, setLogoUrl] = useState(organization.logo_url ?? "");
  const [logoFile, setLogoFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const isValid = Boolean(name.trim());

  const chooseLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Organization logos must be 5 MB or smaller.");
      return;
    }
    setError("");
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!isValid) return;
    setIsSaving(true);
    setError("");
    try {
      const logoPath = logoFile ? await uploadOrganizationLogo(logoFile, organization.id) : undefined;
      await updateOrganization({ organizationId: organization.id, updates: { name: name.trim(), description: address.trim() || null, ...(logoPath ? { logo_url: logoPath } : {}) } });
      await onSaved?.();
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Unable to update the organization profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="general-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
      <section className="general-modal" role="dialog" aria-modal="true" aria-labelledby="organization-profile-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="general-modal-header"><h2 id="organization-profile-title">Edit Organization Profile</h2><button type="button" className="general-modal-close" onClick={onClose} disabled={isSaving} aria-label="Close"><X size={20} /></button></header>
        <div className="general-modal-content">
          <ProfileAvatarPicker avatarUrl={logoUrl} name={name} editForm={{ firstName: "", lastName: "" }} onAvatarChange={chooseLogo} className="profile-modal-avatar-upload general-organization-avatar-picker" />
          <label className="general-modal-field"><span>Organization Name <em>(Required)</em></span><input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
          <label className="general-modal-field"><span>Address</span><input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
          {error && <p className="general-modal-error" role="alert">{error}</p>}
        </div>
        <footer className="general-modal-footer"><button type="button" className="general-modal-cancel" onClick={onClose} disabled={isSaving}>Cancel</button><Button className="general-modal-update" disabled={!isValid || isSaving} onClick={save}>{isSaving ? "Updating..." : "Update"}</Button></footer>
      </section>
    </div>
  );
}

function PreferenceRow({ label, children }) {
  return <label className="general-preference-row"><span>{label}</span>{children}</label>;
}

function DataTileSection({ title, tiles, disabledLabel, locked = false }) {
  return (
    <section className="general-settings-card general-data-card" aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-title`}>
      <h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-title`}>{title}</h2>
      <div className="general-data-grid">
        {tiles.map(({ label, icon: TileIcon }) => <button type="button" className={`general-data-tile${locked ? " is-locked" : ""}`} key={label} disabled={locked} aria-label={`${label} unavailable`}><span className="general-data-tile-icon">{locked ? <LockKeyhole size={21} aria-hidden="true" /> : <TileIcon size={22} aria-hidden="true" />}</span><span>{label}</span></button>)}
        {disabledLabel && <div className="general-data-tile is-disabled" aria-disabled="true"><Archive size={30} aria-hidden="true" /><span>{disabledLabel}</span></div>}
      </div>
    </section>
  );
}

const exportTiles = [
  { label: "Work Orders", icon: ClipboardList }, { label: "Assets", icon: Gauge }, { label: "Asset Status", icon: ShieldCheck },
  { label: "Locations", icon: MapPin }, { label: "Parts List", icon: Wrench }, { label: "Parts Transactions", icon: Wrench },
  { label: "Purchase Orders", icon: FileText }, { label: "Meters", icon: Timer }, { label: "Readings", icon: Gauge }, { label: "Vendors", icon: Package },
  { label: "Requests", icon: FileDown }, { label: "Time & Cost Tracking", icon: Timer }, { label: "Labor Utilization", icon: Timer },
];

const importTiles = [
  { label: "Users", icon: UsersRound }, { label: "Locations", icon: MapPin }, { label: "Parts", icon: Wrench },
  { label: "Assets", icon: Gauge }, { label: "Work Orders", icon: ClipboardList },
];

function BuildVersion() {
  const [build, setBuild] = useState(import.meta.env.DEV ? "Build: local development" : "");

  useEffect(() => {
    if (import.meta.env.DEV) return undefined;

    fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setBuild(data?.build ?? ""))
      .catch(() => setBuild(""));
  }, []);

  if (!build) return null;
  return <footer className="settings-build-version">{build}</footer>;
}
