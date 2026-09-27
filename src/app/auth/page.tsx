import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthClient } from "@/components/auth-client";
import { Spinner } from "@/components/auth-provider";

export const metadata: Metadata = { title: "ورود / ثبت‌نام" };

export default function AuthPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthClient />
    </Suspense>
  );
}
