import { CameraOff } from "lucide-react";
import { honorific } from "@/lib/korean/name";

type FaceImageProps = {
  displayName: string;
  faceImageUrl: string | null;
};

export function FaceImage({ displayName, faceImageUrl }: FaceImageProps) {
  const name = honorific(displayName);

  return (
    <section className="glass-panel rounded-2xl p-5 md:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-info">FACE CAPTURE</p>
        <h2 className="mt-2 text-2xl font-black text-text-primary">{name}의 얼굴 스캔 컷</h2>
      </div>

      <div className="mt-5 aspect-[4/3] overflow-hidden rounded-xl border border-border bg-bg-card">
        {faceImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={faceImageUrl} alt={`${name} 얼굴 분석 이미지`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <CameraOff className="h-9 w-9 text-accent-info" aria-hidden="true" />
            <p className="max-w-sm text-base font-black leading-7 text-text-primary">얼굴 이미지는 결과 보관 기간 동안만 표시돼요.</p>
          </div>
        )}
      </div>
    </section>
  );
}
