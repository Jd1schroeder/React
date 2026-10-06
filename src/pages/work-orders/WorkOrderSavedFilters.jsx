import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bookmark, Pencil, Plus, Search, Trash2, WandSparkles, X } from 'lucide-react'
import { normalizeWorkOrderFilters } from '../../utils/workOrderFilters'
import './WorkOrderSavedFilters.css'

export function WorkOrderSavedFilters({
  filters = [],
  savedFilters = [],
  loading = false,
  error = '',
  loaded = false,
  canSave = false,
  canManageOrganization = false,
  userId,
  activeSavedFilterId = null,
  onBeforeOpen = () => {},
  onLoad = () => Promise.resolve(),
  onApply = () => {},
  onCreate = () => Promise.resolve(),
  onUpdate = () => Promise.resolve(),
  onDelete = () => Promise.resolve(),
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [scopeTab, setScopeTab] = useState('personal')
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState(null)
  const [editor, setEditor] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [scopeDraft, setScopeDraft] = useState('personal')
  const [saving, setSaving] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [actionError, setActionError] = useState('')
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const currentFilters = normalizeWorkOrderFilters(filters)

  const visibleFilters = useMemo(() => savedFilters
    .filter((item) => item.filter_scope === scopeTab)
    .filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [savedFilters, scopeTab, search])

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !panelRef.current) return undefined
    const updatePosition = () => {
      if (!triggerRef.current || !panelRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const gutter = 8
      const width = Math.min(360, window.innerWidth - gutter * 2)
      const naturalHeight = panelRef.current.scrollHeight
      const height = Math.min(naturalHeight, window.innerHeight - gutter * 2)
      const left = Math.max(gutter, Math.min(rect.right - width, window.innerWidth - width - gutter))
      const top = Math.max(gutter, Math.min(rect.bottom + gutter, window.innerHeight - height - gutter))
      setPosition({ top, left, maxHeight: window.innerHeight - gutter * 2 })
    }
    updatePosition()
    document.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      document.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, scopeTab, visibleFilters.length, loading, search, error])

  useEffect(() => {
    if (!isOpen) return undefined
    const dismiss = (event) => {
      if (event.target.closest?.('.work-order-saved-filter-modal-backdrop')) return
      if (!rootRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setIsOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (editor) {
        setEditor(null)
        setEditorError('')
        return
      }
      setIsOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, editor])

  useEffect(() => {
    if (!editor) return undefined
    document.querySelector('.work-order-saved-filter-editor input')?.focus()
    return undefined
  }, [editor])

  const openPanel = () => {
    const nextOpen = !isOpen
    onBeforeOpen()
    setIsOpen(nextOpen)
    setActionError('')
    if (nextOpen && !loaded && !loading) void onLoad()
  }

  const openCreateEditor = () => {
    setNameDraft('')
    setScopeDraft('personal')
    setEditor({ mode: 'create' })
    setEditorError('')
  }

  const openUpdateEditor = (item) => {
    setNameDraft(item.name)
    setScopeDraft(item.filter_scope)
    setEditor({ mode: 'edit', item })
    setEditorError('')
  }

  const canManageFilter = (item) => item.filter_scope === 'organization'
    ? canManageOrganization
    : canSave && item.created_by === userId

  const saveFilter = async (event) => {
    event.preventDefault()
    setSaving(true)
    setEditorError('')
    try {
      if (editor.mode === 'edit') {
        await onUpdate({
          savedFilterId: editor.item.id,
          filterScope: editor.item.filter_scope,
          name: nameDraft,
          filters: editor.item.filters,
        })
      } else {
        await onCreate({ name: nameDraft, filterScope: scopeDraft, filters: currentFilters })
      }
      setEditor(null)
    } catch (saveError) {
      setEditorError(saveError.message || 'Unable to save this filter.')
    } finally {
      setSaving(false)
    }
  }

  const deleteFilter = async (item) => {
    setDeletingId(item.id)
    setActionError('')
    try {
      await onDelete({ savedFilterId: item.id, filterScope: item.filter_scope })
      setDeleteTargetId(null)
    } catch (deleteError) {
      setActionError(deleteError.message || 'Unable to delete this filter.')
    } finally {
      setDeletingId(null)
    }
  }

  return <div className="work-order-saved-filters" ref={rootRef}>
    <button
      ref={triggerRef}
      type="button"
      className={`filter-button work-order-saved-filters-trigger${isOpen ? ' is-active' : ''}`}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      onClick={openPanel}
    >
      <WandSparkles size={14} aria-hidden="true" /> My Filters
    </button>
    {isOpen && createPortal(<section
      ref={panelRef}
      className="work-order-saved-filters-panel"
      role="dialog"
      aria-label="My saved Work Order filters"
      style={{ top: position?.top ?? 0, left: position?.left ?? 0, maxHeight: position?.maxHeight ?? 'calc(100vh - 16px)', visibility: position ? 'visible' : 'hidden' }}
    >
      <label className="work-order-saved-filters-search">
        <Search size={16} aria-hidden="true" />
        <span className="work-order-saved-filters-sr-only">Search saved filters</span>
        <input type="search" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <div className="work-order-saved-filters-tabs" role="tablist" aria-label="Saved filter collection">
        <button type="button" role="tab" aria-selected={scopeTab === 'personal'} className={scopeTab === 'personal' ? 'is-active' : ''} onClick={() => { setScopeTab('personal'); setDeleteTargetId(null) }}>Personal Filters</button>
        <button type="button" role="tab" aria-selected={scopeTab === 'organization'} className={scopeTab === 'organization' ? 'is-active' : ''} onClick={() => { setScopeTab('organization'); setDeleteTargetId(null) }}>Organization Filters</button>
      </div>
      <div className="work-order-saved-filters-list" role="radiogroup" aria-label={`${scopeTab === 'personal' ? 'Personal' : 'Organization'} filters`}>
        {loading && <p className="work-order-saved-filters-state" role="status">Loading saved filters…</p>}
        {!loading && error && <div className="work-order-saved-filters-state" role="alert"><p>{error}</p><button type="button" onClick={() => void onLoad()}>Try again</button></div>}
        {!loading && !error && visibleFilters.map((item) => <div className="work-order-saved-filter-row" key={item.id}>
          <input
            id={`saved-filter-${item.id}`}
            type="radio"
            name="active-work-order-saved-filter"
            checked={activeSavedFilterId === item.id}
            onChange={() => { onApply(item); setIsOpen(false) }}
          />
          <label htmlFor={`saved-filter-${item.id}`} className="work-order-saved-filter-label">
            <span>{item.name}</span><small>{normalizeWorkOrderFilters(item.filters).length} {normalizeWorkOrderFilters(item.filters).length === 1 ? 'filter' : 'filters'}</small>
          </label>
          {canManageFilter(item) && <div className="work-order-saved-filter-actions">
            {deleteTargetId === item.id
              ? <><span>Delete?</span><button type="button" aria-label={`Confirm delete ${item.name}`} disabled={deletingId === item.id} onClick={() => void deleteFilter(item)}>{deletingId === item.id ? 'Deleting…' : 'Delete'}</button><button type="button" aria-label="Cancel delete" onClick={() => setDeleteTargetId(null)}>Cancel</button></>
              : <><button type="button" aria-label={`Rename ${item.name}`} onClick={() => openUpdateEditor(item)}><Pencil size={14} aria-hidden="true" /></button><button type="button" aria-label={`Delete ${item.name}`} onClick={() => { setActionError(''); setDeleteTargetId(item.id) }}><Trash2 size={14} aria-hidden="true" /></button></>}
          </div>}
        </div>)}
        {!loading && !error && visibleFilters.length === 0 && <p className="work-order-saved-filters-state">{search.trim() ? 'No saved filters match your search.' : scopeTab === 'personal' ? 'You don’t have any personal filters yet.' : 'Your organization doesn’t have any shared filters yet.'}</p>}
      </div>
      {actionError && <p className="work-order-saved-filters-error" role="alert">{actionError}</p>}
      {canSave && <footer className="work-order-saved-filters-footer">
        <button type="button" onClick={openCreateEditor} disabled={!currentFilters.length} title={!currentFilters.length ? 'Add a filter before saving.' : undefined}>
          <Plus size={15} aria-hidden="true" /> Save current filters
        </button>
        {!currentFilters.length && <small>Add at least one filter to save it.</small>}
      </footer>}
      {editor && createPortal(<div className="work-order-saved-filter-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditor(null) }}>
        <form className="work-order-saved-filter-editor" role="dialog" aria-modal="true" aria-labelledby="saved-filter-editor-title" onSubmit={saveFilter}>
          <header><div><Bookmark size={17} aria-hidden="true" /><h2 id="saved-filter-editor-title">{editor.mode === 'edit' ? 'Rename saved filter' : 'Save current filters'}</h2></div><button type="button" aria-label="Close" onClick={() => setEditor(null)} disabled={saving}><X size={18} /></button></header>
          <label className="work-order-saved-filter-name">Filter name<input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={80} required autoComplete="off" /></label>
          {editor.mode === 'create' && canManageOrganization && <fieldset className="work-order-saved-filter-scope"><legend>Save to</legend>
            <label><input type="radio" name="saved-filter-scope" value="personal" checked={scopeDraft === 'personal'} onChange={() => setScopeDraft('personal')} /> Personal filters</label>
            <label><input type="radio" name="saved-filter-scope" value="organization" checked={scopeDraft === 'organization'} onChange={() => setScopeDraft('organization')} /> Organization filters</label>
          </fieldset>}
          {editor.mode === 'create' && <p className="work-order-saved-filter-note">{scopeDraft === 'organization' ? 'Everyone who can view Work Orders will be able to use this filter.' : 'Only you can see and use this filter.'}</p>}
          {editorError && <p className="work-order-saved-filter-editor-error" role="alert">{editorError}</p>}
          <footer><button type="button" onClick={() => setEditor(null)} disabled={saving}>Cancel</button><button type="submit" disabled={saving || !nameDraft.trim()}>{saving ? 'Saving…' : editor.mode === 'edit' ? 'Save name' : 'Save filter'}</button></footer>
        </form>
      </div>, document.body)}
    </section>, document.body)}
  </div>
}
