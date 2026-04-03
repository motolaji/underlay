type EmptyStateProps = {
  title: string;
  body: string;
};

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-[color:var(--border)] bg-[color:rgba(255,255,255,0.36)] p-6">
      <h3 className="text-2xl text-[color:var(--ink)]">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-7">{body}</p>
    </div>
  );
}
