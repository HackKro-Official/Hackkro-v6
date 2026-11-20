import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Campus Ambassador Program | HackKro",
  description:
    "Lead the developer movement at your university. Join the HackKro Campus Ambassador Program 2026 to organize hackathons, gain leadership experience, and earn exclusive rewards.",
}

export default function CampusAmbassadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
