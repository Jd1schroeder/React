import { Sidebar } from "./Sidebar";
export function AppLayout({ activePage, onNavigate, children }) {
  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="main-shell">
        <main className="page-content page-content-full">{children}</main>
      </div>
    </div>
  );
}
