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

export const getCloudinaryDownloadUrl = (url: string, fileName?: string): string => {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  
  if (url.includes("/fl_attachment")) {
    return url;
  }

  let attachmentFlag = "fl_attachment";
  if (fileName) {
    attachmentFlag = `fl_attachment:${encodeURIComponent(fileName)}`;
  }
  
  return url.replace("/upload/", `/upload/${attachmentFlag}/`);
};

export const forceDownload = async (url: string, fileName: string) => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const isInternal =
      url.startsWith("/") ||
      (baseUrl && url.startsWith(baseUrl)) ||
      url.includes("localhost") ||
      url.includes("127.0.0.1");

    if (!isInternal) {
      // For external URLs (like Cloudinary), attempting a cross-origin fetch
      // will fail due to CORS. Just trigger the browser's native download.
      // Append fl_attachment to Cloudinary URLs to bypass inline security restrictions
      const downloadUrl = getCloudinaryDownloadUrl(url, fileName);
      triggerBrowserDownload(downloadUrl, fileName);
      return;
    }

    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
    triggerBrowserDownload(url, fileName);
  }
};

export const triggerBrowserDownload = (url: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "download";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export type RemoteFile = {
  id?: number;
  file?: string;
  file_url?: string;
  file_name?: string;
};

export const getRemoteFileUrl = (file: string | RemoteFile): string => {
  if (typeof file === "string") return getFileUrl(file);
  return getFileUrl(file.file_url || file.file || "");
};

export const getRemoteFileName = (file: string | RemoteFile): string => {
  if (typeof file === "string") return file.split("/").pop() || "download";
  return (
    file.file_name ||
    (file.file_url || file.file || "").split("/").pop() ||
    "download"
  );
};

export const getContentFileActionUrl = (
  file: string | RemoteFile,
  action: "open" | "download"
): string => {
  if (typeof file !== "string" && file.id) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${normalizedBaseUrl}/api/content-files/${file.id}/${action}/`;
  }

  return getRemoteFileUrl(file);
};

export const openDirectFile = async (
  file: string | RemoteFile,
  action: "open" | "download" = "open"
) => {
  let url = getContentFileActionUrl(file, action);
  if (!url) return;

  if (url.includes("/api/content-files/")) {
    try {
      // Import axios dynamically to avoid circular dependencies if any,
      // or just assume standard import if we add it at the top.
      const axios = (await import("axios")).default;
      const response = await axios.get(url, { withCredentials: true });
      if (response.data && response.data.url) {
        url = response.data.url;
      }
    } catch (error) {
      console.error("Error fetching direct file URL:", error);
      // Let it fall through to the old window.open as a fallback
    }
  }

  await forceDownload(url, getRemoteFileName(file));
};
