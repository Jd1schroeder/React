import { getAvatarInitials } from "./avatarUtils";

export function Avatar({ src, firstName, lastName, name, alt = "", className = "" }) {
  const classes = ["avatar", className].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-label={alt || undefined}>
      {src ? <img src={src} alt={alt} /> : getAvatarInitials(firstName, lastName, name)}
    </span>
  );
}
