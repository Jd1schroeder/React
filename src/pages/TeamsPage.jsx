import { UsersRound } from 'lucide-react'
import { PanelLayout } from '../components/layout/PanelLayout'
import { useWorkspace } from '../components/layout/useWorkspace'
import { getFeatureLabel } from '../utils/featureLabels'
import { PeopleTabs } from './people/PeopleTabs'
import './PeoplePage.css'

export function TeamsPage({ onNavigate }) {
  const workspace = useWorkspace()
  const teamLabel = getFeatureLabel(workspace.organization?.feature_labels, 'team')
  return (
    <PanelLayout
      title={`${teamLabel} / Users`}
      searchPlaceholder={`Search ${teamLabel}`}
      actionLabel={`Create ${getFeatureLabel(workspace.organization?.feature_labels, 'team', 'singular').toLowerCase()}`}
      showViewSelector={false}
      className="people-page teams-page"
      bodyClassName="people-body"
      subnavigation={<PeopleTabs active="teams" onNavigate={onNavigate} />}
    >
      <section className="teams-empty-card" aria-label={teamLabel}>
        <UsersRound size={32} aria-hidden="true" />
        <h2>{teamLabel}</h2>
        <p>Organize users into teams to simplify work assignment and reporting.</p>
        <button type="button" className="teams-empty-action" onClick={() => onNavigate('Users')}>View users</button>
      </section>
    </PanelLayout>
  )
}
