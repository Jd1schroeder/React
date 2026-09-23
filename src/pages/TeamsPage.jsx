import { UsersRound } from 'lucide-react'
import { PanelLayout } from '../components/layout/PanelLayout'
import { PeopleTabs } from './people/PeopleTabs'
import './PeoplePage.css'

export function TeamsPage({ onNavigate }) {
  return (
    <PanelLayout
      title="Teams / Users"
      searchPlaceholder="Search Teams"
      actionLabel="Create team"
      showViewSelector={false}
      className="people-page teams-page"
      bodyClassName="people-body"
      subnavigation={<PeopleTabs active="teams" onNavigate={onNavigate} />}
    >
      <section className="teams-empty-card" aria-label="Teams">
        <UsersRound size={32} aria-hidden="true" />
        <h2>Teams</h2>
        <p>Organize users into teams to simplify work assignment and reporting.</p>
        <button type="button" className="teams-empty-action" onClick={() => onNavigate('Users')}>View users</button>
      </section>
    </PanelLayout>
  )
}
