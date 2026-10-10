import { Sidebar } from "./Sidebar";
import { WorkspaceProvider } from "./WorkspaceContext";
import { UpdateNotice } from "./UpdateNotice";
import { MobileNavigation } from "./MobileNavigation";
import { MobileAppHeader } from "./MobileAppHeader";
export function AppLayout({ activePage, mobileHeaderTitle, mobileHeaderBack, onNavigate, onNavigateBack, children }) {
  return (
    <WorkspaceProvider onNavigate={onNavigate}>
      <div className="app-shell">
        <Sidebar activePage={activePage} onNavigate={onNavigate} />
        {activePage !== 'Work Orders' && <MobileAppHeader activePage={activePage} titleOverride={mobileHeaderTitle} onNavigate={onNavigate} onNavigateBack={mobileHeaderBack || onNavigateBack} />}
        <div className="main-shell">
          <main className="page-content page-content-full">
            <div className="page-content-inner">{children}</div>
          </main>
        </div>
        <MobileNavigation activePage={activePage} onNavigate={onNavigate} />
        <UpdateNotice />
      </div>
    </WorkspaceProvider>
  );
}
