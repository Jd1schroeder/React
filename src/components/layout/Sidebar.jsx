import { useEffect, useRef, useState } from "react";
import {
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
import { supabase } from "../../lib/supabase";
import { setActiveOrganization } from "../../services/workspaceService";
import { getUnreadWorkOrderCount } from "../../services/workOrderService";
import { hasPermission } from "../../services/authorizationService";
import { getFeatureLabel } from "../../utils/featureLabels";
import { getFeatureModuleKeyForPage, isFeatureModuleEnabled } from "../../utils/featureModules";
import { Avatar } from "../ui/Avatar";
import { useWorkspace } from "./useWorkspace";

function NavItem({ item, activePage, onNavigate, collapsed, nested = false, featureLabels }) {
  const [expanded, setExpanded] = useState(() =>
    item.children?.some((child) => child.page === activePage) ?? false,
  );
  const Icon = item.icon;
  const hasChildren = item.children?.length > 0;
  const isActive = activePage === item.page;
  const displayLabel = item.featureLabelKey ? getFeatureLabel(featureLabels, item.featureLabelKey) : item.label;
  return (
    <>
      <button
        className={`nav-item ${isActive ? "active" : ""} ${nested ? "nested" : ""}`}
        onClick={() => {
          if (hasChildren && !collapsed) setExpanded((value) => !value);
          else onNavigate(item.page);
        }}
        title={collapsed ? displayLabel : undefined}
      >
        {Icon && (
          <span className="nav-icon">
            <Icon size={18} strokeWidth={1.8} />
          </span>
        )}
        <span className="nav-label-text">{displayLabel}</span>
        {Number(item.count) > 0 && <span className="nav-count">{item.count}</span>}
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
                featureLabels={featureLabels}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function NavGroup({ group, activePage, onNavigate, collapsed, featureLabels }) {
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
              featureLabels={featureLabels}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function Sidebar({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadWorkOrderBadge, setUnreadWorkOrderBadge] = useState({ organizationId: null, count: null });
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
  const organizationId = workspace.organization?.id;
  const hasMultipleOrganizations = workspace.organizations?.length > 1;
  const canViewWorkOrders = workspace.authorization?.status === "ready" && hasPermission(workspace.authorization.grants, "work_orders.view");
  const unreadWorkOrderCount = unreadWorkOrderBadge.organizationId === organizationId ? unreadWorkOrderBadge.count : null;

  useEffect(() => {
    if (!organizationId || !workspace.user?.id || !canViewWorkOrders) return undefined;
    let active = true;
    let requestSequence = 0;
    const refreshCount = () => {
      const currentRequest = ++requestSequence;
      getUnreadWorkOrderCount({ organizationId, grants: workspace.authorization.grants })
        .then((count) => { if (active && currentRequest === requestSequence) setUnreadWorkOrderBadge({ organizationId, count }); })
        .catch(() => { if (active && currentRequest === requestSequence) setUnreadWorkOrderBadge({ organizationId, count: null }); });
    };
    refreshCount();
    window.addEventListener("workbench:unread-work-order-count-invalidated", refreshCount);
    return () => {
      active = false;
      window.removeEventListener("workbench:unread-work-order-count-invalidated", refreshCount);
    };
  }, [canViewWorkOrders, organizationId, workspace.authorization?.grants, workspace.user?.id]);

  const featureModules = workspace.organization?.feature_modules;
  const groupsWithUnreadCount = sidebarGroups.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => isFeatureModuleEnabled(featureModules, getFeatureModuleKeyForPage(item.page)))
      .map((item) => item.page === "Work Orders"
        ? { ...item, count: unreadWorkOrderCount }
        : item),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-header">
        {hasMultipleOrganizations ? <button type="button" className="brand workspace-brand" onClick={() => setIsWorkspaceOpen((value) => !value)} aria-haspopup="menu" aria-expanded={isWorkspaceOpen}>
          <Avatar className="brand-mark organization-brand-avatar" src={workspace.organization?.logo_url} name={organizationName} alt={`${organizationName} logo`} />
          <span className="brand-name">{organizationName}</span>
          <ChevronDown className="workspace-brand-chevron" size={15} aria-hidden="true" />
        </button> : <div className="brand">
          <Avatar className="brand-mark organization-brand-avatar" src={workspace.organization?.logo_url} name={organizationName} alt={`${organizationName} logo`} />
          <span className="brand-name">{organizationName}</span>
        </div>}
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
      {isWorkspaceOpen && hasMultipleOrganizations && <div className="workspace-menu sidebar-workspace-menu" role="menu">{workspace.organizations.map((organization) => <button type="button" role="menuitem" className={organization.id === workspace.organization?.id ? 'is-active' : ''} key={organization.id} onClick={() => { setActiveOrganization(organization.id); setIsWorkspaceOpen(false) }}>{organization.name}</button>)}</div>}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {groupsWithUnreadCount.map((group) => (
          <NavGroup
            key={group.label}
            group={group}
            activePage={activePage}
            onNavigate={onNavigate}
            collapsed={collapsed}
            featureLabels={workspace.organization?.feature_labels}
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
