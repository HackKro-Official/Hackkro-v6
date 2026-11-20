import React from "react"

export function ResponsiveTable({
  caption,
  headers,
  children,
}: {
  caption: string
  headers: string[]
  children: React.ReactNode
}) {
  const id = React.useId()
  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={id}
      className="table-wrapper rounded-xl border border-border bg-card"
    >
      <table className="w-full text-sm border-collapse">
        <caption id={id} className="sr-only">
          {caption}
        </caption>
        <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur border-b border-border">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}
