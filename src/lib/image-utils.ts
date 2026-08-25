/**
 * Compress an image file for upload. Resizes to fit within maxDim while
 * keeping delivery labels and documents readable, and re-encodes as JPEG.
 */
export async function compressImage(file: Blob, maxDim = 1800, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processing is not supported on this device");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) throw new Error("Could not process this image");
    return blob;
  } finally {
    bitmap.close();
  }
}
