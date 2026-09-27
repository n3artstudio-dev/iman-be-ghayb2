import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/auth-provider";
import { QuizGame } from "@/components/quiz/quiz-game";

export const metadata: Metadata = { title: "دوئل مسابقه" };

export default function QuizPlayPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <QuizGame />
    </Suspense>
  );
}
