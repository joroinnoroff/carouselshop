import Link from "next/link";

/**
 * The wordmark: "Carousel" set on the three faces of a prism that turns
 * forever, so the name comes round again and again — a carousel of Carousels.
 */
export function CarouselLogo() {
  return (
    <Link href="/" className="logo" aria-label="Carousel Oslo — home">
      <span className="logo-stage">
        <span className="logo-spin" aria-hidden>
          <span className="logo-face">Carousel</span>
          <span className="logo-face">Carousel</span>
          <span className="logo-face">Carousel</span>
          <span className="logo-sizer">Carousel</span>
        </span>
      </span>
    </Link>
  );
}
