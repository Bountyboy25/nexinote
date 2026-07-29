import type { CSSProperties } from 'react';
import styles from './Slider.module.css';

interface SliderProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, label, unit }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <input
        type="range"
        className={styles.slider}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <span className={styles.value}>
        {value}
        {unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}
