import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Textarea, type TextareaProps } from '@fluentui/react-components';

export interface FastTextareaProps extends Omit<TextareaProps, 'value' | 'onChange'> {
  value: string;
  onChange: (val: string) => void;
  debounceMs?: number;
}

/**
 * FastTextarea maintains an isolated local state for immediate 60-120 FPS keystroke response.
 * Keystrokes update the local DOM without re-rendering the parent heavy component tree.
 * Propagates changes to the parent via debouncing and flushes synchronously on blur.
 */
export const FastTextarea = forwardRef<HTMLTextAreaElement, FastTextareaProps>(({
  value,
  onChange,
  debounceMs = 180,
  placeholder,
  ...props
}, ref) => {
  const [localValue, setLocalValue] = useState(value);
  const localValueRef = useRef(localValue);
  localValueRef.current = localValue;

  const timerRef = useRef<any>(null);

  // Synchronize when external value changes (e.g. streaming transcription, clear, history load)
  useEffect(() => {
    if (value !== localValueRef.current) {
      setLocalValue(value);
      localValueRef.current = value;
    }
  }, [value]);

  const commit = (val: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onChange(val);
  };

  const handleChange = (_: any, data: { value: string }) => {
    const nextVal = data.value;
    setLocalValue(nextVal);
    localValueRef.current = nextVal;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      commit(nextVal);
    }, debounceMs);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (timerRef.current) {
      commit(localValueRef.current);
    }
    props.onBlur?.(e);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <Textarea
      ref={ref}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      {...props}
    />
  );
});

FastTextarea.displayName = 'FastTextarea';
