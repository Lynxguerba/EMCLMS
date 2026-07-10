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
  // Handle Cloudinary URLs directly to avoid CORS errors with fetch()
  // and popup blocker issues with async window.open()
  if (url.includes("cloudinary.com")) {
    let downloadUrl = url;
    
    // Inject fl_attachment to force Cloudinary to set Content-Disposition: attachment
    if (downloadUrl.includes("/upload/") && !downloadUrl.includes("fl_attachment")) {
      downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
    }
    
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName || "download";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    
    // Synchronous click avoids popup blockers
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

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
    // Fallback: synchronous-like click if blob download fails
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "download";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
