import type { ReactNode } from 'react'

type Tone = 'neutral' | 'brand' | 'warn' | 'dark'

const tones: Record<Tone, string> = {
    neutral: 'bg-[#EFE6D8] text-[#4A4136]',
    brand: 'bg-brand-soft text-brand-dark',
    warn: 'bg-warn-soft text-warn',
    dark: 'bg-ink text-cream',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-bold ${tones[tone]}`}>
        {children}
        </span>
    )
}