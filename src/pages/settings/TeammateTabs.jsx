import "./TeammateTabs.css";

export function TeammateTabs({ active, onNavigate }) {
  return <nav className="teammate-tabs" aria-label="Teammate management sections">
    <button type="button" className={active === "users" ? "is-active" : ""} aria-current={active === "users" ? "page" : undefined} onClick={() => onNavigate("/settings/teammates/users")}>Users</button>
    <button type="button" className={active === "teams" ? "is-active" : ""} aria-current={active === "teams" ? "page" : undefined} onClick={() => onNavigate("/settings/teammates/teams")}>Teams</button>
    <button type="button" className={active === "roles" ? "is-active" : ""} aria-current={active === "roles" ? "page" : undefined} onClick={() => onNavigate("/settings/teammates/roles")}>Roles and Permissions</button>
  </nav>
}
