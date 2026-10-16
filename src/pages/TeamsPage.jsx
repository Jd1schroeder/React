import { LockKeyhole, MoreVertical, Plus, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '../components/layout/PanelLayout'
import { Button } from '../components/ui/Button'
import { useWorkspace } from '../components/layout/useWorkspace'
import { getFeatureLabel } from '../utils/featureLabels'
import { listOrganizationTeams } from '../services/organizationService'
import { PeopleTabs } from './people/PeopleTabs'
import './PeoplePage.css'

export function TeamsPage({ onNavigate }) {
  const workspace = useWorkspace()
  const [teams, setTeams] = useState([])
  const [search, setSearch] = useState('')
  const [openTeamMenuId, setOpenTeamMenuId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const teamLabel = getFeatureLabel(workspace.organization?.feature_labels, 'team')
  const teamSingular = getFeatureLabel(workspace.organization?.feature_labels, 'team', 'singular')

  useEffect(() => {
    const organizationId = workspace.organization?.id
    Promise.resolve(organizationId ? listOrganizationTeams(organizationId) : [])
      .then(setTeams)
      .catch((loadError) => setError(loadError.message || `Unable to load ${teamLabel.toLowerCase()}.`))
      .finally(() => setIsLoading(false))
  }, [teamLabel, workspace.organization?.id])

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return teams
    return teams.filter((team) => `${team.name} ${team.description ?? ''}`.toLowerCase().includes(query))
  }, [search, teams])

  const administratorName = (team) => [team.administrator?.first_name, team.administrator?.last_name].filter(Boolean).join(' ') || '—'

  return (
    <PanelLayout
      title={`${teamLabel} / Users`}
      searchValue={search}
      onSearch={setSearch}
      searchPlaceholder={`Search ${teamLabel}`}
      actionLabel={`Create ${teamSingular.toLowerCase()}`}
      onAction={() => onNavigate('/teams/create')}
      showViewSelector={false}
      className="people-page teams-page"
      bodyClassName="people-body"
      subnavigation={<PeopleTabs active="teams" onNavigate={onNavigate} />}
    >
      <section className="people-table-card teams-table-card" aria-label={teamLabel}>
        {isLoading && <p className="people-state">Loading {teamLabel.toLowerCase()}...</p>}
        {!isLoading && error && <p className="people-state people-error" role="alert">{error}</p>}
        {!isLoading && !error && !filteredTeams.length && <div className="teams-empty-card"><UsersRound size={32} aria-hidden="true" /><h2>No {teamLabel.toLowerCase()} found</h2><p>Create a {teamSingular.toLowerCase()} to organize users and simplify work assignment.</p><Button onClick={() => onNavigate('/teams/create')}><Plus size={15} /> Create {teamSingular.toLowerCase()}</Button></div>}
        {!isLoading && !error && filteredTeams.length > 0 && <>
          <div className="teams-section-heading"><h2>My {teamLabel} ({filteredTeams.length})</h2></div>
          <table className="teams-table"><thead><tr><th>Name</th><th>Administrator</th><th>Members</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>
            {filteredTeams.map((team) => <tr key={team.id}>
              <td><button type="button" className="team-name-link" aria-label={team.name} onClick={() => onNavigate(`/teams/${encodeURIComponent(team.id)}`)}><span className="team-name-cell"><span className="team-color-dot" style={{ backgroundColor: team.color || 'var(--blue)' }}>{team.name.slice(0, 1).toUpperCase()}</span><span>{team.name}</span></span></button></td>
              <td>{administratorName(team)}</td>
              <td>{team.memberCount} {team.memberCount === 1 ? 'Member' : 'Members'}</td>
              <td className="team-actions-cell"><div className="team-row-actions"><button type="button" className="team-row-action" aria-label={`Actions for ${team.name}`} aria-expanded={openTeamMenuId === team.id} onClick={() => setOpenTeamMenuId((current) => current === team.id ? null : team.id)}><MoreVertical size={20} strokeWidth={2} /></button>{openTeamMenuId === team.id && <div className="team-row-menu" role="menu" aria-label={`Actions for ${team.name}`}><button type="button" role="menuitem" onClick={() => onNavigate(`/teams/${encodeURIComponent(team.id)}`)}><span>See Details</span></button><button type="button" role="menuitem" disabled><span>Invite Members</span><LockKeyhole size={14} aria-hidden="true" /></button><button type="button" role="menuitem" disabled><span>Send Message</span><LockKeyhole size={14} aria-hidden="true" /></button><button type="button" role="menuitem" className="is-danger" disabled><span>Delete</span><LockKeyhole size={14} aria-hidden="true" /></button></div>}</div></td>
            </tr>)}
          </tbody></table>
        </>}
      </section>
    </PanelLayout>
  )
}
