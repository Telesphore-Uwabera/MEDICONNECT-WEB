/**
 * Utility for cropping, fitting, and resizing images to card dimensions.
 * Cuts large images to exact pixel dimensions (default 800x600, 4:3) so
 * the doctor photo fits the card perfectly and is fully displayed.
 */

export interface CropOptions {
  aspectRatio: number; // e.g. 4 / 3
  targetWidth: number; // e.g. 800
  targetHeight: number; // e.g. 600
  quality?: number; // 0.1 to 1.0 (default 0.92)
  fitMode?: "cover" | "contain";
  zoom?: number; // 1 to 3
  panX?: number; // offset in px relative to center
  panY?: number; // offset in px relative to center
  rotation?: number; // 0, 90, 180, 270
}

export const DEFAULT_DOCTOR_CARD_CROP: CropOptions = {
  aspectRatio: 4 / 3,
  targetWidth: 800,
  targetHeight: 600,
  quality: 0.92,
  fitMode: "cover",
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
};

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Process and crop an image using an offscreen canvas to exact pixel dimensions.
 */
export async function cropAndResizeImage(
  imageSource: File | HTMLImageElement | string,
  options: Partial<CropOptions> = {},
  originalFileName = "doctor-photo.jpg",
): Promise<File> {
  const opts: CropOptions = {
    ...DEFAULT_DOCTOR_CARD_CROP,
    ...options,
  };

  let img: HTMLImageElement;
  let fileName = originalFileName;

  if (imageSource instanceof File) {
    fileName = imageSource.name;
    const dataUrl = await readFileAsDataURL(imageSource);
    img = await loadImage(dataUrl);
  } else if (typeof imageSource === "string") {
    img = await loadImage(imageSource);
  } else {
    img = imageSource;
  }

  const {
    targetWidth,
    targetHeight,
    quality = 0.92,
    fitMode = "cover",
    zoom = 1,
    panX = 0,
    panY = 0,
    rotation = 0,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  // Smooth resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Background fill (crisp neutral for any subtle borders)
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // If in contain mode, create a subtle aesthetic blurred backdrop
  if (fitMode === "contain") {
    ctx.save();
    ctx.filter = "blur(18px) brightness(0.65)";
    // Draw background cover
    const bgScale = Math.max(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight) * 1.1;
    const bgW = img.naturalWidth * bgScale;
    const bgH = img.naturalHeight * bgScale;
    ctx.drawImage(img, (targetWidth - bgW) / 2, (targetHeight - bgH) / 2, bgW, bgH);
    ctx.restore();
  }

  ctx.save();

  // Move origin to center of canvas
  ctx.translate(targetWidth / 2, targetHeight / 2);

  // Apply rotation
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // Calculate base scale
  const isRotatedQuarter = rotation === 90 || rotation === 270;
  const naturalW = isRotatedQuarter ? img.naturalHeight : img.naturalWidth;
  const naturalH = isRotatedQuarter ? img.naturalWidth : img.naturalHeight;

  let baseScale: number;
  if (fitMode === "contain") {
    baseScale = Math.min(targetWidth / naturalW, targetHeight / naturalH);
  } else {
    baseScale = Math.max(targetWidth / naturalW, targetHeight / naturalH);
  }

  const finalScale = baseScale * Math.max(0.5, zoom);
  const drawW = img.naturalWidth * finalScale;
  const drawH = img.naturalHeight * finalScale;

  // Apply panning (with rotation accounted for if necessary)
  const drawX = -drawW / 2 + panX;
  const drawY = -drawH / 2 + panY;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();

  // Output as File
  const mimeType = "image/webp";
  const finalName = fileName.replace(/\.[^/.]+$/, "") + "-card-fit.webp";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to process canvas into blob"));
          return;
        }
        const file = new File([blob], finalName, {
          type: mimeType,
          lastModified: Date.now(),
        });
        resolve(file);
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Smart automatic crop for when a user uploads a large image without opening modal.
 * Automatically extracts a 4:3 ratio frame favoring the upper center (face area)
 * and resizes to 800x600 px.
 */
export async function autoCropLargeImageToCard(
  file: File,
  targetWidth = 800,
  targetHeight = 600,
): Promise<File> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const targetRatio = targetWidth / targetHeight; // 4/3 = 1.333
  const currentRatio = naturalW / naturalH;

  // If already matches aspect ratio and dimensions, return original
  if (
    Math.abs(currentRatio - targetRatio) < 0.02 &&
    naturalW <= targetWidth &&
    naturalH <= targetHeight
  ) {
    return file;
  }

  // If the image is vertical/portrait, shift slightly upward so doctor face is preserved
  let panY = 0;
  if (currentRatio < targetRatio) {
    // Tall image: focus on top 20-30% rather than geometric center
    const scale = targetWidth / naturalW;
    const scaledH = naturalH * scale;
    const overflowH = scaledH - targetHeight;
    // Bias upward by 25% of overflow so head is not cut
    panY = -overflowH * 0.2;
  }

  return cropAndResizeImage(img, {
    targetWidth,
    targetHeight,
    aspectRatio: targetRatio,
    fitMode: "cover",
    panY,
  }, file.name);
}
