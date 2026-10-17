"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePersona } from "@/lib/persona/context";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/utils";

type Ctx = { open: () => void };
const ViewerContext = createContext<Ctx>({ open: () => {} });
export const usePhotoViewer = () => useContext(ViewerContext);

/** Round face avatar that opens the photo. */
export function Avatar({ size = 32, className }: { size?: number; className?: string }) {
  const { open } = usePhotoViewer();
  const { identity, fileHref } = usePersona();
  const src = identity.avatar?.src;
  // On touch screens the button grows to a 44px hit area; the negative margin keeps the layout (and the visible face) unchanged.
  const slack = Math.max(0, (44 - size) / 2);
  if (!src || !identity.photos.length)
    // No photo to open (or none this visitor may see): just the face, or the initials.
    return (
      <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-xs font-semibold ring-1 ring-line", className)} style={{ width: size, height: size }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileHref(src)} alt="" width={size} height={size} className="size-full object-cover" decoding="async" />
        ) : (
          <span aria-hidden="true">{identity.initials}</span>
        )}
      </span>
    );
  return (
    <button
      type="button"
      onClick={open}
      aria-label={`View photo of ${identity.name}`}
      className={cn(
        "group/avatar relative grid shrink-0 place-items-center rounded-full pointer-coarse:m-[calc(var(--av-slack)*-1)] pointer-coarse:p-[var(--av-slack)]",
        className,
      )}
      style={{ "--av-slack": `${slack}px` } as React.CSSProperties}
    >
      <span
        className="block overflow-hidden rounded-full ring-1 ring-line transition-transform group-hover/avatar:scale-105"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileHref(src)} alt="" width={size} height={size} className="size-full object-cover" decoding="async" />
      </span>
    </button>
  );
}

export function PhotoViewerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  return (
    <ViewerContext.Provider value={{ open: show }}>
      {children}
      <AnimatePresence>{open && <Viewer onClose={() => setOpen(false)} />}</AnimatePresence>
    </ViewerContext.Provider>
  );
}

/** Picasa-style: the page dims behind a centred photo; side arrows loop through the photos. Click outside, Esc or ✕ closes. */
function Viewer({ onClose }: { onClose: () => void }) {
  const { identity, fileHref } = usePersona();
  const allPhotos = identity.photos;
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [zoom, setZoom] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Tab and Shift+Tab stay inside the viewer (with one photo, "Close photo" is the only stop).
  useFocusTrap(dialogRef);
  const swipeX = useRef<number | null>(null);
  // Skip any photo that fails to load, so navigation never lands on an empty slide.
  const [broken, setBroken] = useState<string[]>([]);
  const photos = allPhotos.filter((p) => !broken.includes(p.src));
  const count = photos.length;
  const photo = photos[Math.min(index, count - 1)] ?? allPhotos[0];

  const go = useCallback(
    (step: 1 | -1) => {
      if (count < 2) return;
      setDir(step);
      setZoom(1);
      setIndex((i) => (i + step + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Preload the others so the arrows feel instant.
    for (const p of allPhotos) new Image().src = fileHref(p.src);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose, go, allPhotos, fileHref]);

  const arrow =
    "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/85 backdrop-blur transition-colors hover:bg-white/20 hover:text-white md:size-12";

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photos of ${identity.name}`}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[rgb(20_20_22/0.88)] backdrop-blur-md" aria-hidden="true" />
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 grid size-10 place-items-center pointer-coarse:size-11 rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
      >
        <X className="size-5" />
      </button>

      {count > 1 && (
        <button
          type="button"
          aria-label="Previous photo"
          className={cn(arrow, "left-3 md:left-8")}
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
        >
          <ChevronLeft className="size-6" />
        </button>
      )}

      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.img
          key={photo.src}
          src={fileHref(photo.src)}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          draggable={false}
          onError={() => {
            if (count > 1) setBroken((b) => [...b, photo.src]);
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 1.8))}
          onWheel={(e) => setZoom((z) => Math.min(3, Math.max(1, +(z * (e.deltaY < 0 ? 1.1 : 0.9)).toFixed(2))))}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") swipeX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (swipeX.current === null) return;
            const dx = e.clientX - swipeX.current;
            swipeX.current = null;
            if (Math.abs(dx) > 50 && count > 1) go(dx < 0 ? 1 : -1);
          }}
          initial={{ opacity: 0, x: dir * 60, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: zoom }}
          exit={{ opacity: 0, x: dir * -60, scale: 0.96 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative max-h-[calc(100dvh-5rem)] w-auto max-w-[calc(100vw-7rem)] touch-pan-y rounded-xl object-contain shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] select-none md:max-w-[calc(100vw-12rem)]",
            zoom > 1 ? "cursor-zoom-out" : "cursor-zoom-in",
          )}
        />
      </AnimatePresence>

      {count > 1 && (
        <button
          type="button"
          aria-label="Next photo"
          className={cn(arrow, "right-3 md:right-8")}
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
        >
          <ChevronRight className="size-6" />
        </button>
      )}
    </motion.div>
  );
}
