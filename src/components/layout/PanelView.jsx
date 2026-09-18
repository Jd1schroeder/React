import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  EllipsisVertical,
  Gauge,
  PanelLeft,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/Button";
import workbench404 from "../../assets/workbench-404-clean.png";
import { PanelLayout } from './PanelLayout';
import './PanelView.css';

export function PanelOverflowButton({ label = 'More options' }) {
  return <button className="icon-button" aria-label={label}>
    <EllipsisVertical size={17} />
  </button>
}

export function PanelRecordNotFound() {
  return <div className="panel-record-not-found">
    <img src={workbench404} alt="Workbench 404 illustration" />
  </div>
}

export function PanelView({
  title,
  searchPlaceholder,
  actionLabel = "New item",
  filters = [],
  items = [],
  kind = "item",
  recordId,
  recordType,
  onNavigateRecord,
}) {
  const [localSelectedId, setLocalSelectedId] = useState(items[0]?.id);
  const selectedId = recordId ?? localSelectedId;
  const [filter, setFilter] = useState("");
  const selected = useMemo(
    () => recordId ? items.find((item) => item.id === selectedId) : items[0],
    [items, recordId, selectedId],
  );
  const missingRecord = Boolean(recordId && !selected);
  const visibleItems = filter
    ? items.filter((item) =>
        `${item.name} ${item.asset} ${item.location}`
          .toLowerCase()
          .includes(filter.toLowerCase()),
      )
    : items;

  return (
    <PanelLayout
      title={title}
      modeIcon={PanelLeft}
      searchValue={filter}
      onSearch={setFilter}
      searchPlaceholder={searchPlaceholder}
      actionLabel={actionLabel}
      subnavigation={<>
        {filters.map((item) => <button className="panel-filter" key={item}><SlidersHorizontal size={13} /> {item}<ChevronDown size={12} /></button>)}
        <button className="panel-filter">Add filter <Plus size={13} /></button>
        <button className="panel-filter panel-filter-sort">Sort by: Name <ChevronDown size={12} /></button>
      </>}
    >
        <aside className="panel-list">
          <div className="panel-list-header">
            <PanelOverflowButton />
          </div>
          <div className="panel-sort">
            <span>Sort by:</span>
            <button>
              Name: Ascending <ChevronDown size={12} />
            </button>
          </div>
          <div className="panel-items">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                className={`panel-item ${selected?.id === item.id ? "selected" : ""}`}
                onClick={() => {
                  setLocalSelectedId(item.id);
                  if (recordType) onNavigateRecord?.(recordType, item.id);
                }}
              >
                <div className="panel-item-icon">
                  <Gauge size={17} />
                </div>
                <div className="panel-item-copy">
                  <strong>{item.name}</strong>
                  <span>{item.asset ?? item.location ?? "Workspace item"}</span>
                  <small>
                    {item.lastReading ?? item.meta ?? "Ready to configure"}
                  </small>
                </div>
              </button>
            ))}
            {visibleItems.length === 0 && (
              <div className="panel-empty">No {kind}s found.</div>
            )}
          </div>
        </aside>
        <section className="panel-detail">
          {missingRecord ? (
            <PanelRecordNotFound />
          ) : selected && (
            <>
              <header className="panel-detail-header">
                <div>
                  <h2>{selected.name}</h2>
                  <p>
                    <CalendarDays size={14} /> Last updated{" "}
                    {selected.updated ?? "Today"}
                  </p>
                </div>
                <div className="panel-detail-actions">
                  <button className="icon-button" aria-label="Edit">
                    <Pencil size={16} />
                  </button>
                  <PanelOverflowButton />
                </div>
              </header>
              <div className="panel-detail-content">
                <div className="panel-detail-meta">
                  <div>
                    <span>Asset</span>
                    <strong>{selected.asset ?? "Not assigned"}</strong>
                  </div>
                  <div>
                    <span>Location</span>
                    <strong>{selected.location ?? "Not assigned"}</strong>
                  </div>
                  <div>
                    <span>Measurement unit</span>
                    <strong>{selected.unit ?? "Not configured"}</strong>
                  </div>
                  <div>
                    <span>Reading frequency</span>
                    <strong>{selected.frequency ?? "Not scheduled"}</strong>
                  </div>
                </div>
                <div className="reading-card">
                  <div className="section-heading">
                    <div>
                      <h3>Readings</h3>
                      <p className="muted">Track changes over time.</p>
                    </div>
                    <button className="filter-button">
                      Time frame <ChevronDown size={13} />
                    </button>
                  </div>
                  <div className="reading-value">
                    <strong>{selected.value ?? "—"}</strong>
                    <span>{selected.unit ?? ""}</span>
                  </div>
                  <div className="chart-placeholder">
                    <BarChart3 size={22} />
                    <span>Reading history will appear here</span>
                    <div className="chart-line" />
                  </div>
                  <div className="chart-axis">
                    <span>10 Sep</span>
                    <span>12 Sep</span>
                    <span>14 Sep</span>
                    <span>16 Sep</span>
                  </div>
                </div>
                <div className="panel-detail-card">
                  <div className="section-heading">
                    <h3>Automations ({selected.automations ?? 0})</h3>
                    <button className="text-button">
                      <Plus size={13} /> Create automation
                    </button>
                  </div>
                  <p className="muted">
                    Automate follow-up work when this {kind} changes.
                  </p>
                </div>
                <div className="panel-detail-card panel-detail-cta">
                  <Sparkles size={18} />
                  <div>
                    <strong>Connect this {kind} to your workflow</strong>
                    <p>
                      Set up readings, reminders, and work orders from one
                      place.
                    </p>
                  </div>
                  <Button variant="secondary">Configure</Button>
                </div>
              </div>
            </>
          )}
        </section>
    </PanelLayout>
  );
}
