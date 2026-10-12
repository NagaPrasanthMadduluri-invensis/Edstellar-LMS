"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/**
 * A person's profile picture, with the anonymous silhouette as the fallback.
 *
 * One component so every surface — the top bar, the dashboard, the profile
 * dialog — shows the same picture and the same fallback. When somebody has no
 * uploaded avatar (`src` null), or the upload fails to load, the silhouette in
 * `public/avatar-anonymous.jpg` is shown rather than initials: the owner asked
 * for the anonymous image everywhere.
 *
 * `src` is the stored path (`/uploads/avatars/...`). It is served same-origin
 * through the `/uploads` rewrite in `next.config.mjs`, exactly like a course
 * thumbnail, so no API origin has to be prepended here.
 */
export const ANONYMOUS_AVATAR = "/avatar-anonymous.jpg";

export function UserAvatar({ src, name, size = "default", className }) {
  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={src || ANONYMOUS_AVATAR} alt={name || "Profile picture"} />
      {/* Covers a broken upload: the primitive shows this when the image errors. */}
      <AvatarFallback className="bg-surface-2 p-0">
        <img
          src={ANONYMOUS_AVATAR}
          alt=""
          className="size-full rounded-full object-cover"
        />
      </AvatarFallback>
    </Avatar>
  );
}
