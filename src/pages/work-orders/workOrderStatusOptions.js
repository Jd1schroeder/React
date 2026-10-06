import { Check, CirclePause, LockKeyhole, RotateCw } from "lucide-react";

export const workOrderStatusOptions = [
  { value: "Open", label: "Open", icon: LockKeyhole, tone: "open" },
  { value: "On Hold", label: "On Hold", icon: CirclePause, tone: "on-hold" },
  {
    value: "In Progress",
    label: "In Progress",
    icon: RotateCw,
    tone: "in-progress",
  },
  { value: "Completed", label: "Done", icon: Check, tone: "completed" },
];
