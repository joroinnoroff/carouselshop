"use client";

import { useEffect, useRef } from "react";

import {
  LOGO_FRAME_COUNT,
  LOGO_LOOP_SECONDS,
  logoFrameSrc,
} from "@/lib/logo-frames";

export type Logo3DVariant = "hero" | "mark";

type Logo3DSceneProps = {
  variant: Logo3DVariant;
};

type FrameBank = {
  images: (HTMLImageElement | null)[];
};

type Crop = { minX: number; minY: number; width: number; height: number };

let frameBank: FrameBank | null = null;
let markCrop: Crop | null = null;

function ensureFrames(): FrameBank {
  if (frameBank) return frameBank;

  const images: (HTMLImageElement | null)[] = Array.from(
    { length: LOGO_FRAME_COUNT },
    () => null,
  );
  frameBank = { images };

  const order: number[] = [0, LOGO_FRAME_COUNT - 1];
  for (let i = 1; i < LOGO_FRAME_COUNT - 1; i += 1) order.push(i);
  let cursor = 0;
  const take = () => (cursor < order.length ? order[cursor++] : null);

  const worker = async () => {
    while (true) {
      const index = take();
      if (index === null) return;
      const image = new Image();
      image.decoding = "async";
      image.src = logoFrameSrc(index);
      try {
        await image.decode();
      } catch {
        continue;
      }
      images[index] = image;
      if (index === 0 && !markCrop) markCrop = opaqueBounds(image);
    }
  };

  void Promise.all(Array.from({ length: 8 }, () => worker()));
  return frameBank;
}

export function Logo3DScene({ variant }: Logo3DSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    return mountLogo(host, variant);
  }, [variant]);

  return (
    <div ref={hostRef} className={`logo3d-scene logo3d-scene--${variant}`}>
      <img src={logoFrameSrc(0)} alt="" className="logo3d-fallback" />
    </div>
  );
}

function mountLogo(host: HTMLDivElement, variant: Logo3DVariant) {
  const isHero = variant === "hero";
  const frames = ensureFrames();
  const canvas = document.createElement("canvas");
  canvas.className = "logo3d-canvas";
  canvas.setAttribute("aria-hidden", "true");

  // Fixed pixel size — CSS scales it. Resizing on scroll is what made
  // the old WebGL canvas hitch the whole page.
  if (isHero) {
    canvas.width = 960;
    canvas.height = 849;
  } else {
    canvas.width = 240;
    canvas.height = 315;
  }

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return () => {};

  host.appendChild(canvas);

  let visible = true;
  let raf = 0;
  let lastTime = 0;
  let playhead = 0;
  let lastFrame = -1;
  let ready = false;
  const framesPerSecond = LOGO_FRAME_COUNT / LOGO_LOOP_SECONDS;

  function paint(index: number) {
    const image = frames.images[index];
    if (!image || index === lastFrame) return;
    lastFrame = index;

    context!.clearRect(0, 0, canvas.width, canvas.height);
    if (!isHero) {
      const crop = markCrop ?? opaqueBounds(image);
      if (crop) {
        markCrop = crop;
        context!.drawImage(
          image,
          crop.minX,
          crop.minY,
          crop.width,
          crop.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      } else {
        context!.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
    } else {
      context!.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    if (!ready) {
      ready = true;
      host.classList.add("is-ready");
    }
  }

  function loop(now: number) {
    if (!visible) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(loop);
    const delta = lastTime === 0 ? 0 : Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    playhead += delta * framesPerSecond;
    if (playhead >= LOGO_FRAME_COUNT) {
      playhead -= LOGO_FRAME_COUNT * Math.floor(playhead / LOGO_FRAME_COUNT);
    }
    const index = Math.floor(playhead) % LOGO_FRAME_COUNT;
    if (frames.images[index]) paint(index);
  }

  function play() {
    if (raf) return;
    lastTime = 0;
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) play();
      else pause();
    },
    { threshold: 0.01 },
  );
  intersection.observe(host);
  play();

  return () => {
    pause();
    intersection.disconnect();
    canvas.remove();
    host.classList.remove("is-ready");
  };
}

function opaqueBounds(image: HTMLImageElement): Crop | null {
  if (!image.width) return null;

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      if (pixels[(y * canvas.width + x) * 4 + 3] < 24) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX <= minX || maxY <= minY) return null;

  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(canvas.width, maxX + pad);
  maxY = Math.min(canvas.height, maxY + pad);

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
