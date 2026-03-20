type EmptyFeatureStateProps = {
  title: string;
  description: string;
  primaryAction: string;
  secondaryHint: string;
};

export function EmptyFeatureState({
  title,
  description,
  primaryAction,
  secondaryHint,
}: EmptyFeatureStateProps) {
  return (
    <section className="rounded-xl2 border border-dashed border-border bg-canvas p-8 text-center">
      <h3 className="text-2xl font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ink/70">{description}</p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-soft"
          type="button"
        >
          {primaryAction}
        </button>
        <p className="text-sm text-ink/55">{secondaryHint}</p>
      </div>
    </section>
  );
}
