export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-ink/60">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink">{value}</p>
    </section>
  );
}
