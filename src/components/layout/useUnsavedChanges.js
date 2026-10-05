import { useContext } from "react";
import { UnsavedChangesContext } from "./UnsavedChangesContext";

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) throw new Error("useUnsavedChanges must be used inside UnsavedChangesProvider");
  return context;
}
