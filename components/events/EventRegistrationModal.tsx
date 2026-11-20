"use client"

import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function EventRegistrationModal({
  isOpen,
  onClose,
  eventSlug,
  eventTitle,
}: {
  isOpen: boolean
  onClose: () => void
  eventSlug?: string
  eventTitle?: string
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register for {eventTitle || "Opportunity"}</DialogTitle>
          <DialogDescription>
            HackKro runs unified eligibility checks, dynamic registration forms, and idempotent checkout directly on the opportunity page.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-slate-700"
          >
            Close
          </button>
          <Link
            href={eventSlug ? `/opportunities/${eventSlug}` : "/discover"}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Continue to Registration →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
