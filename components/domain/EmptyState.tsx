import Link from "next/link"
import { Button } from "@/components/ui/button"

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center bg-card/50">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
