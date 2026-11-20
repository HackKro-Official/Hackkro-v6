import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: "https://www.hackkro.com/",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://www.hackkro.com/events",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: "https://www.hackkro.com/organizer",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: "https://www.hackkro.com/organizer/dashboard",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://www.hackkro.com/campus-ambassador",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://www.hackkro.com/campus-ambassador/apply",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: "https://www.hackkro.com/about",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: "https://www.hackkro.com/contact",
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.7,
    },
  ];
}
