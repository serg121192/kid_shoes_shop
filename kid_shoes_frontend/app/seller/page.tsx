"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SellerIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/seller/orders");
  }, [router]);
  return null;
}
