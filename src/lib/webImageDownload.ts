import { Platform } from "react-native";

export function slugifyExportFileName(name: string, fallback = "flyer"): string {
  const slug = name
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

export function isWebImageExportAvailable(): boolean {
  return Platform.OS === "web" && typeof document !== "undefined";
}

/** Trigger a PNG download in the browser from a data URI or blob URL. */
export function downloadImageUri(uri: string, fileName: string): void {
  if (!isWebImageExportAvailable()) {
    throw new Error("Image download is only supported on web.");
  }

  const safeName = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
  const link = document.createElement("a");
  link.href = uri;
  link.download = safeName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Share via Web Share API when available; otherwise download the PNG. */
export async function shareOrDownloadImageUri(
  uri: string,
  fileName: string,
): Promise<"shared" | "downloaded"> {
  if (!isWebImageExportAvailable()) {
    throw new Error("Web image export is only supported on web.");
  }

  const safeName = fileName.endsWith(".png") ? fileName : `${fileName}.png`;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], safeName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: safeName.replace(/\.png$/i, "") });
        return "shared";
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      // Fall back to download when share is unavailable or fails.
    }
  }

  downloadImageUri(uri, safeName);
  return "downloaded";
}

/** Brief delay so an on-screen export view can layout before html2canvas runs. */
export async function waitForWebCaptureFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Wait for custom flyer fonts before html2canvas snapshots text. */
export async function waitForWebFontsReady(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.ready) return;
  await document.fonts.ready;
}

type WebViewShotCapture = {
  capture?: () => Promise<string>;
};

/**
 * Capture a visible on-screen ViewShot on web. html2canvas fails on opacity:0
 * and off-screen clones, so we snapshot what is already painted in the preview.
 */
export async function captureWebViewShot(ref: WebViewShotCapture | null): Promise<string> {
  if (!ref?.capture) {
    throw new Error("Export view not ready");
  }

  await waitForWebCaptureFrame();
  await waitForWebFontsReady();

  // Warm-up pass loads fonts/images; second pass is the clean export.
  await ref.capture();
  return ref.capture();
}
