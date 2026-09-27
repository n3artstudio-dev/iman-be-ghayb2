import type { Metadata } from "next";
import { AdminClient } from "@/components/admin/admin-client";

export const metadata: Metadata = { title: "پنل مدیریت سامانه" };

export default function AdminPage() {
  return <AdminClient />;
}
