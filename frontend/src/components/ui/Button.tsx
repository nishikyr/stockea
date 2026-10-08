import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const variants: Record<Variant, string> = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'bg-cream text-ink border-[1.5px] border-line hover:bg-sand',
    ghost: 'bg-transparent text-brand hover:bg-brand-soft',
    }

    type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant
    fullWidth?: boolean
    }

    export function Button({ variant = 'primary', fullWidth = false, className = '', ...props }: Props) {
    return (
        <button
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold
            transition-colors disabled:cursor-not-allowed disabled:opacity-50
            ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
        />
    )
}