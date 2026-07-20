"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { getIntroVideoUrl } from "@/app/lib/intro-video";

interface StoreIntroVideoProps {
  autoPlay?: boolean;
  className?: string;
  videoClassName?: string;
  onEnded?: () => void;
  showPlayOverlay?: boolean;
  /** Запросити нативний повноекранний режим після старту відтворення */
  requestFullscreen?: boolean;
}

async function enterFullscreen(video: HTMLVideoElement) {
  const webkitVideo = video as HTMLVideoElement & {
    webkitEnterFullscreen?: () => void;
  };
  if (typeof webkitVideo.webkitEnterFullscreen === "function") {
    webkitVideo.webkitEnterFullscreen();
    return;
  }
  const target = video.parentElement ?? video;
  if (target.requestFullscreen) {
    await target.requestFullscreen();
  }
}

export async function exitIntroFullscreen() {
  if (typeof document === "undefined") return;
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {});
  }
}

export default function StoreIntroVideo({
  autoPlay = false,
  className = "",
  videoClassName = "",
  onEnded,
  showPlayOverlay = false,
  requestFullscreen = false,
}: StoreIntroVideoProps) {
  const src = getIntroVideoUrl();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsTap, setNeedsTap] = useState(showPlayOverlay || !autoPlay);
  const [isPlaying, setIsPlaying] = useState(false);

  const tryPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const startPlayback = async (muted: boolean) => {
      video.muted = muted;
      await video.play();
      setNeedsTap(false);
      setIsPlaying(true);
      if (requestFullscreen) {
        await enterFullscreen(video).catch(() => {});
      }
    };

    try {
      await startPlayback(false);
    } catch {
      try {
        await startPlayback(true);
      } catch {
        setNeedsTap(true);
      }
    }
  }, [requestFullscreen]);

  useEffect(() => {
    if (!autoPlay || !src) return;
    tryPlay();
  }, [autoPlay, src, tryPlay]);

  if (!src) return null;

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={src}
        preload={autoPlay ? "auto" : "none"}
        playsInline
        controls={!showPlayOverlay || isPlaying}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onPlay={() => {
          setIsPlaying(true);
          setNeedsTap(false);
        }}
        onPause={() => setIsPlaying(false)}
        className={videoClassName}
      />

      {showPlayOverlay && needsTap && !isPlaying && (
        <button
          type="button"
          onClick={tryPlay}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 text-white"
          aria-label="Увімкнути відео"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-500 shadow-lg">
            <Play size={28} className="ml-1" fill="currentColor" />
          </span>
          <span className="text-sm font-medium">Дивитись презентацію</span>
        </button>
      )}
    </div>
  );
}
