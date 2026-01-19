/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "@/lib/api-client";

// Try to open a PDF from various kinds of responses/URLs.
export const openPdfUrl = async (url: string) => {
  if (!url) return;
  // Prefer opening the backend-provided link directly so the browser can
  // use its native PDF viewer and avoid creating a blob URL when not needed.
  try {
    const win = window.open(url, "_blank");
    if (win) return;
  } catch (e) {
    // ignore and try fetch fallback
  }

  // If direct open was blocked or not possible, attempt to fetch via apiClient
  // (useful for auth-protected endpoints where auth header is required).
  try {
    const resp = await apiClient.get(url, { responseType: "blob" });
    const blob = resp.data as Blob;
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
    return;
  } catch (err) {
    console.error("openPdfUrl fetch fallback failed:", err);
    // Final fallback: try direct open again (may succeed in some environments)
    try {
      window.open(url, "_blank");
      return;
    } catch (e) {
      console.error("openPdfUrl final fallback failed:", e);
    }
  }
};

// Accepts string (url/base64), Blob, or object with pdf_url/pdf/data
export const openPdfResponse = async (resp: any) => {
  try {
    if (!resp) return;

    // If it's a Blob already
    if (resp instanceof Blob) {
      const blobUrl = URL.createObjectURL(resp);
      window.open(blobUrl, "_blank");
      return;
    }

    // If it's an object with common keys
    if (typeof resp === "object") {
      if (resp.pdf_url) {
        await openPdfUrl(resp.pdf_url);
        return;
      }
      if (resp.pdf) {
        await openPdfResponse(resp.pdf);
        return;
      }
      if (resp.data) {
        await openPdfResponse(resp.data);
        return;
      }
    }

    if (typeof resp === "string") {
      const s = resp.trim();

      // If looks like a URL
      if (s.startsWith("http://") || s.startsWith("https://")) {
        await openPdfUrl(s);
        return;
      }

      // If looks like base64 (very naive check)
      try {
        const maybeBase64 = s;
        const binary = atob(maybeBase64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        return;
      } catch (e) {
        // Not base64
      }

      // Last resort: try opening the string directly
      window.open(s, "_blank");
      return;
    }
  } catch (e) {
    console.error("openPdfResponse error:", e);
  }
};
