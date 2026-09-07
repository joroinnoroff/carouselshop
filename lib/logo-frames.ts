/** Turntable captured from the carouseloslo.no Lottie (128 frames, 8s loop). */
export const LOGO_FRAME_COUNT = 128;
export const LOGO_LOOP_SECONDS = 8;
export const LOGO_FRAME_WIDTH = 960;
export const LOGO_FRAME_HEIGHT = 849;

export function logoFrameSrc(index: number) {
  const frame = ((index % LOGO_FRAME_COUNT) + LOGO_FRAME_COUNT) % LOGO_FRAME_COUNT;
  return `/logo3d/${String(frame).padStart(3, "0")}.webp`;
}
