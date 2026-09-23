import { useEffect, useState } from "react";
import { SettingsLayout } from "./SettingsLayout";
import { settings } from "./settingsConfig";

export function GeneralSettingsPage({ pageName, onNavigate }) {
  const current = settings[pageName] ?? settings["Settings / General"];
  const Icon = current.icon;

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <div>
          <p className="eyebrow">{current.group}</p>
          <h1>{current.title}</h1>
          <p>{current.description}</p>
        </div>
      </header>
      <SettingsLayout pageName={pageName} onNavigate={onNavigate}>
        <section className="settings-content" aria-labelledby="settings-content-title">
          <div className="settings-content-icon"><Icon size={22} /></div>
          <h2 id="settings-content-title">{current.title}</h2>
          <p>This settings area is ready for its Supabase-backed configuration.</p>
          <div className="settings-placeholder">
            <span>No settings configured yet.</span>
            <small>We&apos;ll connect this section as its data model is implemented.</small>
          </div>
          {pageName === "Settings / General" && <BuildVersion />}
        </section>
      </SettingsLayout>
    </div>
  );
}

function BuildVersion() {
  const [build, setBuild] = useState(import.meta.env.DEV ? "Build: local development" : "");

  useEffect(() => {
    if (import.meta.env.DEV) return undefined;

    fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setBuild(data?.build ?? ""))
      .catch(() => setBuild(""));
  }, []);

  if (!build) return null;
  return <footer className="settings-build-version">{build}</footer>;
}
