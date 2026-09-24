import { useCallback, useEffect, useState } from "react";
import { Building2, LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { getCurrentWorkspace } from "../../services/workspaceService";

import { WorkspaceContext } from "./WorkspaceContextValue";

export function WorkspaceProvider({ children, onNavigate }) {
  const [state, setState] = useState({ status: "loading", workspace: null, error: null });

  const loadWorkspace = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: null }));
    try {
      const workspace = await getCurrentWorkspace();
      if (!workspace.user) {
        setState({ status: "unauthenticated", workspace: null, error: null });
        return;
      }
      const status = workspace.accessStatus === "active"
        ? "ready"
        : workspace.accessStatus === "suspended"
          ? "suspended"
          : "no-organization";
      setState({ status, workspace, error: null });
    } catch (error) {
      setState((current) => ({ ...current, status: "error", error }));
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
    const handleWorkspaceChange = () => loadWorkspace();
    window.addEventListener("workbench:organization-changed", handleWorkspaceChange);
    window.addEventListener("workbench:profile-updated", handleWorkspaceChange);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadWorkspace();
      else setState({ status: "unauthenticated", workspace: null, error: null });
    });
    return () => {
      window.removeEventListener("workbench:organization-changed", handleWorkspaceChange);
      window.removeEventListener("workbench:profile-updated", handleWorkspaceChange);
      subscription.unsubscribe();
    };
  }, [loadWorkspace]);

  useEffect(() => {
    if (state.status === "unauthenticated") onNavigate("Login");
  }, [onNavigate, state.status]);

  if (state.status === "loading" || state.status === "unauthenticated") {
    return <div className="workspace-loading" aria-busy="true" aria-label="Loading workspace" />;
  }

  if (state.status === "error") {
    return (
      <main className="workspace-load-error">
        <h1>Unable to load your workspace</h1>
        <p>Refresh to try again.</p>
        <button type="button" onClick={loadWorkspace}>Retry</button>
      </main>
    );
  }

  if (state.status === "suspended") {
    return (
      <WorkspaceAccessState
        icon={ShieldAlert}
        title="Organization access suspended"
        message="Your organization membership or workspace is suspended. Contact an organization administrator to restore access."
        onSignOut={async () => {
          await supabase.auth.signOut();
          onNavigate("Login");
        }}
      />
    );
  }

  if (state.status === "no-organization") {
    return (
      <WorkspaceAccessState
        icon={Building2}
        title="No organization access"
        message="You do not have an active organization membership. Accept an invitation from an organization administrator, then sign in again."
        onSignOut={async () => {
          await supabase.auth.signOut();
          onNavigate("Login");
        }}
      />
    );
  }

  return <WorkspaceContext.Provider value={{ ...state.workspace, refreshWorkspace: loadWorkspace }}>{children}</WorkspaceContext.Provider>;
}

function WorkspaceAccessState({ icon: Icon, title, message, onSignOut }) {
  return (
    <main className="workspace-access-state" aria-labelledby="workspace-access-title">
      <section className="workspace-access-card">
        <Icon size={32} aria-hidden="true" />
        <h1 id="workspace-access-title">{title}</h1>
        <p>{message}</p>
        <button type="button" onClick={onSignOut}>
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </section>
    </main>
  );
}
