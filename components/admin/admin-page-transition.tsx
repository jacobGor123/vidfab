"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function AdminPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const transitionKey = `${pathname}?${searchParams.toString()}`;

  return (
    <div key={transitionKey} className="admin-page-transition">
      {children}
    </div>
  );
}
