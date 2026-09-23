import { organizationPages, personalPages, settings } from "./settingsConfig";

export function SettingsLayout({ pageName, onNavigate, className = "", children }) {
  return (
    <div className={`settings-layout ${className}`.trim()}>
      <SettingsNavigation pageName={pageName} onNavigate={onNavigate} />
      <div className="settings-details">{children}</div>
    </div>
  );
}

function SettingsNavigation({ pageName, onNavigate }) {
  const renderNav = (pages) =>
    pages.map((page) => (
      <button
        key={page}
        type="button"
        className={page === pageName ? "settings-nav-item is-active" : "settings-nav-item"}
        onClick={() => onNavigate(page)}
      >
        {settings[page].title}
      </button>
    ));

  return (
    <aside className="settings-navigation" aria-label="Settings navigation">
      <section className="settings-nav-section" aria-labelledby="organization-settings-heading">
        <p id="organization-settings-heading" className="settings-nav-heading">Organization Settings</p>
        {renderNav(organizationPages)}
      </section>
      <div className="settings-nav-divider" />
      <section className="settings-nav-section" aria-labelledby="personal-settings-heading">
        <p id="personal-settings-heading" className="settings-nav-heading">Personal Settings</p>
        {renderNav(personalPages)}
      </section>
    </aside>
  );
}
