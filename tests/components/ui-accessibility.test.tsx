// @vitest-environment jsdom
import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { OpportunityCard } from "@/components/domain/OpportunityCard"
import { ResponsiveTable } from "@/components/domain/ResponsiveTable"
import LoginPage from "@/app/login/page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/user-auth-context", () => ({
  useUserAuth: () => ({
    user: null,
    isLoading: false,
    isLoggedIn: false,
    providers: { google: false },
    refreshUser: vi.fn(),
  }),
}))

vi.mock("@/lib/i18n-context", () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: "en",
  }),
}))

describe("Frontend Component Contracts & Accessibility Compliance", () => {
  it("renders accessible semantic table with caption and column scope", () => {
    render(
      <ResponsiveTable caption="Registered Applicants" headers={["Name", "Status"]}>
        <tr>
          <td>Aarav Sharma</td>
          <td>Submitted</td>
        </tr>
      </ResponsiveTable>
    )

    expect(screen.getByRole("table", { name: "Registered Applicants" })).toBeInTheDocument()
    const colHeaders = screen.getAllByRole("columnheader")
    expect(colHeaders).toHaveLength(2)
    expect(colHeaders[0]).toHaveAttribute("scope", "col")
  })

  it("renders OpportunityCard with explicit salary transparency and verification badge", () => {
    render(
      <OpportunityCard
        item={{
          id: "opp-1",
          slug: "cloud-intern",
          title: "Cloud Platform Intern",
          shortSummary: "Distributed backend internship",
          type: "job",
          category: "Engineering",
          locationMode: "hybrid",
          locationText: "Bengaluru",
          salaryShared: false,
          organization: { displayName: "NovaTech Cloud", verificationStatus: "verified" },
        }}
      />
    )

    expect(screen.getByText("Cloud Platform Intern")).toBeInTheDocument()
    expect(screen.getByText("Salary not shared")).toBeInTheDocument()
    expect(screen.getByText("NovaTech Cloud")).toBeInTheDocument()
  })

  it("renders LoginPage with autofill username identifier field inside landmark", () => {
    render(<LoginPage />)
    const input = screen.getByLabelText(/auth\.identifierLabel/i)
    expect(input).toHaveAttribute("autocomplete", "username")
  })
})
