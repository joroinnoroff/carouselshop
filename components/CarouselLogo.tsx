import Link from "next/link";

import { Logo3D } from "@/components/Logo3D";

/**
 * Shop mark: the chrome flower in miniature, plus the wordmark.
 * The large turntable lives on the home hero.
 */
export function CarouselLogo() {
  return (
    <Link href="/" className="logo" aria-label="Carousel Oslo — home">
      <Logo3D variant="mark" />
      <span className="logo-word">Carousel</span>
    </Link>
  );
}
