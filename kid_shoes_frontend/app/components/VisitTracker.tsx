"use client";

import { useEffect } from "react";
import api from "@/app/lib/api";

export default function VisitTracker() {
  useEffect(() => {
    const key = "visit_tracked_" + new Date().toISOString().slice(0, 10);
    if (sessionStorage.getItem(key)) return;
    api.post("/shop/track-visit/").catch(() => {});
    sessionStorage.setItem(key, "1");
  }, []);

  return null;
}
