"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import StoreIntroVideo from "@/app/components/StoreIntroVideo";
import {
  getIntroVideoUrl,
  hasSeenIntro,
  markIntroSeen,
} from "@/app/lib/intro-video";

function scheduleIdle(task: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const id = window.requestIdleCallback(task, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const timer = setTimeout(task, 1200);
  return () => clearTimeout(timer);
}

export default function IntroVideoGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const videoUrl = getIntroVideoUrl();

  const dismiss = useCallback(() => {
    markIntroSeen();
    setVisible(false);
    document.body.style.overflow = "";
    router.replace("/products");
  }, [router]);

  useEffect(() => {
    if (!videoUrl) return;
    if (pathname?.startsWith("/manager")) return;
    if (hasSeenIntro()) return;

    return scheduleIdle(() => {
      setVisible(true);
      document.body.style.overflow = "hidden";
    });
  }, [pathname, videoUrl]);

  useEffect(() => {
    if (!visible) return;
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Презентація магазину"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/30 transition-colors"
        aria-label="Пропустити презентацію"
      >
        <X size={18} />
        Пропустити
      </button>

      <div className="w-full max-w-5xl">
        <StoreIntroVideo
          autoPlay
          showPlayOverlay
          onEnded={dismiss}
          className="aspect-video w-full overflow-hidden rounded-2xl bg-black/30 shadow-2xl ring-1 ring-white/20"
          videoClassName="h-full w-full object-contain bg-black/20"
        />
        <p className="mt-4 text-center text-sm text-white/80 drop-shadow-sm">
          Після перегляду ви перейдете до каталогу товарів
        </p>
      </div>
    </div>
  );
}
