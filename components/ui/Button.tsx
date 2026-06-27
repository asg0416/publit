import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}>;

const variants = {
  primary: 'bg-[#ff9a3d] text-[#160d06] shadow-[0_12px_30px_rgba(255,154,61,0.28)]',
  secondary: 'bg-white/10 text-[#f7efe3] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]',
  ghost: 'bg-transparent text-[#d9e5ef]',
  danger: 'bg-[#ff5c7a] text-white',
};

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-[transform,opacity,background-color] duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
