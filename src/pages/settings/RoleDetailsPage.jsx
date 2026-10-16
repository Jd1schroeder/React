import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Copy, Pencil, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { LoadingState } from "../../components/ui/LoadingState";
import { getCurrentWorkspace } from "../../services/workspaceService";
import { getOrganizationRoleDetails } from "../../services/organizationService";
import { listAuditEvents } from "../../services/auditService";
import { getBaselinePermissions, permissionCatalog, permissionScopeOptions } from "../../services/permissionCatalog";
import { auditActorName, auditEventDescription, auditInitialPermissionItems } from "../../utils/auditFormatting";
import { formatDateForUser } from "../../utils/dateFormatting";
import { SettingsLayout } from "./SettingsLayout";
import "./RoleDetailsPage.css";

const permissionGroups = permissionCatalog.reduce((groups, permission) => {
  groups[permission.module] ??= [];
  groups[permission.module].push(permission);
  return groups;
}, {});

function memberName(member) {
  return [member.profile?.first_name, member.profile?.last_name].filter(Boolean).join(" ") || member.contact_value || "Unnamed teammate";
}

export function RoleDetailsPage({ roleId, onNavigate, onNavigateBack }) {
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [auditEvents, setAuditEvents] = useState([]);
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timeZone, setTimeZone] = useState(undefined);
  const [expandedModules, setExpandedModules] = useState(() => Object.fromEntries(Object.keys(permissionGroups).map((module, index) => [module, index === 0])));

  useEffect(() => {
    let isCurrent = true;
    getCurrentWorkspace()
      .then(async (workspace) => {
        const organizationId = workspace.organization?.id ?? "";
        if (!organizationId || !roleId) return;
        setDateFormat(workspace.preferences?.date_format ?? "MM/DD/YYYY");
        setTimeZone(workspace.preferences?.timezone || undefined);
        const details = await getOrganizationRoleDetails(organizationId, roleId);
        if (isCurrent) setRole(details);
        void listAuditEvents({ organizationId, entityId: roleId, entityTypes: ["organization_role", "organization_role_permission"] })
          .then((events) => { if (isCurrent) setAuditEvents(events) })
          .catch(() => {});
      })
      .catch((loadError) => { if (isCurrent) setError(loadError.message || "Unable to load this role."); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, [roleId]);

  const grants = useMemo(() => {
    if (!role) return {};
    const stored = Object.fromEntries((role.permissions ?? []).map((permission) => [permission.permission_key, permission.scope]));
    return Object.keys(stored).length || !role.is_system ? stored : getBaselinePermissions(role.system_key);
  }, [role]);

  const back = onNavigateBack ?? (() => onNavigate("/settings/teammates/roles"));
  const scopeLabel = (scope, permission) => scope === "any" && permission.actionOnly
    ? "Allowed"
    : permissionScopeOptions.find((option) => option.value === scope)?.label ?? scope;
  const toggleModule = (module) => setExpandedModules((current) => ({ ...current, [module]: !current[module] }));
  const displayAuditEvents = useMemo(() => {
    const creationSummary = auditEvents.find((event) => event.action === "created_with_permissions");
    if (!creationSummary) return auditEvents;
    const initialPermissions = new Set(auditInitialPermissionItems(creationSummary));
    const summaryTime = Date.parse(creationSummary.created_at);
    return auditEvents.filter((event) => {
      if (event.action !== "permission_granted") return true;
      const permission = `${event.metadata?.permission_key ?? ""}${event.metadata?.scope ? ` (${event.metadata.scope})` : ""}`;
      return !(initialPermissions.has(permission) && Date.parse(event.created_at) <= summaryTime);
    });
  }, [auditEvents]);

  return <div className="settings-page role-details-page">
    <header className="settings-page-header"><p className="eyebrow">Organization Settings</p><h1>Manage Teammates</h1><p>Manage members, roles, and workspace access.</p></header>
    <SettingsLayout pageName="Settings / Manage Teammates" onNavigate={onNavigate}>
      <section className="settings-content role-details-card" aria-label="Role details">
        <div className="role-details-back-row"><button type="button" className="role-details-back" onClick={back} aria-label="Back to roles"><ArrowLeft size={20} /></button><span>Role Details</span></div>
        {isLoading && <LoadingState message="Loading role..." />}
        {!isLoading && error && <p className="role-details-state role-details-error" role="alert">{error}</p>}
        {!isLoading && !error && !role && <p className="role-details-state">This role could not be found.</p>}
        {!isLoading && !error && role && <>
          <header className="role-details-heading"><div><p className="eyebrow">{role.is_system ? "Built-in role" : "Custom role"}</p><h2>{role.name}</h2><p>{role.description || "No description provided."}</p></div><div className="role-details-heading-actions">{role.is_system ? <button type="button" className="role-details-edit" onClick={() => onNavigate(`/settings/teammates/roles?copy=${encodeURIComponent(role.id)}`)}><Copy size={15} /> Copy to new role</button> : <button type="button" className="role-details-edit" onClick={() => onNavigate(`/settings/teammates/roles?edit=${encodeURIComponent(role.id)}`)}><Pencil size={15} /> Edit role</button>}<span className="role-details-user-count">{role.members.length} {role.members.length === 1 ? "user" : "users"} assigned</span></div></header>
          <section className="role-details-section" aria-labelledby="role-permissions-title"><h3 id="role-permissions-title">Permissions</h3><div className="role-permission-groups">{Object.entries(permissionGroups).map(([module, permissions]) => { const isExpanded = expandedModules[module]; return <section className={`role-permission-group${isExpanded ? " is-expanded" : ""}`} key={module}><button type="button" className="role-permission-group-toggle" aria-expanded={isExpanded} onClick={() => toggleModule(module)}><span>{module}</span>{isExpanded ? <ChevronDown size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}</button>{isExpanded && permissions.map((permission) => { const scope = grants[permission.key]; return <div className="role-permission-row" key={permission.key}><div className="role-permission-label"><span className={scope ? "is-granted" : ""}>{scope ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}</span><div><strong>{permission.label}</strong><p>{permission.description}</p></div></div><span className="role-permission-scope">{scope ? scopeLabel(scope, permission) : "No access"}</span></div>})}</section>})}</div></section>
          <section className="role-details-section" aria-labelledby="role-users-title"><h3 id="role-users-title">Assigned users</h3>{role.members.length ? <div className="role-assigned-users">{role.members.map((member) => <button type="button" className="role-assigned-user" key={member.user_id ?? member.invitation_id} onClick={() => member.user_id && onNavigate(`/users/profile/${encodeURIComponent(member.user_id)}`)} disabled={!member.user_id}><Avatar className="role-assigned-avatar" src={member.profile?.avatar_url?.startsWith("http") ? member.profile.avatar_url : ""} firstName={member.profile?.first_name} lastName={member.profile?.last_name} alt={memberName(member)} /><span>{memberName(member)}</span><small>{member.invitation_id ? "Invitation pending" : member.status === "active" ? "Active" : member.status}</small></button>)}</div> : <p className="role-details-empty">No users are assigned to this role.</p>}</section>
          <section className="role-details-section" aria-labelledby="role-history-title"><h3 id="role-history-title">Role history</h3>{displayAuditEvents.length ? <div className="role-history-list">{displayAuditEvents.map((event) => <div className="role-history-row" key={event.id}><div><strong>{auditEventDescription(event)}</strong>{event.action === "created_with_permissions" && <ul className="role-history-permissions">{auditInitialPermissionItems(event).map((permission) => <li key={permission}>{permission}</li>)}</ul>}<p>By {auditActorName(event)}</p></div><time dateTime={event.created_at}>{formatDateForUser(event.created_at, dateFormat, timeZone)}</time></div>)}</div> : <p className="role-details-empty">No role history available.</p>}</section>
        </>}
      </section>
    </SettingsLayout>
  </div>;
}
