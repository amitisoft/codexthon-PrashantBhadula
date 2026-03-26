type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="premium-hero overflow-hidden rounded-xl2 p-7">
      <div className="max-w-3xl">
        <p className="premium-pill inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
          {eyebrow}
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink md:text-[2.4rem]">{title}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/72 md:text-[15px]">{description}</p>
      </div>
    </header>
  );
}
