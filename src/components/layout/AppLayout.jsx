import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { WorkspaceProvider } from "./WorkspaceContext";
import { UpdateNotice } from "./UpdateNotice";
import { MobileNavigation } from "./MobileNavigation";
import { MobileAppHeader } from "./MobileAppHeader";
import { useWorkspace } from "./useWorkspace";
import { getPagePath } from "../../routes.js";
import { isFeaturePageEnabled } from "../../utils/featureModules";

function FeatureAccessBoundary({ activePage, children }) {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const isEnabled = isFeaturePageEnabled(workspace.organization?.feature_modules, activePage);

  useEffect(() => {
    if (!isEnabled) navigate(getPagePath("Work Orders"), { replace: true });
  }, [activePage, isEnabled, navigate]);

  if (!isEnabled) return <div className="workspace-loading" aria-busy="true" aria-label="Redirecting to Work Orders" />;
  return children;
}

export function AppLayout({ activePage, mobileHeaderTitle, mobileHeaderBack, onNavigate, onNavigateBack, children }) {
  return (
    <WorkspaceProvider onNavigate={onNavigate}>
      <div className="app-shell">
        <Sidebar activePage={activePage} onNavigate={onNavigate} />
        {activePage !== 'Work Orders' && <MobileAppHeader activePage={activePage} titleOverride={mobileHeaderTitle} onNavigate={onNavigate} onNavigateBack={mobileHeaderBack || onNavigateBack} />}
        <div className="main-shell">
          <main className="page-content page-content-full">
            <div className="page-content-inner"><FeatureAccessBoundary activePage={activePage}>{children}</FeatureAccessBoundary></div>
          </main>
        </div>
        <MobileNavigation activePage={activePage} onNavigate={onNavigate} />
        <UpdateNotice />
      </div>
    </WorkspaceProvider>
  );
}
