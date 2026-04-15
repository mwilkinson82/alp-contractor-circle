import type { Shape } from "./types";
import { renderAllShapes } from "./renderShapes";

export async function exportToPng(
  imageUrl: string,
  shapes: Shape[],
  filename = "markup-export.png",
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
        renderAllShapes(ctx, shapes);
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
