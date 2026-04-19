export function SectionShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* <div className="shrink-0 border-b border-border/70 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </h3>
        <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div> */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </div>
  );
}
