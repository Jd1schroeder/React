import { useState } from "react";
import { Info } from "lucide-react";
import { Select } from "../../components/ui/Select";
import { SettingsLayout } from "./SettingsLayout";
import { notificationGroups } from "./settingsConfig";
import "./NotificationSettingsPage.css";

export function NotificationSettingsPage({ onNavigate }) {
  const [notificationState, setNotificationState] = useState({});
  const toggleNotification = (key) => setNotificationState((current) => ({ ...current, [key]: !current[key] }));

  return <div className="settings-page notification-settings-page">
    <header className="settings-page-header"><p className="eyebrow">Personal Settings</p><h1>Notification Settings</h1><p>Configure how you receive notifications on Workbench.</p></header>
    <SettingsLayout pageName="Settings / Notification Settings" onNavigate={onNavigate}>
      <section className="notification-settings-content" aria-label="Notification settings">
        {notificationGroups.map((section) => <NotificationSection key={section.title} section={section} notificationState={notificationState} onToggle={toggleNotification} />)}
        <section className="notification-card notification-messages-card">
          <div><h2>Messages</h2><p>Select which in-app notifications you want to receive for message events.</p></div>
          <Select value="Only direct messages and mentions" onChange={() => {}} ariaLabel="Message notifications" options={["All messages", "Only direct messages and mentions", "None"]} />
        </section>
      </section>
    </SettingsLayout>
  </div>;
}

function NotificationSection({ section, notificationState, onToggle }) {
  return <section className="notification-card">
    <h2>{section.title}</h2>
    <p className="notification-card-description">{section.description}</p>
    <div className="notification-grid notification-grid-header" aria-hidden="true"><span /><span /><strong>Email</strong><strong>In App</strong></div>
    {section.groups.map((group) => <div className="notification-group" key={group.title || section.title}>
      {group.title && <h3>{group.title}</h3>}
      {group.events.map((event) => {
        const eventKey = `${section.title}-${group.title}-${event}`;
        return <div className="notification-grid notification-row" key={eventKey}>
          <span className="notification-row-spacer" />
          <span className="notification-event">{event}{event.toLowerCase().includes("mention") && <span className="notification-info" tabIndex="0" aria-label="Mentions settings information" data-tooltip="'Only mentions in comments' and 'All new comments' are exclusionary settings."><Info size={14} aria-hidden="true" /></span>}</span>
          <NotificationToggle label={`${event} email`} checked={notificationState[`${eventKey}-email`] ?? false} onChange={() => onToggle(`${eventKey}-email`)} />
          <NotificationToggle label={`${event} in app`} checked={notificationState[`${eventKey}-app`] ?? false} onChange={() => onToggle(`${eventKey}-app`)} />
        </div>;
      })}
    </div>)}
  </section>;
}

function NotificationToggle({ label, checked, onChange }) {
  return <label className="notification-toggle"><span className="sr-only">{label}</span><input type="checkbox" checked={checked} onChange={onChange} /><span aria-hidden="true" /></label>;
}
