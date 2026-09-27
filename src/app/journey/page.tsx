import type { Metadata } from "next";
import { JourneyClient } from "@/components/journey/journey-client";

export const metadata: Metadata = {
  title: "سفر — فیلم تعاملی خلقت انسان",
  description: "از عالم ذر تا نفس مطمئنه؛ روایتی سینمایی از چرایی خلقت انسان، آمدن به دنیا و بازگشت به سوی خدا.",
};

export default function JourneyPage() {
  return <JourneyClient />;
}
