"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

function LazyLoopVideo({ src, label }: { src: string; label: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setActive(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => undefined);
  }, [active]);

  return (
    <div ref={rootRef} className="galleri-media">
      {active ? (
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          autoPlay
          preload="none"
          aria-label={label}
        />
      ) : null}
    </div>
  );
}

export function Galleri() {
  return (
    <section className="galleri">
      <div className="section-label">
        <span>Galleri</span>
      </div>

      <div className="galleri-grid">
        <figure className="galleri-frame">
          <LazyLoopVideo src="/galleri.mp4" label="Carousel Oslo studio" />
        </figure>

        <figure className="galleri-frame">
          <div className="galleri-media">
            <Image
              src="/plukkogmiks.png"
              alt="A mixed bouquet from the shop — hydrangea, roses and anthurium"
              fill
              sizes="(max-width: 720px) 100vw, 40vw"
            />
          </div>
          <figcaption>Plukk og mix</figcaption>
        </figure>
      </div>
    </section>
  );
}
