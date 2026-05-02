import React, { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

export type InputTone = 'neutral' | 'error';

const baseFieldStyles =
  'w-full font-sans rounded-md border bg-background px-3 py-2 text-base md:text-sm placeholder:text-text/50 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors';

const toneStyles: Record<InputTone, string> = {
  neutral: 'border-black/20 dark:border-white/20 focus:ring-accent',
  error: 'border-error focus:ring-error',
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  tone?: InputTone;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, tone, ...props }, ref) => {
    const effectiveTone: InputTone = tone ?? (error ? 'error' : 'neutral');
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-sans font-medium text-text">{label}</label>}
        <input
          className={cn('flex h-11 md:h-10', baseFieldStyles, toneStyles[effectiveTone], className)}
          ref={ref}
          {...props}
        />
        {error && <span className="text-xs font-sans text-error">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  tone?: InputTone;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, tone, ...props }, ref) => {
    const effectiveTone: InputTone = tone ?? (error ? 'error' : 'neutral');
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-sans font-medium text-text">{label}</label>}
        <textarea
          className={cn('flex min-h-[96px]', baseFieldStyles, toneStyles[effectiveTone], className)}
          ref={ref}
          {...props}
        />
        {error && <span className="text-xs font-sans text-error">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
