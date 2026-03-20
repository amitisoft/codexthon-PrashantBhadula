type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="flex flex-col gap-4 rounded-xl2 border border-border bg-[linear-gradient(135deg,_rgba(36,75,102,0.06),_rgba(76,138,135,0.08))] p-6">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/70">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold text-ink">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-ink/70">{description}</p>
      </div>
    </header>
  );
}
