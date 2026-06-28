import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}>;

const variants = {
  primary: 'bg-[#f54e00] text-white hover:bg-[#d04200] focus-visible:outline-[#f54e00]',
  secondary: 'border border-[#cfcdc4] bg-white text-[#26251e] hover:bg-[#efeee8] focus-visible:outline-[#26251e]',
  ghost: 'bg-transparent text-[#5a5852] hover:bg-[#efeee8] focus-visible:outline-[#26251e]',
  danger: 'bg-[#cf2d56] text-white hover:bg-[#b72649] focus-visible:outline-[#cf2d56]',
};

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold leading-none transition-[transform,background-color,border-color,opacity] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
