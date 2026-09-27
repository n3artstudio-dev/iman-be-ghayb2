import type { Metadata } from "next";
import { CinemaClient } from "@/components/cinema/cinema-client";

export const metadata: Metadata = { title: "سینمای آیات" };

export default function CinemaPage() {
  return <CinemaClient />;
}
