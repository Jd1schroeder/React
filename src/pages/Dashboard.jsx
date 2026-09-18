import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

export function Dashboard({ onNavigate }) {
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const metadata = data.user?.user_metadata
      setDisplayName(metadata?.first_name || metadata?.full_name || '')
    })
  }, [])

  return <>
    <div className="page-heading"><div><p className="eyebrow">Workspace overview</p><h1>{displayName ? `Good morning, ${displayName}` : 'Good morning'}</h1><p className="muted">Your workspace activity will appear here once records are added.</p></div><Button onClick={() => onNavigate('Work Orders')}>+ Create work order</Button></div>
    <section className="stats-grid"><div className="panel dashboard-empty-card"><ClipboardList size={22} /><strong>No operational data yet</strong><span>Connect your workspace data to see work order metrics.</span></div></section>
    <section className="panel dashboard-empty-panel"><div className="panel-heading"><div><h2>Recent work orders</h2><p className="muted">New work orders will appear here.</p></div><button className="text-button" onClick={() => onNavigate('Work Orders')}>View all →</button></div><div className="dashboard-empty-state">No work orders have been added yet.</div></section>
  </>
}
