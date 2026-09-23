import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import "./Sidebar.css";
import { settingsNavigation, settingsPageByLabel, sidebarGroups } from "./sidebarConfig";
import workbenchIcon from "../../assets/workbench-icon.png";
import { supabase } from "../../lib/supabase";
import { setActiveOrganization } from "../../services/workspaceService";
import { Avatar } from "../ui/Avatar";
import { useWorkspace } from "./useWorkspace";

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const workspace = useWorkspace();
  const settingsMenuRef = useRef(null);


  useEffect(() => {
    if (!isSettingsOpen) return undefined;

    const handleOutsidePointer = (event) => {
      if (!settingsMenuRef.current?.contains(event.target)) setIsSettingsOpen(false);
    };

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [isSettingsOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsSettingsOpen(false);
    onNavigate("Login");
  };

  const firstName = workspace.profile?.first_name || workspace.user?.user_metadata?.first_name || "";
  const lastName = workspace.profile?.last_name || workspace.user?.user_metadata?.last_name || "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || workspace.user?.email || "Account";
  const organizationName = workspace.organization?.name || "Workspace";

  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="brand">
          <img className="brand-mark" src={workbenchIcon} alt="Workbench logo" />
          <span className="brand-name">Workbench</span>
        </div>
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
      {!collapsed && (
        <div className="workspace-section">
          <button type="button" className="workspace-switcher" onClick={() => setIsWorkspaceOpen((value) => !value)} aria-haspopup="menu" aria-expanded={isWorkspaceOpen}>
            <Building2 size={15} />
            <span className="workspace-dot" />
            <span className="workspace-name">{organizationName}</span>
            <ChevronDown className="chevron" size={15} />
          </button>
          {isWorkspaceOpen && workspace.organizations?.length > 1 && <div className="workspace-menu" role="menu">{workspace.organizations.map((organization) => <button type="button" role="menuitem" className={organization.id === workspace.organization?.id ? 'is-active' : ''} key={organization.id} onClick={() => { setActiveOrganization(organization.id); setIsWorkspaceOpen(false) }}>{organization.name}</button>)}</div>}
        </div>
      )}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {sidebarGroups.map((group) => (
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
        <div ref={settingsMenuRef} className="settings-menu-root">
          <button className="account-menu" onClick={() => setIsSettingsOpen((value) => !value)} aria-haspopup="menu" aria-expanded={isSettingsOpen}>
            <Avatar className="avatar-purple account-avatar" src={workspace.profile?.avatar_url} firstName={firstName} lastName={lastName} alt={displayName} />
            <span className="account-copy">
              <strong>{displayName}</strong>
              <span className="account-secondary">
                <Settings size={14} />
                <small>Settings</small>
              </span>
            </span>
            <ChevronRight className="account-chevron" size={20} />
          </button>
          {isSettingsOpen && (
            <div className="account-popover" role="menu" aria-label="Account settings">
              <div className="account-popover-section">
                <p className="account-popover-heading">Organization Settings</p>
                {settingsNavigation.organization.map((label) => <button key={label} type="button" role="menuitem" onClick={() => { setIsSettingsOpen(false); onNavigate(settingsPageByLabel[label]); }}>{label}</button>)}
              </div>
              <div className="account-popover-divider" />
              <div className="account-popover-section">
                <p className="account-popover-heading">Personal Settings</p>
                {settingsNavigation.personal.map((label) => <button key={label} type="button" role="menuitem" onClick={() => { setIsSettingsOpen(false); onNavigate(settingsPageByLabel[label]); }}>{label}</button>)}
              </div>
              <button type="button" className="account-popover-logout" role="menuitem" onClick={handleSignOut}><LogOut size={16} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
