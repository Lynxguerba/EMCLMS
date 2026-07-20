export const getProfilePictureUrl = (
  profilePicture?: string | null
): string | undefined => {
  if (!profilePicture || profilePicture === "null" || profilePicture === "None") return undefined;

  // 1. Handle full URLs (Cloudinary, Google Drive, or other remote URLs)
  if (/^https?:\/\//i.test(profilePicture) || profilePicture.startsWith("//")) {
    let url = profilePicture;

    // Fix protocol-relative URLs
    if (url.startsWith("//")) {
      url = `https:${url}`;
    }

    // Force https for remote images (except localhost)
    if (
      url.startsWith("http://") &&
      !url.includes("localhost") &&
      !url.includes("127.0.0.1")
    ) {
      url = url.replace("http://", "https://");
    }

    // Fix malformed double-protocol URLs on remote domains
    if (url.includes("res.cloudinary.com") || url.includes("drive.google.com")) {
      url = url.replace(/^(https?:\/\/)+/, "https://");
    }

    return url;
  }

  // 2. Handle relative paths that should be served from backend
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  // If it already starts with /media/ or media/
  if (profilePicture.startsWith("/media/") || profilePicture.startsWith("media/")) {
    const path = profilePicture.startsWith("/") ? profilePicture : `/${profilePicture}`;
    return normalizedBaseUrl ? `${normalizedBaseUrl}${path}` : path;
  }

  // 3. Fallback: assume it's a file path that needs /media/ prefix
  const path = profilePicture.startsWith("/") ? profilePicture : `/${profilePicture}`;
  const fullPath = `/media${path}`;
  return normalizedBaseUrl ? `${normalizedBaseUrl}${fullPath}` : fullPath;
};
