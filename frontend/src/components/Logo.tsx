import { Package } from 'lucide-react'

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const big = size === 'lg'
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex items-center justify-center rounded-2xl bg-brand text-white ${big ? 'size-13' : 'size-10'}`}
      >
        <Package size={big ? 28 : 22} aria-hidden="true" />
      </span>
      <span className={`font-display font-bold tracking-tight ${big ? 'text-3xl' : 'text-[22px]'}`}>
        Stockea
      </span>
    </div>
  )
}
