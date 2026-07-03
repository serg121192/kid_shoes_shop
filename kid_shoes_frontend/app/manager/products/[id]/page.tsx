"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const ProductForm = dynamic(() => import("../_form"), {
  loading: () => (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
    </div>
  ),
});

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProductForm productId={Number(id)} />;
}
