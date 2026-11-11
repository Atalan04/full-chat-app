import type { UserProfile } from "@/lib/types";

const avatarColors = [
  "#4f46e5",
  "#0f766e",
  "#c2410c",
  "#be185d",
  "#0369a1",
  "#6d28d9",
  "#4d7c0f",
  "#b45309",
];

export function displayName(user: UserProfile): string {
  if (user.deleted) return "Deleted User";

  const name = `${user.first_name.trim()} ${user.last_name.trim()}`.trim();
  return name || user.username;
}

export function avatarInitials(user: UserProfile): string {
  const name = displayName(user);
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function avatarColor(user: UserProfile): string {
  if (user.deleted) return "#6b7280";

  let hash = 0;
  for (const character of user.username.toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return avatarColors[hash % avatarColors.length];
}
