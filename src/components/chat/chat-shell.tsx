"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { LoginGate } from "../auth-provider";
import { ChatSidebar } from "./chat-sidebar";

export function ChatShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inConversation = /^\/chat\/\d+/.test(pathname);
  return (
    <LoginGate title="برای ورود به پیام‌رسان بالغیب، وارد شو">
      <div className={cn("flex overflow-hidden", inConversation ? "h-dvh" : "h-[calc(100dvh-64px)] md:h-dvh")}>
        <div
          className={cn(
            "h-full w-full shrink-0 border-e border-white/5 md:flex md:w-[360px] lg:w-[400px]",
            inConversation ? "hidden" : "flex",
          )}
        >
          <ChatSidebar />
        </div>
        <main className={cn("h-full min-w-0 flex-1", inConversation ? "flex" : "hidden md:flex")}>{children}</main>
      </div>
    </LoginGate>
  );
}
