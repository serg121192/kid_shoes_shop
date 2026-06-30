"use client";

import { useEffect } from "react";
import api from "@/app/lib/api";

export default function VisitTracker() {
  useEffect(() => {
    const track = () => {
      const key = "visit_tracked_" + new Date().toISOString().slice(0, 10);
      if (sessionStorage.getItem(key)) return;
      api.post("/shop/track-visit/").catch(() => {});
      sessionStorage.setItem(key, "1");
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(track, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(track, 2000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
