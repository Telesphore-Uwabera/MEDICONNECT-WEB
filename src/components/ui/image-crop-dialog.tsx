import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
  Check,
  Loader2,
  Crop,
  Sparkles,
  Move,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cropAndResizeImage,
  readFileAsDataURL,
  loadImage,
  DEFAULT_DOCTOR_CARD_CROP,
} from "@/lib/image-cropper";
import { cn } from "@/lib/utils";

interface ImageCropDialogProps {
  open: boolean;
  onClose: () => void;
  file: File | null;
  onApply: (croppedFile: File) => void;
  aspectRatio?: number;
  targetWidth?: number;
  targetHeight?: number;
  title?: string;
  subtitle?: string;
}

export function ImageCropDialog({
  open,
  onClose,
  file,
  onApply,
  aspectRatio = 4 / 3,
  targetWidth = 800,
  targetHeight = 600,
  title = "Fit Doctor Photo to Card",
  subtitle = "Adjust and cut image to exact card pixels (800 × 600 px · 4:3) so it displays fully.",
}: ImageCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Load image when file changes
  useEffect(() => {
    if (!file || !open) {
      setImageSrc(null);
      setImgElement(null);
      setNaturalSize(null);
      return;
    }

    let isMounted = true;
    readFileAsDataURL(file)
      .then((dataUrl) => {
        if (!isMounted) return;
        setImageSrc(dataUrl);
        return loadImage(dataUrl);
      })
      .then((img) => {
        if (!isMounted || !img) return;
        setImgElement(img);
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });

        // Reset adjustments
        setZoom(1);
        setRotation(0);
        setFitMode("cover");

        // If the uploaded image is tall/portrait, bias upward slightly
        const currentRatio = img.naturalWidth / img.naturalHeight;
        if (currentRatio < aspectRatio) {
          setPan({ x: 0, y: 30 }); // slight upward shift
        } else {
          setPan({ x: 0, y: 0 });
        }
      })
      .catch((err) => {
        console.error("Failed to load file for cropping", err);
      });

    return () => {
      isMounted = false;
    };
  }, [file, open, aspectRatio]);

  // Handle Drag / Pan
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(3, Math.max(0.6, parseFloat((z + delta).toFixed(2)))));
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFitMode("cover");
  };

  const handleToggleFitMode = () => {
    setFitMode((m) => (m === "cover" ? "contain" : "cover"));
    setPan({ x: 0, y: 0 });
  };

  // Apply crop and output 800x600 file
  const handleApply = async () => {
    if (!imgElement || !file) return;
    setIsProcessing(true);

    try {
      // Calculate normalized pan factor matching viewport scale to target 800x600
      const vp = viewportRef.current;
      const vpWidth = vp ? vp.clientWidth : 400;
      const scaleMultiplier = targetWidth / vpWidth;

      const fittedFile = await cropAndResizeImage(
        imgElement,
        {
          aspectRatio,
          targetWidth,
          targetHeight,
          quality: 0.92,
          fitMode,
          zoom,
          panX: pan.x * scaleMultiplier,
          panY: pan.y * scaleMultiplier,
          rotation,
        },
        file.name,
      );

      onApply(fittedFile);
      onClose();
    } catch (err) {
      console.error("Error cropping image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl animate-scaleIn max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Crop className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                {title}
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {targetWidth} × {targetHeight} px (4:3)
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body / Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Card framing container */}
          <div className="relative mx-auto w-full max-w-[460px]">
            {/* Aspect 4:3 card simulator */}
            <div
              ref={viewportRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
              style={{ aspectRatio: `${targetWidth} / ${targetHeight}` }}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border-2 border-primary/40 bg-slate-950 shadow-inner select-none cursor-grab active:cursor-grabbing",
                "touch-none group",
              )}
            >
              {/* Optional blurred backdrop in contain mode */}
              {fitMode === "contain" && imageSrc && (
                <div
                  className="absolute inset-0 bg-cover bg-center blur-md opacity-40 scale-110"
                  style={{ backgroundImage: `url(${imageSrc})` }}
                />
              )}

              {/* Centered transform container */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px)`,
                }}
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt="Doctor preview"
                    draggable={false}
                    className="max-w-none transition-transform duration-75 select-none"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      objectFit: fitMode,
                      width: fitMode === "cover" ? "100%" : "auto",
                      height: fitMode === "cover" ? "100%" : "auto",
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                    Loading photo...
                  </div>
                )}
              </div>

              {/* Subtle Rule-of-Thirds Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/10 opacity-30">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>

              {/* Drag indicator pill */}
              <div className="absolute bottom-2 left-2 pointer-events-none rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                <Move className="h-3 w-3 text-primary" />
                Drag to reposition · Scroll to zoom
              </div>

              {/* Fit Badge */}
              <div className="absolute top-2 right-2 pointer-events-none rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm uppercase tracking-wide">
                {fitMode === "cover" ? "Fill Card" : "Fit Full Photo"}
              </div>
            </div>

            {/* Info badge beneath viewport */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>
                Original: {naturalSize ? `${naturalSize.width} × ${naturalSize.height} px` : "..."}
              </span>
              <span className="text-primary font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Output will be exact {targetWidth} × {targetHeight} px
              </span>
            </div>
          </div>

          {/* Interactive Controls Bar */}
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 w-12 shrink-0">
                Zoom
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, parseFloat((z - 0.1).toFixed(2))))}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-secondary transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min="0.6"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, parseFloat((z + 0.1).toFixed(2))))}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-secondary transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-mono font-medium text-foreground w-11 text-right shrink-0">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleFitMode}
                  className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  {fitMode === "cover" ? (
                    <>
                      <Minimize2 className="h-3 w-3 text-muted-foreground" />
                      Fit Full (Contain)
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3 w-3 text-muted-foreground" />
                      Fill Card (Cover)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="h-3 w-3 text-muted-foreground" />
                  Rotate
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3.5 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
            className="h-8 rounded-lg border-border/60 text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={isProcessing || !imgElement}
            className="h-8 gap-1.5 rounded-lg px-4 text-xs font-semibold"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Fitting to {targetWidth}×{targetHeight}...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Apply & Fit to Card
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
