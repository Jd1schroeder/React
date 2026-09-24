import { Search, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { SettingsLayout } from "./SettingsLayout";
import { TeammateTabs } from "./TeammateTabs";
import "./TeammateTeamsPage.css";

export function TeammateTeamsPage({ onNavigate }) {
  const [search, setSearch] = useState("");

  return <div className="settings-page teammate-teams-page">
    <header className="settings-page-header"><p className="eyebrow">Organization Settings</p><h1>Manage Teammates</h1><p>Manage members, roles, and workspace access.</p></header>
    <SettingsLayout pageName="Settings / Manage Teammates" onNavigate={onNavigate}>
      <section className="settings-content teammate-teams-card" aria-labelledby="teammate-teams-title">
        <div className="teammate-section-header"><div><h2 id="teammate-teams-title">Teams</h2><p>Organize users into teams to simplify work assignment and reporting.</p></div><div className="teammate-section-actions"><label className="teammate-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teams" aria-label="Search teams" />{search && <button type="button" className="teammate-clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}</label><button type="button" className="teammate-primary-action" disabled>Create team</button></div></div>
        <TeammateTabs active="teams" onNavigate={onNavigate} />
        <div className="teammate-empty-state"><UsersRound size={32} aria-hidden="true" /><h3>Teams are not connected yet</h3><p>The team model will appear here when team persistence is implemented.</p><button type="button" className="teammate-secondary-action" onClick={() => onNavigate("/settings/teammates/users")}>View users</button></div>
      </section>
    </SettingsLayout>
  </div>;
}
