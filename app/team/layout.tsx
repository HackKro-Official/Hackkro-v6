import type React from "react";
import { TeamAuthProvider } from "./auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campus Ambassador Program | HackKro",
  description:
    "Join the HackKro Campus Ambassador Program 2026. Lead student developer communities, organize hackathons, and fast-track your tech career.",
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TeamAuthProvider>
        <div className="team-layout-wrapper">
          {children}
        </div>
      </TeamAuthProvider>
    </ThemeProvider>
  );
}