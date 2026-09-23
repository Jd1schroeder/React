import { Sidebar } from "./Sidebar";
import { WorkspaceProvider } from "./WorkspaceContext";
import { UpdateNotice } from "./UpdateNotice";
export function AppLayout({ activePage, onNavigate, children }) {
  return (
    <WorkspaceProvider onNavigate={onNavigate}>
      <div className="app-shell">
        <Sidebar activePage={activePage} onNavigate={onNavigate} />
        <div className="main-shell">
          <main className="page-content page-content-full">
            <div className="page-content-inner">{children}</div>
          </main>
        </div>
        <UpdateNotice />
      </div>
    </WorkspaceProvider>
  );
}
