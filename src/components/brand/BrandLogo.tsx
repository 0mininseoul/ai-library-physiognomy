import Image from "next/image";

export function BrandLogo({ className }: { className?: string }) {
  return <Image src="/brand/ai-library-logo.png" alt="" aria-hidden="true" width={512} height={512} className={className} priority unoptimized />;
}
