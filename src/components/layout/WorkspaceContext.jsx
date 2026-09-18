import { useCallback, useEffect, useState } from "react";
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
      setState({ status: "ready", workspace, error: null });
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

  return <WorkspaceContext.Provider value={{ ...state.workspace, refreshWorkspace: loadWorkspace }}>{children}</WorkspaceContext.Provider>;
}
