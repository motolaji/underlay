type EmptyStateProps = {
  title: string;
  body: string;
};

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-[color:var(--border-default)] p-6">
      <h3 className="text-lg font-[family-name:var(--font-display)] font-semibold text-[color:var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-2 max-w-xl text-sm leading-7">{body}</p>
    </div>
  );
}
