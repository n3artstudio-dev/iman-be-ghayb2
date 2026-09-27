import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChatShell } from "@/components/chat/chat-shell";

export const metadata: Metadata = { title: "پیام‌ها" };

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ChatShell>{children}</ChatShell>;
}
