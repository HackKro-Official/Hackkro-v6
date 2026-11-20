"use client"

import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function AuthModal({
  open = false,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to HackKro</DialogTitle>
          <DialogDescription>
            Access competitions, teams, assessments, mentorship, and employer workspaces from one unified account.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex gap-3">
          <Link
            href="/login"
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold dark:border-slate-700"
          >
            Create Account
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
