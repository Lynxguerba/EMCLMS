export const getFileUrl = (path: string | null | undefined): string => {
  if (!path || path === "null" || path === "None") return "";

  // 1. If it's already a full URL (e.g. Cloudinary, S3, or absolute local)
  if (/^https?:\/\//i.test(path) || path.startsWith("//")) {
    let url = path;
    if (url.startsWith("//")) {
      url = `https:${url}`;
    }
    return url;
  }

  // 2. Handle relative paths from backend
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  
  // Ensure the path starts with a slash
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // If we have a base URL, prepend it. Otherwise return the relative path (might only work in same-origin)
  return normalizedBaseUrl ? `${normalizedBaseUrl}${normalizedPath}` : normalizedPath;
};

export const forceDownload = async (url: string, fileName: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
    // Fallback: try opening in new tab if blob download fails
    window.open(url, "_blank");
  }
};
