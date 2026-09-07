"use client";

import { Logo3DScene, type Logo3DVariant } from "./Logo3DScene";

type Logo3DProps = {
  variant: Logo3DVariant;
};

export function Logo3D({ variant }: Logo3DProps) {
  return (
    <div className={`logo3d logo3d--${variant}`}>
      <Logo3DScene variant={variant} />
    </div>
  );
}
