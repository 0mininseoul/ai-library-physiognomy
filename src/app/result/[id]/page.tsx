import { ResultPage } from "@/components/pages/ResultPage";

export default function Page({ params }: { params: { id: string } }) {
  return <ResultPage sessionId={params.id} />;
}
