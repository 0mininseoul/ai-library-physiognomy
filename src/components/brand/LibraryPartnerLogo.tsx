type LibraryPartnerLogoProps = {
  className?: string;
};

export function LibraryPartnerLogo({ className = "" }: LibraryPartnerLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/gachon-central-library-logo.png?v=20260513-central-library"
      alt="가천대학교 중앙도서관"
      className={["object-contain", className].filter(Boolean).join(" ")}
      width={281}
      height={44}
    />
  );
}

export function LibraryPartnerBadge({ className = "" }: LibraryPartnerLogoProps) {
  return (
    <span className={["library-partner-badge inline-flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-1.5", className].join(" ")}>
      <span className="library-partner-caption whitespace-nowrap text-[0.58rem] font-black uppercase tracking-[0.14em]">Powered by</span>
      <LibraryPartnerLogo className="h-[1.9rem] w-[12.1rem]" />
    </span>
  );
}
