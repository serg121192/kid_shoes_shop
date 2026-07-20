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
  const posterUrl = getFootMeasurePosterUrl();

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
    <div className="space-y-4 pt-2">
      <p className="text-gray-600 text-sm">
        Дана відео-інструкція наочно допоможе вам зробити точні заміри стопи вашої дитини.
        Нагально рекомендуємо до перегляду!
      </p>

      {photoUrl && (
        <div className="mx-auto w-full max-w-[320px] sm:max-w-[400px] md:max-w-[480px] overflow-hidden rounded-xl border border-teal-100 bg-teal-50/40">
          <Image
            src={photoUrl}
            alt="Як правильно заміряти стопу дитини"
            width={960}
            height={1280}
            unoptimized={isCdnMediaUrl(photoUrl)}
            className="h-auto w-full object-cover"
            sizes="(max-width: 640px) 320px, (max-width: 768px) 400px, 480px"
          />
        </div>
      )}

      {videoUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100 shadow-sm">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl || undefined}
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
            className="h-full w-full object-contain bg-black/10"
          />

          {needsTap && !isPlaying && (
            <button
              type="button"
              onClick={tryPlay}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white"
              aria-label="Дивитись відео-інструкцію"
              style={
                posterUrl
                  ? {
                      backgroundImage: `url(${posterUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              <span
                className={`absolute inset-0 ${posterUrl ? "bg-black/35" : "bg-gradient-to-br from-teal-700 to-teal-900"}`}
                aria-hidden
              />
              <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500 shadow-lg">
                <Play size={28} className="ml-1" fill="currentColor" />
              </span>
              <span className="relative z-10 text-sm font-medium drop-shadow">
                Дивитись відео-інструкцію
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
