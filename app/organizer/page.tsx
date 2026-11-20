import type { Metadata } from "next"
import { HostContent } from "../blog/HostContent"

export const metadata: Metadata = {
  title: "Host Hackathons, Hiring Sprints & Coding Contests | HackKro Organizer Hub",
  description:
    "Empower your college, club, or enterprise with HackKro's complete event hosting infrastructure. Direct event listing, live participant tracking with unique pass IDs, 3 free official broadcast emails, and automated proctored tests.",
  generator: "HackKro",
  icons: {
    icon: "https://res.cloudinary.com/payb7fsq/image/upload/v1791981789/Hack_Kro_Logo.png",
  },
  openGraph: {
    title: "Host Hackathons & Tech Contests on HackKro Organizer Hub",
    description:
      "Empower your college, club, or enterprise with HackKro's complete event hosting infrastructure.",
    url: "https://hackkro.com/organizer",
    siteName: "HackKro",
    images: [
      {
        url: "https://res.cloudinary.com/payb7fsq/image/upload/v1792430791/WhatsApp_Image_2026-10-19_at_22.55.24.jpg",
        width: 1200,
        height: 630,
        alt: "HackKro Organizer Hub Banner",
      },
    ],
    type: "website",
  },
}

export default function OrganizerLandingPage() {
  return <HostContent />
}
