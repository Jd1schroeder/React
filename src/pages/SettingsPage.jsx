import { GeneralSettingsPage } from "./settings/GeneralSettingsPage";
import { InviteUsersPage } from "./settings/InviteUsersPage";
import { ManageTeammatesPage } from "./settings/ManageTeammatesPage";
import { NotificationSettingsPage } from "./settings/NotificationSettingsPage";
import { ProfilePreferencesPage } from "./settings/ProfilePreferencesPage";
import { RolesPage } from "./settings/RolesPage";
import { TeammateTeamsPage } from "./settings/TeammateTeamsPage";
import "./SettingsPage.css";

export function SettingsPage({ pageName, onNavigate }) {
  if (pageName === "Settings / Manage Teammates") return <ManageTeammatesPage onNavigate={onNavigate} />;
  if (pageName === "Settings / Teammates / Roles") return <RolesPage onNavigate={onNavigate} />;
  if (pageName === "Settings / Teammates / Teams") return <TeammateTeamsPage onNavigate={onNavigate} />;
  if (pageName === "Settings / Invite Users") return <InviteUsersPage onNavigate={onNavigate} />;
  if (pageName === "Settings / Profile Preferences") return <ProfilePreferencesPage onNavigate={onNavigate} />;
  if (pageName === "Settings / Notification Settings") return <NotificationSettingsPage onNavigate={onNavigate} />;
  return <GeneralSettingsPage pageName={pageName} onNavigate={onNavigate} />;
}
