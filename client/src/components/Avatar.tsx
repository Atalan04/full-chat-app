import type { UserProfile } from "@/lib/types";
import { avatarColor, avatarInitials } from "@/lib/userDisplay";

interface AvatarProps {
  user: UserProfile;
  className?: string;
}

export function Avatar({ user, className = "h-12 w-12" }: AvatarProps) {
  return (
    <span
      aria-label={user.deleted ? "Deleted User" : `${avatarInitials(user)} avatar`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${className}`}
      role="img"
      style={{ backgroundColor: avatarColor(user) }}
    >
      {avatarInitials(user)}
    </span>
  );
}
