export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <p className="text-sm font-bold text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black text-text-primary">{value}</p>
    </section>
  );
}
