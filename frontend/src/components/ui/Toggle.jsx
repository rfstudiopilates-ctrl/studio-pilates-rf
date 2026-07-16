export function Toggle({ label, description, checked, onChange, id }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-white px-4 py-3"
    >
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        {description ? <p className="mt-1 text-xs text-text-muted">{description}</p> : null}
      </div>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-border transition peer-checked:bg-brand-400" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
