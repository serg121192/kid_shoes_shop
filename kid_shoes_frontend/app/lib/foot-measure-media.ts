/** Медіа для інструкції з замірів стопи (R2). */

const DEFAULT_FOOT_MEASURE_VIDEO_URL =
  "https://pub-fa1a08732ef040a4a006b7568fa96970.r2.dev/about_video/foot-measure-web.mp4";

export function getFootMeasurePhotoUrl(): string {
  return (
    process.env.NEXT_PUBLIC_FOOT_MEASURE_PHOTO_URL?.trim() ||
    process.env.NEXT_PUBLIC_PHOTO_MEASURE_URL?.trim() ||
    ""
  );
}

export function getFootMeasureVideoUrl(): string {
  return (
    process.env.NEXT_PUBLIC_FOOT_MEASURE_VIDEO_URL?.trim() ||
    DEFAULT_FOOT_MEASURE_VIDEO_URL
  );
}

export function getFootMeasurePosterUrl(): string {
  return (
    process.env.NEXT_PUBLIC_FOOT_MEASURE_POSTER_URL?.trim() ||
    getFootMeasurePhotoUrl()
  );
}
