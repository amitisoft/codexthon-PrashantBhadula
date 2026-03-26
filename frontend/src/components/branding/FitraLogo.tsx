type FitraLogoProps = {
  className?: string;
  textClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
  compact?: boolean;
  onDark?: boolean;
};

export function FitraLogo({
  className = "",
  textClassName = "",
  subtitle,
  subtitleClassName = "",
  compact = false,
  onDark = false,
}: FitraLogoProps) {
  return (
    <div className={["flex items-center gap-3", compact ? "" : "flex-col text-center", className].join(" ").trim()}>
      <div
        className={[
          "flex items-center justify-center rounded-[28px] border p-2.5 shadow-[0_12px_30px_rgba(15,23,28,0.14)]",
          onDark ? "border-white/18 bg-white/8" : "border-border/80 bg-white/88",
        ].join(" ")}
      >
        <svg aria-hidden="true" className={compact ? "h-12 w-12" : "h-24 w-24"} viewBox="0 0 128 128">
          <defs>
            <linearGradient id="fitra-blue" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#1180D9" />
              <stop offset="100%" stopColor="#0B3778" />
            </linearGradient>
            <linearGradient id="fitra-green" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#49C65A" />
              <stop offset="100%" stopColor="#13984D" />
            </linearGradient>
          </defs>
          <path
            d="M64 10 98 26v34c0 25-15 45-34 56C45 105 30 85 30 60V26L64 10Z"
            fill="none"
            stroke="url(#fitra-blue)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="10"
          />
          <path
            d="M64 10 98 26"
            fill="none"
            stroke="url(#fitra-green)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="10"
          />
          <path
            d="M86 32v29c0 16-8 29-22 38"
            fill="none"
            stroke="url(#fitra-green)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="10"
          />
          <path
            d="M22 83 57 44l18 18 31-36"
            fill="none"
            stroke="url(#fitra-blue)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="11"
          />
          <path d="m98 22 18-5-6 18" fill="none" stroke="url(#fitra-blue)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="11" />
          <path d="M44 92V63l12-13v51" fill="url(#fitra-blue)" opacity="0.95" />
          <path d="M61 102V74l10-10v42" fill="url(#fitra-green)" opacity="0.95" />
          <path d="M77 93V67l10-11v28" fill="url(#fitra-green)" opacity="0.95" />
          <path d="M57 30h14v14H57z" fill="url(#fitra-green)" />
        </svg>
      </div>

      <div className={compact ? "min-w-0" : ""}>
        <div
          className={[
            "font-semibold uppercase tracking-[0.22em]",
            compact ? "text-2xl" : "text-4xl",
            onDark ? "text-white" : "text-primary",
            textClassName,
          ].join(" ")}
        >
          FITRA
        </div>
        {subtitle ? (
          <p className={["mt-1 text-sm", onDark ? "text-white/72" : "text-ink/55", subtitleClassName].join(" ")}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
