/**
 * Downscale an image File via a canvas so we don't push 4MB phone screenshots
 * to Blob storage when the rendered thumbnail is ~64px. Returns the original
 * file untouched for non-images, SVGs, or if anything fails — caller never
 * has to special-case the result.
 */
export async function compressImage(
  file: File,
  opts: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  const { maxDimension = 1600, quality = 0.85 } = opts;

  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  if (typeof document === "undefined") return file;

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });

    const longest = Math.max(img.width, img.height);
    if (longest <= maxDimension) return file;

    const scale = maxDimension / longest;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    // Switch extension to .jpg since we re-encoded as JPEG.
    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
