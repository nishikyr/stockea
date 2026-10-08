import { useId, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
    label: string
    error?: string
}

export function Input({ label, error, id, className = '', ...props }: Props) {
    const autoId = useId()
    const inputId = id ?? autoId

    return (
        <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-[15px] font-semibold">{label}</label>
        <input
            id={inputId}
            aria-invalid={error ? true : undefined}
            className={`h-14 rounded-2xl border-[1.5px] bg-cream px-4 text-[17px] outline-none
            focus:border-brand ${error ? 'border-out' : 'border-line'} ${className}`}
            {...props}
        />
        {error && <p className="text-sm font-medium text-out">{error}</p>}
        </div>
    )
}