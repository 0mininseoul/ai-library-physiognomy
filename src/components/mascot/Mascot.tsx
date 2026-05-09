import Image from "next/image";

export type MascotVariant = "idle" | "diagnose" | "reading" | "result" | "retry";

type MascotProps = {
  variant?: MascotVariant;
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sources: Record<MascotVariant, string> = {
  idle: "/mascot/idle.webp",
  diagnose: "/mascot/diagnose.webp",
  reading: "/mascot/reading.webp",
  result: "/mascot/result.webp",
  retry: "/mascot/retry.webp",
};

const sizes = {
  sm: { box: "h-28 w-28", image: 112, text: "text-sm" },
  md: { box: "h-40 w-40", image: 160, text: "text-base" },
  lg: { box: "h-56 w-56", image: 224, text: "text-lg" },
};

export function Mascot({ variant = "idle", message, size = "md", className = "" }: MascotProps) {
  const selected = sizes[size];

  return (
    <figure className={`flex flex-col items-center gap-3 ${className}`.trim()}>
      <div className={`relative shrink-0 ${selected.box}`}>
        <Image
          src={sources[variant]}
          alt="AI 관상가 고양이"
          width={selected.image}
          height={selected.image}
          priority={variant === "idle"}
          className="h-full w-full object-contain drop-shadow-[0_16px_24px_rgba(36,76,70,0.18)]"
        />
      </div>
      {message ? (
        <figcaption className={`max-w-[18rem] text-center font-semibold leading-6 text-accent-info ${selected.text}`}>{message}</figcaption>
      ) : null}
    </figure>
  );
}
