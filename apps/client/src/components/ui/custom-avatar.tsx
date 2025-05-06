import React, { useMemo, useState, useEffect } from "react";
import { Avatar, AvatarProps } from "@mantine/core";
import { getAvatarUrl } from "@/lib/config";

interface CustomAvatarProps extends AvatarProps {
  avatarUrl?: string | null;
  name?: string;
  color?: string;
  size?: string | number;
  radius?: string | number;
  variant?: string;
  style?: any;
  component?: any;
}

export function CustomAvatar({ avatarUrl, name, ...props }: CustomAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when the URL changes
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const avatarSource = useMemo(() => {
    // If there was an error loading the image, return null to show the fallback
    if (imgError) return null;

    // If avatarUrl is a blob URL, use it directly
    if (avatarUrl && avatarUrl.startsWith("blob:")) {
      return avatarUrl;
    }

    // Otherwise use the configured avatar URL
    return getAvatarUrl(avatarUrl);
  }, [avatarUrl, imgError]);

  return (
    <Avatar
      src={avatarSource}
      alt={name || "Avatar"}
      color="blue"
      {...props}
      onError={() => setImgError(true)}
    >
      {name ? name.charAt(0).toUpperCase() : "U"}
    </Avatar>
  );
}
