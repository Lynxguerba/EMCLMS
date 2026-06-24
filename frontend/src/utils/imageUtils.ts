export const getProfilePictureUrl = (
  profilePicture?: string | null
): string | undefined => {
  if (!profilePicture || profilePicture === "null" || profilePicture === "None") return undefined;

  // 1. Handle Cloudinary URLs or full URLs
  if (
    profilePicture.includes("res.cloudinary.com") ||
    profilePicture.includes("cloudinary.com") ||
    /^https?:\/\//i.test(profilePicture) ||
    profilePicture.startsWith("//")
  ) {
    let url = profilePicture;

    // Fix protocol-relative URLs
    if (url.startsWith("//")) {
      url = `https:${url}`;
    }

    // Force https for Cloudinary and other remote images (except localhost)
    if (
      url.startsWith("http://") &&
      !url.includes("localhost") &&
      !url.includes("127.0.0.1")
    ) {
      url = url.replace("http://", "https://");
    }

    // If it's a Cloudinary URL that somehow got malformed (e.g. double https)
    if (url.includes("res.cloudinary.com")) {
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
