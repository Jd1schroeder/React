import { MobileActionSheet } from "../../components/ui/MobileActionSheet";

const PAUSE_OPTIONS = [
  "Pause for 30 minutes",
  "Pause for 1 hour",
  "Pause for 4 hours",
  "Pause until tomorrow",
  "Pause until next week",
];

export function PauseNotificationsSheet({ pausedUntil, onCancel, onResume, onSelect }) {
  const title = pausedUntil
    ? `Notifications paused until ${new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }).format(pausedUntil)}`
    : "Pause";

  return <MobileActionSheet title={title} onClose={onCancel}>
    {pausedUntil && <button type="button" className="is-danger" onClick={onResume}>Resume</button>}
    {PAUSE_OPTIONS.map((option) => <button type="button" key={option} onClick={() => onSelect(option)}>{option}</button>)}
  </MobileActionSheet>;
}
