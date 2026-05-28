import { useState, forwardRef } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

type Props = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: number | '';
  onChange: (value: number | '') => void;
};

function formatDisplay(val: number | ''): string {
  if (val === '' || val === null || val === undefined) return '';
  return Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CurrencyField = forwardRef<HTMLInputElement, Props>(function CurrencyField(
  { value, onChange, onBlur, onFocus, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');

  const displayValue = focused ? raw : formatDisplay(value);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setRaw(value === '' ? '' : String(value));
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    onChange(isNaN(parsed) ? '' : parsed);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir dígitos, punto y coma
    const v = e.target.value.replace(/[^\d.,]/g, '');
    setRaw(v);
  };

  return (
    <TextField
      {...rest}
      inputRef={ref}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      inputProps={{ ...rest.inputProps, inputMode: 'decimal' }}
    />
  );
});

export default CurrencyField;
