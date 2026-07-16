export function ColorInput({ label, value, onChange, name }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-white p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 flex-1 rounded-xl border border-border bg-white px-4 text-sm uppercase text-text outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          placeholder="#F4C2C2"
        />
      </div>
    </div>
  );
}
