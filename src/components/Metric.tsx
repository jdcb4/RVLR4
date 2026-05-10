export function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-typ-ui text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-typ-metric font-semibold">{value}</p>
    </div>
  );
}
