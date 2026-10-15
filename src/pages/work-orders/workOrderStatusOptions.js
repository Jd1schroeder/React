import { Check, CirclePause, CircleX, LockKeyhole, RotateCw, SkipForward } from "lucide-react";

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
  { value: "Skipped", label: "Skipped", icon: SkipForward, tone: "skipped" },
  { value: "Cancelled", label: "Cancelled", icon: CircleX, tone: "cancelled" },
];
