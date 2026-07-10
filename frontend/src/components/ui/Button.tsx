import { ButtonHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-glow hover:-translate-y-0.5 hover:bg-accent/90 focus-visible:ring-accent/40',
  secondary:
    'border border-border bg-surface-soft text-text hover:bg-surface hover:border-accent/40',
  ghost: 'text-text-muted hover:bg-surface-soft hover:text-text',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={twMerge(
        'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
});