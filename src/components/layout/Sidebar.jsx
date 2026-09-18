import { useState } from "react";
import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HelpCircle,
  Library as LibraryIcon,
  MapPin,
  MessageSquare,
  MessagesSquare,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  Tags,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import "./Sidebar.css";

const groups = [
  {
    label: "Work",
    items: [
      {
        label: "Work Orders",
        icon: ClipboardCheck,
        page: "Work Orders",
        count: 24,
      },
      { label: "Requests", icon: MessageSquare, page: "Requests", count: 1 },
      {
        label: "Purchase Orders",
        icon: FileText,
        page: "Purchase Orders",
        count: 4,
      },
      { label: "Messages", icon: MessagesSquare, page: "Messages" },
    ],
  },
  {
    label: "Optimize",
    items: [
      {
        label: "Reporting",
        icon: BarChart3,
        page: "Reporting",
        children: [
          { label: "Work Orders", page: "Reporting / Work Orders" },
          { label: "Asset Health", page: "Reporting / Asset Health" },
          { label: "Reporting Details", page: "Reporting / Details" },
          { label: "Recent Activity", page: "Reporting / Activity" },
          { label: "Export Data", page: "Reporting / Exports" },
          { label: "Dashboards", page: "Reporting / Dashboards" },
        ],
      },
      { label: "Automations", icon: Zap, page: "Automations" },
      { label: "Meters", icon: Wrench, page: "Meters" },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Assets", icon: Boxes, page: "Assets" },
      { label: "Parts Inventory", icon: Settings, page: "Parts Inventory" },
      {
        label: "Maintenance Plans",
        icon: RefreshCw,
        page: "Maintenance Plans",
      },
      {
        label: "Library",
        icon: LibraryIcon,
        page: "Library",
        children: [
          { label: "Work Orders", page: "Library / Work Orders" },
          { label: "Procedures", page: "Library / Procedures" },
          { label: "Safety Data Sheets", page: "Library / Safety Data Sheets" },
        ],
      },
      { label: "Categories", icon: Tags, page: "Categories" },
      { label: "Locations", icon: MapPin , page: "Locations" },
      { label: "Teams / Users", icon: Users, page: "Teams / Users" },
      { label: "Vendors", icon: Package, page: "Vendors" },
    ],
  },
];

function NavItem({ item, activePage, onNavigate, collapsed, nested = false }) {
  const [expanded, setExpanded] = useState(() =>
    item.children?.some((child) => child.page === activePage) ?? false,
  );
  const Icon = item.icon;
  const hasChildren = item.children?.length > 0;
  const isActive = activePage === item.page;
  return (
    <>
      <button
        className={`nav-item ${isActive ? "active" : ""} ${nested ? "nested" : ""}`}
        onClick={() => {
          if (hasChildren && !collapsed) setExpanded((value) => !value);
          else onNavigate(item.page);
        }}
        title={collapsed ? item.label : undefined}
      >
        {Icon && (
          <span className="nav-icon">
            <Icon size={18} strokeWidth={1.8} />
          </span>
        )}
        <span className="nav-label-text">{item.label}</span>
        {item.count && <span className="nav-count">{item.count}</span>}
        {hasChildren && !collapsed && (
          <ChevronDown
            size={13}
            className={`item-chevron ${expanded ? "" : "is-rotated"}`}
          />
        )}
      </button>
      {hasChildren && !collapsed && (
        <div className={`nested-items-wrapper ${expanded ? "is-open" : ""}`}>
          <div className="nested-items">
            {item.children.map((child) => (
              <NavItem
                key={child.page}
                item={child}
                activePage={activePage}
                onNavigate={onNavigate}
                collapsed={false}
                nested
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function NavGroup({ group, activePage, onNavigate, collapsed }) {
  const [expanded, setExpanded] = useState(() =>
    group.label === "Work" ||
    group.items.some(
      (item) =>
        item.page === activePage ||
        item.children?.some((child) => child.page === activePage),
    ),
  );
  return (
    <section className="sidebar-group">
      {!collapsed && (
        <button
          className="group-heading"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <p>{group.label}</p>
          <ChevronDown size={13} className={expanded ? "" : "is-rotated"} />
        </button>
      )}
      <div className={`group-items-wrapper ${(expanded || collapsed) ? "is-open" : ""}`}>
        <div className="group-items">
          {group.items.map((item) => (
            <NavItem
              key={item.page}
              item={item}
              activePage={activePage}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function Sidebar({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="brand">
          <span className="brand-mark" aria-label="Simona PMC logo">
            PMC
          </span>
          <span className="brand-name">Simona PMC</span>
          <button
            className="collapse-button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="workspace-section">
          <button className="workspace-switcher">
            <Building2 size={15} />
            <span className="workspace-dot" />
            <span className="workspace-name">Acme Facilities</span>
            <ChevronDown className="chevron" size={15} />
          </button>
        </div>
      )}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {groups.map((group) => (
          <NavGroup
            key={group.label}
            group={group}
            activePage={activePage}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="support-menu-root">
          <button className="support-link">
            <HelpCircle size={24} />
            <span>Support</span>
          </button>
        </div>
        <div className="settings-menu-root">
          <button className="account-menu">
            <div className="avatar avatar-purple account-avatar">JS</div>
            <span className="account-copy">
              <strong>Joshua Schroeder</strong>
              <span className="account-secondary">
                <Settings size={14} />
                <small>Settings</small>
              </span>
            </span>
            <ChevronRight className="account-chevron" size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
