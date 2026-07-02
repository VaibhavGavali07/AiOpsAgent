interface Props {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SectionGroup({ label, description, children }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-600">{label}</h2>
          {description && <p className="text-xs text-ink-600/70 mt-0.5">{description}</p>}
        </div>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {children}
    </section>
  );
}
