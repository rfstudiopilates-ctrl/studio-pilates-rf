import { useEffect, useState } from 'react';
import {
  formatCurrencyInputFromNumber,
  formatCurrencyTyping,
  parseCurrencyInput,
} from '../../lib/currency';

/**
 * Input de moneda argentina (miles con punto, decimales con coma).
 * value: number | null | ''
 * onValueChange: (number | null) => void
 */
export function CurrencyInput({
  label,
  error,
  id,
  className = '',
  value,
  onValueChange,
  allowZero = false,
  placeholder = '0,00',
  disabled = false,
  name,
  onBlur,
  ...props
}) {
  const inputId = id || name;
  const [text, setText] = useState(() =>
    value === null || value === undefined || value === ''
      ? ''
      : formatCurrencyInputFromNumber(value)
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;

    if (value === null || value === undefined || value === '') {
      setText('');
      return;
    }

    setText(formatCurrencyInputFromNumber(value));
  }, [value, focused]);

  const handleChange = (event) => {
    const nextText = formatCurrencyTyping(event.target.value);
    setText(nextText);

    if (!nextText || nextText === ',') {
      onValueChange?.(null);
      return;
    }

    if (nextText.endsWith(',')) {
      onValueChange?.(parseCurrencyInput(nextText.slice(0, -1)));
      return;
    }

    onValueChange?.(parseCurrencyInput(nextText));
  };

  const handleBlur = (event) => {
    setFocused(false);
    const parsed = parseCurrencyInput(text);

    if (parsed === null || (!allowZero && parsed === 0)) {
      setText('');
      onValueChange?.(null);
    } else {
      setText(formatCurrencyInputFromNumber(parsed));
      onValueChange?.(parsed);
    }

    onBlur?.(event);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-text-muted">
          $
        </span>
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={text}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`h-11 w-full rounded-xl border bg-white py-0 pl-8 pr-4 text-sm text-text outline-none transition-all duration-200 placeholder:text-text-muted focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 ${
            error ? 'border-danger' : 'border-border'
          }`}
          {...props}
        />
      </div>
      {error ? <p className="text-xs leading-relaxed text-danger">{error}</p> : null}
    </div>
  );
}
