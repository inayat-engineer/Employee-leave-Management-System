import { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        'rounded-2xl border border-border bg-surface/95 p-6 backdrop-blur-sm',
        'shadow-[0_20px_45px_-30px_rgba(15,23,42,0.18)]',
        'dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.7)]',
        className,
      )}
      {...props}
    />
  );
}
