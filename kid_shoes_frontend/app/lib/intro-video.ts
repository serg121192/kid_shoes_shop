export const INTRO_SEEN_KEY = "tak-i-tak_intro_seen";

/** URL презентаційного відео (R2 або /public). Задається через NEXT_PUBLIC_INTRO_VIDEO_URL */
export function getIntroVideoUrl(): string {
  return process.env.NEXT_PUBLIC_INTRO_VIDEO_URL?.trim() ?? "";
}

export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(INTRO_SEEN_KEY) === "1";
}

export function markIntroSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INTRO_SEEN_KEY, "1");
}
