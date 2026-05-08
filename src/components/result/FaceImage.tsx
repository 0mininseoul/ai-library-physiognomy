import { Mascot } from "@/components/mascot/Mascot";

type FaceImageProps = {
  displayName: string;
  faceImageUrl: string | null;
};

export function FaceImage({ displayName, faceImageUrl }: FaceImageProps) {
  const name = displayName || "회원";

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:p-6">
      <div>
        <p className="text-sm font-black text-prescription">관상 스캔 컷</p>
        <h2 className="mt-1 text-2xl font-black text-ink">{name} 얼굴 데이터</h2>
      </div>

      <div className="mt-5 aspect-[4/3] overflow-hidden rounded-lg bg-[#152522]">
        {faceImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={faceImageUrl} alt={`${name} 얼굴 분석 이미지`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <Mascot variant="retry" size="sm" />
            <p className="max-w-sm text-base font-black leading-7 text-white">얼굴 이미지는 24시간 이후 삭제됐어요.</p>
          </div>
        )}
      </div>
    </section>
  );
}
