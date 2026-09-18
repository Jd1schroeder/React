export function getAvatarInitials(firstName, lastName, name) {
  if (!firstName && !lastName && name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    firstName = parts[0] || "";
    lastName = parts[1] || "";
  }
  const firstInitial = firstName?.trim()?.[0]?.toUpperCase() || "";
  const lastInitial = lastName?.trim()?.[0]?.toUpperCase() || "";
  return `${firstInitial}${lastInitial}` || "A";
}
