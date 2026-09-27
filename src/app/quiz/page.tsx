import type { Metadata } from "next";
import { QuizHome } from "@/components/quiz/quiz-home";

export const metadata: Metadata = { title: "مسابقهٔ ایمان به غیب" };

export default function QuizPage() {
  return <QuizHome />;
}
