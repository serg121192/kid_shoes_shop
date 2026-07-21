"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { isCdnMediaUrl } from "@/app/lib/api";
import {
  getFootMeasurePhotoUrl,
  getFootMeasurePosterUrl,
  getFootMeasureVideoUrl,
} from "@/app/lib/foot-measure-media";

export default function FootMeasureMedia() {
  const photoUrl = getFootMeasurePhotoUrl();
  const videoUrl = getFootMeasureVideoUrl();
  const explicitPosterUrl = getFootMeasurePosterUrl();
  const videoPosterUrl = photoUrl ? "" : explicitPosterUrl;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsTap, setNeedsTap] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const tryPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
      setNeedsTap(false);
      setIsPlaying(true);
    } catch {
      setNeedsTap(true);
    }
  }, []);

  if (!photoUrl && !videoUrl) return null;

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 rounded-xl border border-teal-100 bg-teal-50/30 p-4 sm:p-5">
      <p className="text-sm text-gray-600">
        Перегляньте фото та відео-інструкцію — вони допоможуть зробити точні заміри стопи дитини.
      </p>

      {photoUrl && (
        <figure className="space-y-2">
          <figcaption className="text-xs font-medium uppercase tracking-wide text-teal-700">
            Фото-інструкція
          </figcaption>
          <div className="overflow-hidden rounded-lg border border-teal-100 bg-white shadow-sm">
            <Image
              src={photoUrl}
              alt="Як правильно заміряти стопу дитини"
              width={960}
              height={1280}
              unoptimized={isCdnMediaUrl(photoUrl)}
              className="h-auto w-full object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
            />
          </div>
        </figure>
      )}

      {videoUrl && (
        <figure className="space-y-2">
          <figcaption className="text-xs font-medium uppercase tracking-wide text-teal-700">
            Відео-інструкція
          </figcaption>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-teal-100 bg-white shadow-sm">
            <video
              ref={videoRef}
              src={videoUrl}
              poster={videoPosterUrl || undefined}
              preload="metadata"
              playsInline
              controls={!needsTap || isPlaying}
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              onPlay={() => {
                setIsPlaying(true);
                setNeedsTap(false);
              }}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="h-full w-full object-contain bg-gray-900/5"
            />

            {needsTap && !isPlaying && (
              <button
                type="button"
                onClick={tryPlay}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white"
                aria-label="Дивитись відео-інструкцію"
                style={
                  videoPosterUrl
                    ? {
                        backgroundImage: `url(${videoPosterUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <span
                  className={`absolute inset-0 ${videoPosterUrl ? "bg-black/35" : "bg-gradient-to-br from-teal-700/90 to-teal-900/90"}`}
                  aria-hidden
                />
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 shadow-lg">
                  <Play size={24} className="ml-1" fill="currentColor" />
                </span>
                <span className="relative z-10 text-sm font-medium drop-shadow">
                  Дивитись відео
                </span>
              </button>
            )}
          </div>
        </figure>
      )}
    </div>
  );
}
