import { CircleArrowDown, CircleArrowUp, CircleDot, CircleMinus } from "lucide-react";
import "./PriorityBadge.css";

const priorityStyles = {
  low: { label: "Low", Icon: CircleArrowDown },
  medium: { label: "Medium", Icon: CircleMinus },
  high: { label: "High", Icon: CircleArrowUp },
  urgent: { label: "Urgent", Icon: CircleArrowUp },
  none: { label: "None", Icon: CircleDot },
};

export function PriorityBadge({ priority }) {
  const key = String(priority ?? "").trim().toLowerCase();
  if (!key || key === "none") return null;

  const { label, Icon } = priorityStyles[key] ?? { label: String(priority), Icon: CircleDot };
  const tone = priorityStyles[key] ? key : "none";

  return (
    <div className={`priority-badge priority-badge-regular priority-badge-${tone}`}>
      <span className="priority-badge-icon">
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </span>
      {label}
    </div>
  );
}
