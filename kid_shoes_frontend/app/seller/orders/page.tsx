"use client";

import OrdersPanel from "@/app/components/OrdersPanel";

export default function SellerOrdersPage() {
  return (
    <OrdersPanel
      title="Замовлення"
      createOrderHref="/seller/orders/new"
    />
  );
}
