type SectionMastheadProps = {
  eyebrow: string;
  title: string;
  body: string;
};

export function SectionMasthead({
  eyebrow,
  title,
  body,
}: SectionMastheadProps) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-balance text-3xl leading-tight text-[color:var(--ink)] sm:text-4xl">
        {title}
      </h2>
      <p className="max-w-2xl text-base leading-7 sm:text-lg">{body}</p>
    </div>
  );
}
