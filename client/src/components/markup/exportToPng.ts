import type { Shape } from "./types";
import { renderAllShapes, type FormatDistanceFn, type FormatAreaFn } from "./renderShapes";

export async function exportToPng(
  imageUrl: string,
  shapes: Shape[],
  filename = "markup-export.png",
  formatDistance?: FormatDistanceFn,
  formatArea?: FormatAreaFn,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);

        // Scale shapes from display coordinates to natural image coordinates
        // The markup canvas captures coordinates relative to the displayed image size,
        // but the export canvas uses the image's natural (full) resolution.
        // We need to compute the scale factor between display and natural size.
        // Since we don't have the display rect here, we render shapes at their
        // stored coordinates — which are already in image-space (toCanvasCoords
        // in MarkupCanvas converts screen coords to image-space coords).
        renderAllShapes(ctx, shapes, formatDistance, formatArea);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create PNG blob"));
              return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            resolve();
          },
          "image/png",
          1,
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    img.src = imageUrl;
  });
}
