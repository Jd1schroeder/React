import { LockKeyhole, MoreVertical, Plus, Search, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "../../components/ui/DataTable";
import { LoadingState } from "../../components/ui/LoadingState";
import { useWorkspace } from "../../components/layout/useWorkspace";
import { listOrganizationTeams } from "../../services/organizationService";
import { SettingsLayout } from "./SettingsLayout";
import { TeammateTabs } from "./TeammateTabs";
import "./TeammateTeamsPage.css";

export function TeammateTeamsPage({ onNavigate }) {
  const workspace = useWorkspace();
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTeamMenuId, setOpenTeamMenuId] = useState(null);

  useEffect(() => {
    if (!openTeamMenuId) return undefined;
    const dismissMenu = (event) => {
      if (!event.target.closest(".teammate-team-actions")) setOpenTeamMenuId(null);
    };
    document.addEventListener("pointerdown", dismissMenu);
    return () => document.removeEventListener("pointerdown", dismissMenu);
  }, [openTeamMenuId]);

  useEffect(() => {
    const organizationId = workspace.organization?.id;
    Promise.resolve(organizationId ? listOrganizationTeams(organizationId) : [])
      .then(setTeams)
      .catch((loadError) => setError(loadError.message || "Unable to load teams."))
      .finally(() => setIsLoading(false));
  }, [workspace.organization?.id]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? teams.filter((team) => `${team.name} ${team.description ?? ""}`.toLowerCase().includes(query)) : teams;
  }, [search, teams]);
  const administratorName = (team) => [team.administrator?.first_name, team.administrator?.last_name].filter(Boolean).join(" ") || "—";
  const teamColumns = [
    { key: "name", label: "Team Name", width: "40%", sortValue: (team) => team.name, render: (team) => <button type="button" className="teammate-team-name" onClick={() => onNavigate(`/teams/${encodeURIComponent(team.id)}`)}><span className="teammate-team-color" style={{ backgroundColor: team.color || "var(--blue)" }}>{team.name.slice(0, 1).toUpperCase()}</span><span>{team.name}</span></button> },
    { key: "administrator", label: "Team Administrator", width: "34%", sortValue: administratorName, render: (team) => administratorName(team) },
    { key: "members", label: "Members", width: "22%", sortValue: (team) => team.memberCount ?? 0, render: (team) => `${team.memberCount ?? 0} ${team.memberCount === 1 ? "Member" : "Members"}` },
    { key: "actions", label: "", width: "48px", sortable: false, render: (team) => <div className="teammate-team-actions"><button type="button" className="teammate-team-action" aria-label={`Actions for ${team.name}`} aria-expanded={openTeamMenuId === team.id} onClick={() => setOpenTeamMenuId((current) => current === team.id ? null : team.id)}><MoreVertical size={20} /></button>{openTeamMenuId === team.id && <div className="teammate-team-menu" role="menu" aria-label={`Actions for ${team.name}`}><button type="button" role="menuitem" onClick={() => onNavigate(`/teams/${encodeURIComponent(team.id)}`)}>See Details</button><button type="button" role="menuitem" onClick={() => onNavigate(`/teams/${encodeURIComponent(team.id)}/addmembers`)}>Invite Members</button><button type="button" role="menuitem" disabled><span>Send Message</span><LockKeyhole size={14} aria-hidden="true" /></button><button type="button" role="menuitem" className="is-danger" disabled><span>Delete</span><LockKeyhole size={14} aria-hidden="true" /></button></div>}</div> },
  ];

  return <div className="settings-page teammate-teams-page">
    <header className="settings-page-header"><p className="eyebrow">Organization Settings</p><h1>Manage Teammates</h1><p>Manage members, roles, and workspace access.</p></header>
    <SettingsLayout pageName="Settings / Manage Teammates" onNavigate={onNavigate}>
      <section className="settings-content teammate-teams-card" aria-labelledby="teammate-teams-title">
        <div className="teammate-section-header"><div><h2 id="teammate-teams-title">Teams</h2><p>Organize users into teams to simplify work assignment and reporting.</p></div><div className="teammate-section-actions"><label className="teammate-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teams" aria-label="Search teams" />{search && <button type="button" className="teammate-clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}</label><button type="button" className="teammate-primary-action" onClick={() => onNavigate("/teams/create")}><Plus size={15} /> Create team</button></div></div>
        <TeammateTabs active="teams" onNavigate={onNavigate} />
        {isLoading && <LoadingState message="Loading teams..." />}
        {!isLoading && error && <p className="teammate-state teammate-error" role="alert">{error}</p>}
        {!isLoading && !error && !filteredTeams.length && <div className="teammate-empty-state"><UsersRound size={32} aria-hidden="true" /><h3>{search ? "No teams match your search" : "No teams found"}</h3><p>{search ? "Try a different search." : "Create a team to organize users and simplify work assignment."}</p><button type="button" className="teammate-secondary-action" onClick={() => onNavigate("/teams/create")}>Create team</button></div>}
        {!isLoading && !error && filteredTeams.length > 0 && <><div className="teammate-teams-heading">My Teams ({filteredTeams.length})</div><section className="teammate-teams-table"><DataTable ariaLabel="Teams" columns={teamColumns} rows={filteredTeams} rowKey={(team) => team.id} initialSortKey="name" emptyState="No teams found." /></section></>}
      </section>
    </SettingsLayout>
  </div>;
}
