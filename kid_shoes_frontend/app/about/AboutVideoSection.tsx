"use client";

import StoreIntroVideo from "@/app/components/StoreIntroVideo";
import { getIntroVideoUrl } from "@/app/lib/intro-video";

export default function AboutVideoSection() {
  const videoUrl = getIntroVideoUrl();

  if (!videoUrl) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Відео про наш магазин</h2>
      <p className="text-sm text-gray-500 mb-4">
        Дізнайтесь більше про наш магазин — перегляньте коротку презентацію.
      </p>
      <StoreIntroVideo
        showPlayOverlay
        className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100 shadow-sm"
        videoClassName="h-full w-full object-contain bg-black/15"
      />
    </section>
  );
}
