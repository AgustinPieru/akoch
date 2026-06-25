import { useState, forwardRef, useRef, useEffect } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

type Props = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: number | '';
  onChange: (value: number | '') => void;
};

function formatDisplay(val: number | ''): string {
  if (val === '' || val === null || val === undefined) return '';
  return Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Inserta separador de miles en la parte entera, conservando los decimales tal cual se tipearon.
function formatRaw(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split(',');
  const intFormatted = (intPart || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${intFormatted},${decPart}` : intFormatted;
}

function toNumber(raw: string): number | '' {
  if (!raw) return '';
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? '' : parsed;
}

function valueToRaw(val: number | ''): string {
  if (val === '' || val === null || val === undefined) return '';
  return Number(val).toString().replace('.', ',');
}

const CurrencyField = forwardRef<HTMLInputElement, Props>(function CurrencyField(
  { value, onChange, onBlur, onFocus, ...rest },
  forwardedRef
) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');
  const inputElRef = useRef<HTMLInputElement | null>(null);

  const displayValue = focused ? formatRaw(raw) : formatDisplay(value);

  // Mantiene el cursor al final tras reformatear en cada tecla (evita que salte al medio del número).
  useEffect(() => {
    if (focused && inputElRef.current) {
      const len = inputElRef.current.value.length;
      inputElRef.current.setSelectionRange(len, len);
    }
  }, [displayValue, focused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setRaw(valueToRaw(value));
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    onChange(toNumber(raw));
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d,]/g, '');
    const firstComma = v.indexOf(',');
    if (firstComma !== -1) {
      const intPart = v.slice(0, firstComma);
      const decPart = v.slice(firstComma + 1).replace(/,/g, '').slice(0, 2);
      v = `${intPart},${decPart}`;
    }
    setRaw(v);
  };

  return (
    <TextField
      {...rest}
      inputRef={(el: HTMLInputElement | null) => {
        inputElRef.current = el;
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      inputProps={{ ...rest.inputProps, inputMode: 'decimal' }}
    />
  );
});

export default CurrencyField;
