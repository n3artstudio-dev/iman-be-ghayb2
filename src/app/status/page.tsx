import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/auth-provider";
import { StatusClient } from "@/components/status/status-client";

export const metadata: Metadata = { title: "وضعیت" };

export default function StatusPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <StatusClient />
    </Suspense>
  );
}
