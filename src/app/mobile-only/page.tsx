import type { Metadata } from "next";
import { MobileOnlyPage } from "@/components/pages/MobileOnlyPage";

export const metadata: Metadata = {
  title: "PC에서 접속해 주세요 - AI 관상가 고양이",
  description: "AI 관상가 고양이는 PC 카메라와 가로형 결과 리포트에 최적화되어 있어요.",
};

export default function Page({ searchParams }: { searchParams?: { next?: string } }) {
  return <MobileOnlyPage nextPath={safeNextPath(searchParams?.next)} />;
}

function safeNextPath(value?: string) {
  if (!value?.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}
