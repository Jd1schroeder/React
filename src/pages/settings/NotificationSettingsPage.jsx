import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight, ClipboardCheck, FileText, Info, MessageSquare, MessagesSquare } from "lucide-react";
import { Select } from "../../components/ui/Select";
import { SettingsLayout } from "./SettingsLayout";
import { notificationGroups } from "./settingsConfig";
import { loadNotificationSettings, saveNotificationSettings } from "../../services/notificationPreferenceService";
import "./NotificationSettingsPage.css";

const MESSAGE_MODES = ["All messages", "Only direct messages and mentions", "None"];
const MESSAGE_MODE_OPTIONS = [
  { value: "All messages", label: "Every new Message" },
  { value: "Only direct messages and mentions", label: "Only direct messages and mentions" },
  { value: "None", label: "Nothing" },
];
const MESSAGE_MODE_KEY = "Messages.mode";
const DEFAULT_NOTIFICATION_SETTINGS = { [MESSAGE_MODE_KEY]: "Only direct messages and mentions" };
const NOTIFICATION_CATEGORIES = [
  ...notificationGroups.filter((section) => ["Work Orders", "Requests", "Purchase Orders"].includes(section.title)),
  { title: "Messages", description: "Choose which message activity you want to hear about.", groups: [] },
];
const CHANNELS = [
  { id: "push", title: "Push Notifications" },
  { id: "email", title: "Email Notifications" },
];
const CATEGORY_ICONS = {
  "Work Orders": ClipboardCheck,
  Requests: MessageSquare,
  "Purchase Orders": FileText,
  Messages: MessagesSquare,
};

export function NotificationSettingsPage({ onNavigate, onMobileHeaderTitleChange, onMobileHeaderBackChange }) {
  const [notificationState, setNotificationState] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const notificationStateRef = useRef(DEFAULT_NOTIFICATION_SETTINGS);
  const saveQueueRef = useRef(Promise.resolve());
  const saveVersionRef = useRef(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    let isActive = true;
    loadNotificationSettings()
      .then((savedSettings) => {
        if (!isActive) return;
        const nextSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...savedSettings };
        notificationStateRef.current = nextSettings;
        setNotificationState(nextSettings);
      })
      .catch((error) => {
        if (isActive) setLoadError(error.message || "Unable to load notification settings.");
      })
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [loadAttempt]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError("");
    setLoadAttempt((attempt) => attempt + 1);
  };

  const updateSetting = (key, value) => {
    const nextSettings = { ...notificationStateRef.current, [key]: value };
    notificationStateRef.current = nextSettings;
    setNotificationState(nextSettings);
    const version = ++saveVersionRef.current;
    setSaveState("saving");
    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(() => saveNotificationSettings(nextSettings))
      .then(() => { if (version === saveVersionRef.current) setSaveState("saved"); })
      .catch(() => { if (version === saveVersionRef.current) setSaveState("error"); });
  };

  const retrySave = () => {
    const version = ++saveVersionRef.current;
    const currentSettings = notificationStateRef.current;
    setSaveState("saving");
    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(() => saveNotificationSettings(currentSettings))
      .then(() => { if (version === saveVersionRef.current) setSaveState("saved"); })
      .catch(() => { if (version === saveVersionRef.current) setSaveState("error"); });
  };

  const toggleNotification = (key, channel, checked) => updateSetting(`${key}.${channel}`, checked);
  const selectedSection = NOTIFICATION_CATEGORIES.find((section) => section.title === selectedCategory);
  const selectedChannelDetails = CHANNELS.find((channel) => channel.id === selectedChannel);

  useEffect(() => {
    onMobileHeaderTitleChange?.(selectedSection?.title || "Notification Settings");
  }, [onMobileHeaderTitleChange, selectedSection]);

  useEffect(() => {
    if (!onMobileHeaderBackChange) return;
    if (selectedChannel) onMobileHeaderBackChange(() => setSelectedChannel(null));
    else if (selectedSection) onMobileHeaderBackChange(() => setSelectedCategory(null));
    else onMobileHeaderBackChange(null);
  }, [onMobileHeaderBackChange, selectedChannel, selectedSection]);

  return <div className="settings-page notification-settings-page">
    <header className="settings-page-header"><p className="eyebrow">Personal Settings</p><h1>Notification Settings</h1><p>Configure how you receive notifications on Workbench.</p></header>
    <SettingsLayout pageName="Settings / Notification Settings" onNavigate={onNavigate}>
      <section className="notification-settings-content" aria-label="Notification settings">
        <div className="notification-desktop-save-status"><NotificationSaveStatus isLoading={isLoading} loadError={loadError} saveState={saveState} onRetryLoad={retryLoad} onRetrySave={retrySave} /></div>
        <div className="notification-desktop-settings" aria-busy={isLoading}>
          {notificationGroups.map((section) => <NotificationSection key={section.title} section={section} notificationState={notificationState} onToggle={toggleNotification} disabled={isLoading || Boolean(loadError)} />)}
          <section className="notification-card notification-messages-card">
            <div><h2>Messages</h2><p>Select which in-app notifications you want to receive for message events.</p></div>
            <Select value={notificationState[MESSAGE_MODE_KEY]} onChange={(value) => updateSetting(MESSAGE_MODE_KEY, value)} ariaLabel="Message notifications" options={MESSAGE_MODES} disabled={isLoading || Boolean(loadError)} />
          </section>
        </div>
        <MobileNotificationSettings
          categories={NOTIFICATION_CATEGORIES}
          selectedCategory={selectedSection}
          selectedChannel={selectedChannelDetails}
          notificationState={notificationState}
          isLoading={isLoading}
          loadError={loadError}
          saveState={saveState}
          onRetryLoad={retryLoad}
          onRetrySave={retrySave}
          onSelectCategory={(category) => { setSelectedCategory(category.title); setSelectedChannel(null); }}
          onSelectChannel={setSelectedChannel}
          onToggle={toggleNotification}
          onSetMessageMode={(mode) => updateSetting(MESSAGE_MODE_KEY, mode)}
        />
      </section>
    </SettingsLayout>
  </div>;
}

function NotificationSaveStatus({ isLoading, loadError, saveState, onRetryLoad, onRetrySave }) {
  if (isLoading) return <p className="notification-save-status" role="status">Loading your notification settings...</p>;
  if (loadError) return <div className="notification-save-status is-error" role="alert"><span>{loadError}</span><button type="button" onClick={onRetryLoad}>Try again</button></div>;
  if (saveState === "saving") return <p className="notification-save-status" role="status">Saving changes...</p>;
  if (saveState === "error") return <div className="notification-save-status is-error" role="alert"><span>Changes couldn’t be saved.</span><button type="button" onClick={onRetrySave}>Try again</button></div>;
  if (saveState === "saved") return <p className="notification-save-status" role="status">Changes saved</p>;
  return null;
}

function NotificationSection({ section, notificationState, onToggle, disabled }) {
  return <section className="notification-card">
    <h2>{section.title}</h2>
    <p className="notification-card-description">{section.description}</p>
    <div className="notification-grid notification-grid-header" aria-hidden="true"><span /><span /><strong>Email</strong><strong>In App</strong></div>
    {section.groups.map((group) => <div className="notification-group" key={group.title || section.title}>
      {group.title && <h3>{group.title}</h3>}
      {group.events.map((event) => {
        const eventKey = getEventKey(section, group, event);
        return <div className="notification-grid notification-row" key={eventKey}>
          <span className="notification-row-spacer" />
          <span className="notification-event">{event}{event.toLowerCase().includes("mention") && <span className="notification-info" tabIndex="0" aria-label="Mentions settings information" data-tooltip="'Only mentions in comments' and 'All new comments' are exclusionary settings."><Info size={14} aria-hidden="true" /></span>}</span>
          <NotificationToggle label={`${event} email`} checked={notificationState[`${eventKey}.email`] ?? false} onChange={(checked) => onToggle(eventKey, "email", checked)} disabled={disabled} />
          <NotificationToggle label={`${event} in app`} checked={notificationState[`${eventKey}.app`] ?? false} onChange={(checked) => onToggle(eventKey, "app", checked)} disabled={disabled} />
        </div>;
      })}
    </div>)}
  </section>;
}

function MobileNotificationSettings({ categories, selectedCategory, selectedChannel, notificationState, isLoading, loadError, saveState, onRetryLoad, onRetrySave, onSelectCategory, onSelectChannel, onToggle, onSetMessageMode }) {
  return <div className="notification-mobile-settings" aria-busy={isLoading}>
    {!selectedCategory ? <section className="notification-mobile-card" aria-label="Notification categories">
      <MobileNotificationSaveStatus isLoading={isLoading} loadError={loadError} saveState={saveState} onRetryLoad={onRetryLoad} onRetrySave={onRetrySave} />
      {!isLoading && !loadError && categories.map((category) => {
        const Icon = CATEGORY_ICONS[category.title] || Bell;
        return <button className="notification-mobile-category-row" type="button" key={category.title} onClick={() => onSelectCategory(category)}>
          <span className="notification-mobile-category-icon"><Icon size={22} aria-hidden="true" /></span>
          <span className="notification-mobile-category-name">{category.title}</span>
          <ChevronRight size={22} aria-hidden="true" />
        </button>;
      })}
    </section> : selectedCategory.title === "Work Orders" && !selectedChannel ? <div className="notification-mobile-channel-screen">
      <p className="notification-mobile-channel-instruction">Select your preferences by notification type</p>
      <section className="notification-mobile-card" aria-label={`${selectedCategory.title} notification channels`}>
        <MobileNotificationSaveStatus isLoading={isLoading} loadError={loadError} saveState={saveState} onRetryLoad={onRetryLoad} onRetrySave={onRetrySave} />
        <div className="notification-mobile-channel-list">
        {CHANNELS.map((channel) => <button className="notification-mobile-channel-row" type="button" key={channel.id} onClick={() => onSelectChannel(channel.id)}>
          <span>{channel.title}</span><ChevronRight size={22} aria-hidden="true" />
        </button>)}
        </div>
      </section>
    </div> : selectedCategory.title === "Work Orders" ? <div className="notification-mobile-event-screen">
      <h2 className="notification-mobile-channel-heading">{selectedChannel.title}</h2>
      <section className="notification-mobile-card" aria-label={`${selectedCategory.title} ${selectedChannel.title}`}>
        <MobileNotificationSaveStatus isLoading={isLoading} loadError={loadError} saveState={saveState} onRetryLoad={onRetryLoad} onRetrySave={onRetrySave} />
        <NotificationEventGroups section={selectedCategory} channel={selectedChannel.id} notificationState={notificationState} onToggle={onToggle} disabled={isLoading || Boolean(loadError)} />
      </section>
    </div> : <DirectCategorySettings section={selectedCategory} notificationState={notificationState} isLoading={isLoading} loadError={loadError} saveState={saveState} onRetryLoad={onRetryLoad} onRetrySave={onRetrySave} onToggle={onToggle} onSetMessageMode={onSetMessageMode} />}
  </div>;
}

function DirectCategorySettings({ section, notificationState, isLoading, loadError, saveState, onRetryLoad, onRetrySave, onToggle, onSetMessageMode }) {
  if (section.title === "Messages") {
    return <div className="notification-mobile-direct-screen">
      <p className="notification-mobile-direct-description">Select which Push Notifications you want to receive for Message events</p>
      <section className="notification-mobile-card" aria-label="Message push notification preferences">
        <MobileNotificationSaveStatus isLoading={isLoading} loadError={loadError} saveState={saveState} onRetryLoad={onRetryLoad} onRetrySave={onRetrySave} />
        <MessageModeOptions value={notificationState[MESSAGE_MODE_KEY]} onChange={onSetMessageMode} disabled={isLoading || Boolean(loadError)} />
      </section>
    </div>;
  }

  if (section.title === "Purchase Orders") {
    const approvalEvent = section.groups.find((group) => group.title === "Requires approval")?.events[0];
    const eventKey = approvalEvent ? getEventKey(section, { title: "Requires approval" }, approvalEvent) : null;
    return <div className="notification-mobile-direct-screen">
      <p className="notification-mobile-direct-description">Configure how you receive email notifications for Purchase Orders events:</p>
      <section className="notification-mobile-card notification-mobile-purchase-card" aria-label="Purchase Order email preferences">
        <MobileNotificationSaveStatus isLoading={isLoading} loadError={loadError} saveState={saveState} onRetryLoad={onRetryLoad} onRetrySave={onRetrySave} />
        {eventKey && <div className="notification-mobile-event notification-mobile-purchase-event"><span>Purchase Orders created and needs approval</span><NotificationToggle label={approvalEvent} checked={notificationState[`${eventKey}.email`] ?? false} onChange={(checked) => onToggle(eventKey, "email", checked)} disabled={isLoading || Boolean(loadError)} /></div>}
      </section>
    </div>;
  }

  return <div className="notification-mobile-direct-screen notification-mobile-request-settings">
    <MobileNotificationSaveStatus isLoading={isLoading} loadError={loadError} saveState={saveState} onRetryLoad={onRetryLoad} onRetrySave={onRetrySave} />
    {["email", "push"].map((channel) => <section className="notification-mobile-direct-channel" key={channel}>
      <h2>{channel === "push" ? "Push Notifications" : "Email Notifications"}</h2>
      <div className="notification-mobile-card" aria-label={`Request ${channel} preferences`}>
        <NotificationEventGroups section={section} channel={channel} notificationState={notificationState} onToggle={onToggle} disabled={isLoading || Boolean(loadError)} />
      </div>
    </section>)}
  </div>;
}

function MobileNotificationSaveStatus({ isLoading, loadError, saveState, onRetryLoad, onRetrySave }) {
  if (isLoading) return <p className="notification-mobile-status" role="status">Loading your notification settings...</p>;
  if (loadError) return <div className="notification-mobile-status is-error" role="alert"><span>{loadError}</span><button type="button" onClick={onRetryLoad}>Try again</button></div>;
  if (saveState === "saving") return <p className="notification-mobile-status" role="status">Saving changes...</p>;
  if (saveState === "error") return <div className="notification-mobile-status is-error" role="alert"><span>Changes couldnâ€™t be saved.</span><button type="button" onClick={onRetrySave}>Try again</button></div>;
  return null;
}

function NotificationEventGroups({ section, channel, notificationState, onToggle, disabled }) {
  return <div className="notification-mobile-events">
    {section.groups.map((group) => <div className="notification-mobile-event-group" key={group.title || section.title}>
      {group.title && <h3>{group.title}</h3>}
      {group.events.map((event) => {
        const eventKey = getEventKey(section, group, event);
        const settingKey = `${eventKey}.${channel}`;
        return <div className="notification-mobile-event" key={eventKey}><span>{event}</span><NotificationToggle label={`${event} ${channel}`} checked={notificationState[settingKey] ?? false} onChange={(checked) => onToggle(eventKey, channel, checked)} disabled={disabled} /></div>;
      })}
    </div>)}
  </div>;
}

function MessageModeOptions({ value, onChange, disabled }) {
  return <fieldset className="notification-message-mode-options">
    {MESSAGE_MODE_OPTIONS.map((mode) => <label key={mode.value}>
      <span>{mode.label}</span>
      <input type="radio" name="message-notification-mode" value={mode.value} checked={value === mode.value} disabled={disabled} onChange={() => onChange(mode.value)} />
    </label>)}
  </fieldset>;
}

function NotificationToggle({ label, checked, onChange, disabled = false }) {
  return <label className={`notification-toggle${disabled ? " is-disabled" : ""}`}><span className="sr-only">{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" /></label>;
}

function getEventKey(section, group, event) {
  return `${section.title}.${group.title || "General"}.${event}`;
}
