import { useContext } from "react";
import { WorkspaceContext } from "./WorkspaceContextValue";

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return workspace;
}
