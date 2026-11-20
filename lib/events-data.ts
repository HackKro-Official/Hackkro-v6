export type EventStatus = "live" | "coming-soon" | "past" | "closed" | "Closed"
export type EventMode = "Online" | "Offline" | "Hybrid"
export type EventCategory =
  | "Hackathon"
  | "Workshop & Masterclass"
  | "Pitching Challenge"
  | "Tech Conclave"
  | "Innovation Expo"
  | "Technical Quiz"
  | "Business Quiz"

export interface EventRound {
  roundNumber: number
  title: string
  testId?: string
  description?: string
  scheduledDate?: string
  startTime?: string
  endTime?: string
  durationMinutes?: number
  mode?: "online" | "offline" | "hybrid"
  status?: "scheduled" | "live" | "completed"
}

export interface EventWinner {
  rank: number
  title: string
  teamName: string
  leaderName?: string
  collegeOrOrg?: string
  projectName?: string
  prizeWon?: string
  avatarUrl?: string
  projectUrl?: string
}

export interface EventItem {
  id: string // slug id, e.g. "codefest-2026"
  numericId: number
  title: string
  category: EventCategory
  tagline: string
  description: string
  longDescription?: string
  date: string // YYYY-MM-DD (start date)
  endDate?: string // YYYY-MM-DD
  mode: EventMode
  venue?: string
  location?: string
  registrationOpens?: string
  registrationDeadline?: string
  statusOverride?: EventStatus
  featured?: boolean
  image: string
  relatedImages: string[]
  prizePool?: string
  teamSize?: {
    min: number
    max: number
  }
  registrationFee?: string // e.g., "Free"
  tracks?: string[]
  perks?: string[]
  eligibility?: string
  rules?: string[]
  winners?: string[]
  structuredWinners?: EventWinner[]
  resultsAnnounced?: boolean
  resultsAnnouncedAt?: string
  resultsUrl?: string
  rounds?: EventRound[]
  approvalStatus?: "approved" | "pending" | "rejected"
  organizerName?: string
  organizerEmail?: string
  registeredCount?: number
}

export const EVENTS_DATA: EventItem[] = [
  {
    id: "hackkro-buildathon-2026",
    numericId: 14,
    title: "HackKro National Buildathon 2026",
    category: "Hackathon",
    tagline: "India's premier 36-hour multi-track national hackathon for student builders.",
    description:
      "Build production-grade MVPs across Generative AI, FinTech, and Web3 with 1-on-1 VC mentorship, cloud credits, and direct grant opportunities.",
    longDescription:
      "HackKro National Buildathon 2026 brings together the brightest developer minds from 100+ partner universities. Teams collaborate for 36 hours straight to design, build, and deploy high-impact software solutions solving pressing industry challenges.",
    date: "2026-11-20",
    endDate: "2026-11-22",
    mode: "Online",
    venue: "HackKro Virtual Arena",
    location: "Pan-India / Virtual",
    registrationOpens: "2026-11-01",
    registrationDeadline: "2026-11-19",
    statusOverride: "live",
    featured: true,
    image: "https://res.cloudinary.com/payb7fsq/image/upload/v1792430791/WhatsApp_Image_2026-10-19_at_22.55.23.jpg",
    relatedImages: [
      "https://res.cloudinary.com/payb7fsq/image/upload/v1792430791/WhatsApp_Image_2026-10-19_at_22.55.24.jpg",
      "https://res.cloudinary.com/payb7fsq/image/upload/v1791982756/WhatsApp_Image_2026-10-14_at_6.28.03_P.jpg",
    ],
    prizePool: "₹50,000 Cash + ₹2L Cloud Credits",
    teamSize: { min: 1, max: 4 },
    registrationFee: "Free",
    tracks: [
      "Generative AI & LLMs",
      "FinTech & Open Banking",
      "Web3 & Decentralized Protocols",
      "HealthTech & Smart Healthcare",
    ],
    perks: [
      "Direct VC Pitching & Incubation Fast-track",
      "Guaranteed Hacker Swag Kit for Finalists",
      "AWS & OpenAI API Credits",
      "Verified Certificate of Excellence",
    ],
    eligibility: "Open to all engineering, computer science, and technology college students across India.",
    rules: [
      "All code must be written during the 36-hour building window.",
      "Open-source libraries and APIs are permitted; pre-built proprietary software is strictly prohibited.",
      "Teams must submit working GitHub repositories and short demo videos.",
    ],
    rounds: [
      {
        roundNumber: 1,
        title: "Round 1: Problem Statement & Architecture Proposal",
        description: "Submit your team proposal, problem definition, and high-level architectural diagram.",
        scheduledDate: "2026-11-20",
        startTime: "10:00 AM",
        endTime: "02:00 PM",
        durationMinutes: 240,
        mode: "online",
        status: "live",
      },
      {
        roundNumber: 2,
        title: "Round 2: 36-Hour Hack & Code Submission",
        description: "Intense prototyping window with mid-sprint code checkpoints and mentor reviews.",
        scheduledDate: "2026-11-21",
        startTime: "02:00 PM",
        endTime: "10:00 PM",
        durationMinutes: 480,
        mode: "online",
        status: "scheduled",
      },
      {
        roundNumber: 3,
        title: "Round 3: Grand Finale Virtual Demos & Jury Q&A",
        description: "Top 10 finalist teams present live product demos to an elite investor and industry jury.",
        scheduledDate: "2026-11-22",
        startTime: "11:00 AM",
        endTime: "03:00 PM",
        durationMinutes: 240,
        mode: "online",
        status: "scheduled",
      },
    ],
  },
  {
    id: "codewars-dsa-2026",
    numericId: 15,
    title: "CodeWars 2026: National Algorithmic Sprint",
    category: "Technical Quiz",
    tagline: "Test your speed, data structures, and algorithmic mastery under pressure.",
    description:
      "A fast-paced algorithmic coding championship designed to evaluate competitive programming fundamentals, time complexity optimization, and problem-solving speed.",
    longDescription:
      "CodeWars 2026 gathers individual developers for a 2-round timed challenge. Round 1 features rapid-fire MCQs covering trees, graphs, and dynamic programming, followed by timed coding problems.",
    date: "2026-11-15",
    endDate: "2026-11-15",
    mode: "Online",
    venue: "HackKro Assessment Arena",
    location: "Online / Pan-India",
    registrationOpens: "2026-11-01",
    registrationDeadline: "2026-11-14",
    statusOverride: "live",
    featured: true,
    image: "https://res.cloudinary.com/payb7fsq/image/upload/v1793190149/1_1.png",
    relatedImages: [
      "https://res.cloudinary.com/dp2olwtzp/image/upload/v1772864450/techfest_5_page-0001_vl4ykn.jpg",
    ],
    prizePool: "₹25,000 Cash + Tech Hiring Fast-Track",
    teamSize: { min: 1, max: 1 },
    registrationFee: "Free",
    tracks: [
      "Data Structures & Algorithms",
      "Dynamic Programming",
      "Graph Theory & System Complexity",
    ],
    perks: [
      "Direct Interview Shortlisting with Sponsor Startups",
      "National Rank & Verified Competency Certificate",
      "HackKro Top Hacker Badge for Profile",
    ],
    eligibility: "Open to all BCA, B.Tech, MCA, and tech students across India.",
    rules: [
      "Strict proctoring: fullscreen enforcement and tab-switch monitoring enabled.",
      "Any external assistance or copy-pasting results in immediate disqualification.",
    ],
    rounds: [
      {
        roundNumber: 1,
        title: "Round 1: DSA Concepts & Speed MCQs",
        testId: "TEST-CW-01",
        description: "30-minute speed quiz testing core memory structures, Big-O analysis, and tree/graph traversals.",
        scheduledDate: "2026-11-15",
        startTime: "02:00 PM",
        endTime: "02:45 PM",
        durationMinutes: 30,
        mode: "online",
        status: "scheduled",
      },
    ],
  },
  {
    id: "ai-agents-hack-2026",
    numericId: 16,
    title: "AI Agents & Autonomous Systems Sprint",
    category: "Hackathon",
    tagline: "Build autonomous multi-agent workflows and next-gen AI tools.",
    description:
      "Push the envelope of autonomous intelligence. Create multi-agent systems, local LLM tooling, and self-improving code generation agents.",
    longDescription:
      "Autonomous systems are reshaping how software is built and executed. In this sprint, participants leverage modern reasoning models and agent orchestration frameworks to automate complex workflows.",
    date: "2026-11-28",
    endDate: "2026-11-30",
    mode: "Hybrid",
    venue: "HackKro Tech Hub & Online",
    location: "Delhi NCR & Virtual",
    registrationOpens: "2026-11-05",
    registrationDeadline: "2026-11-26",
    statusOverride: "coming-soon",
    featured: true,
    image: "https://res.cloudinary.com/payb7fsq/image/upload/v1793190184/2_1.png",
    relatedImages: [
      "https://res.cloudinary.com/dp2olwtzp/image/upload/v1772864449/techfest_4_page-0001_bktdjp.jpg",
    ],
    prizePool: "₹40,000 + Compute & API Grants",
    teamSize: { min: 1, max: 3 },
    registrationFee: "Free",
    tracks: [
      "Multi-Agent Orchestration",
      "Enterprise Workflow Automation",
      "Developer Productivity Agents",
    ],
    perks: [
      "Free Cloud GPU & LLM Credits",
      "1-on-1 Mentorship from Senior AI Researchers",
      "Physical Swags & Certificates",
    ],
    eligibility: "Open to developers, AI researchers, and students with hands-on Python/TypeScript skills.",
    rules: [
      "Teams must open-source their project under MIT or Apache 2.0 license.",
    ],
    rounds: [
      {
        roundNumber: 1,
        title: "Round 1: Agent Architecture Blueprint",
        description: "Submit agent tool definitions, routing architecture, and evaluation benchmarks.",
        scheduledDate: "2026-11-28",
        startTime: "10:00 AM",
        endTime: "04:00 PM",
        durationMinutes: 360,
        mode: "online",
        status: "scheduled",
      },
    ],
  },
  {
    id: "ideatex-startup-conclave-2026",
    numericId: 17,
    title: "IdeateX: Inter-College Startup Pitch Challenge",
    category: "Pitching Challenge",
    tagline: "Turn your campus project into an investor-backed startup venture.",
    description:
      "Pitch your tech venture to angel investors, startup incubators, and industry leaders to secure early seed grants and incubation support.",
    longDescription:
      "IdeateX is HackKro's flagship startup pitching conclave. Student founders pitch viable business models, unit economics, and traction metrics to an esteemed panel of VC partners and serial entrepreneurs.",
    date: "2026-12-05",
    endDate: "2026-12-05",
    mode: "Hybrid",
    venue: "Innovation Auditorium & Online Stream",
    location: "Delhi NCR / Pan-India",
    registrationOpens: "2026-11-08",
    registrationDeadline: "2026-12-01",
    statusOverride: "coming-soon",
    featured: true,
    image: "https://res.cloudinary.com/payb7fsq/image/upload/v1792430791/WhatsApp_Image_2026-10-19_at_22.55.24.jpg",
    relatedImages: [
      "https://res.cloudinary.com/payb7fsq/image/upload/v1791982756/WhatsApp_Image_2026-10-14_at_6.28.03_P.jpg",
    ],
    prizePool: "₹1,00,000 Seed Grant Pool + Incubation",
    teamSize: { min: 1, max: 4 },
    registrationFee: "Free",
    tracks: [
      "B2B SaaS & Enterprise",
      "DeepTech & IoT Systems",
      "Consumer Tech & EdTech",
    ],
    perks: [
      "6-Month Incubation Support & Free Workspace Credits",
      "Direct Angel Investor Pitch Meetings",
      "Legal & Company Incorporation Guidance",
    ],
    eligibility: "Open to student-led teams with working prototypes or minimum viable products.",
    rules: [
      "Teams must present original business ideas with demonstrated market research.",
    ],
    rounds: [
      {
        roundNumber: 1,
        title: "Round 1: Pitch Deck & Executive Summary",
        description: "Upload your 10-slide deck covering problem, solution, market size, and traction.",
        scheduledDate: "2026-12-05",
        startTime: "10:00 AM",
        endTime: "02:00 PM",
        durationMinutes: 240,
        mode: "online",
        status: "scheduled",
      },
    ],
  },
  {
    id: "businesssprint-2026",
    numericId: 12,
    title: "BUSINESSSPRINT 2026",
    category: "Business Quiz",
    tagline: "India's premier business quiz for students.",
    description:
      "A high-octane business quiz bringing together students, business enthusiasts, and innovators.",
    longDescription:
      "BUSINESSSPRINT 2026 invites innovative students to compete, solve real-world startup case studies, and demonstrate business acumen.",
    date: "2026-11-05",
    endDate: "2026-11-05",
    mode: "Online",
    venue: "HackKro Virtual Arena",
    location: "Pan-India",
    registrationOpens: "2026-10-28",
    registrationDeadline: "2026-11-05",
    statusOverride: "live",
    featured: true,
    image: "https://res.cloudinary.com/payb7fsq/image/upload/v1793190184/2_1.png",
    relatedImages: [
      "https://res.cloudinary.com/dp2olwtzp/image/upload/v1772864450/techfest_5_page-0001_vl4ykn.jpg",
      "https://res.cloudinary.com/dp2olwtzp/image/upload/v1772864449/techfest_4_page-0001_bktdjp.jpg",
    ],
    prizePool: "Cash Grants & Recognition Awards",
    teamSize: { min: 1, max: 1 },
    registrationFee: "Free",
    tracks: [
      "Business Quiz",
    ],
    perks: [
      "Verified Certificate of Participation for all attendees",
      "Exclusive HackKro Swag Kit & Goodies",
    ],
    eligibility: "Open to all undergraduate students interested in business, management, and startups.",
    rules: [
      "Plagiarism or cheating leads to immediate disqualification.",
    ],
    rounds: [
      {
        roundNumber: 1,
        title: "Round 1: Business Aptitude & Startup Strategy",
        testId: "TEST-BS-01",
        description: "Official preliminary round testing market analysis, brand trivia, and business case studies.",
        scheduledDate: "2026-11-05",
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        durationMinutes: 30,
        mode: "online",
        status: "live",
      },
    ],
  },
  {
    id: "codefest-2026",
    numericId: 11,
    title: "CODESPRINT 2026",
    category: "Technical Quiz",
    tagline: "India's premier an-hour technical quiz for student builders and developers.",
    description:
      "A high-octane an-hour technical quiz bringing together coders, designers, and innovators.",
    longDescription:
      "CODESPRINT 2026 invites student coders and developers across India to test their skills and compete in fast-paced algorithmic problem-solving.",
    date: "2026-10-30",
    endDate: "2026-10-30",
    mode: "Hybrid",
    venue: "HackKro Arena & Partner Campuses",
    location: "National / Online",
    registrationOpens: "2026-10-26",
    registrationDeadline: "2026-10-30",
    statusOverride: "Closed",
    featured: false,
    image: "https://res.cloudinary.com/payb7fsq/image/upload/v1793190149/1_1.png",
    relatedImages: [
      "https://res.cloudinary.com/dp2olwtzp/image/upload/v1772864450/techfest_5_page-0001_vl4ykn.jpg",
      "https://res.cloudinary.com/dp2olwtzp/image/upload/v1772864449/techfest_4_page-0001_bktdjp.jpg",
    ],
    prizePool: "Recognition Awards & Goodies",
    teamSize: { min: 1, max: 1 },
    registrationFee: "Free",
    tracks: [
      "C Programming Quiz",
    ],
    perks: [
      "Verified Certificate of Participation for all attendees",
      "Exclusive HackKro Hacker Swag Kit & Goodies",
    ],
    eligibility: "Open to all engineering, BCA, and science undergraduate students across India.",
    rules: [
      "Plagiarism or cheating leads to immediate disqualification.",
    ],
    rounds: [
      {
        roundNumber: 1,
        title: "Round 1: C Programming & Technical MCQs",
        testId: "TEST-CS-01",
        description: "30-minute speed quiz covering fundamentals of C language, pointers, and algorithms.",
        scheduledDate: "2026-10-30",
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        durationMinutes: 30,
        mode: "online",
        status: "completed",
      },
    ],
  },
  {
    id: "byterush-2026",
    numericId: 10,
    title: "ByteRush 2k26 National Hackathon",
    category: "Hackathon",
    tagline: "India's premier 24-hour national hackathon & prototype sprint.",
    description: "ByteRush brought together top student developers and coding enthusiasts for an intense building competition.",
    longDescription: "A national-level 24-hour hackathon where student builders, designers, and problem solvers shipped production MVPs and competed for exciting grants.",
    date: "2026-10-09",
    endDate: "2026-10-09",
    mode: "Hybrid",
    venue: "HackKro Arena & Partner Campuses",
    location: "Pan-India",
    registrationOpens: "2026-09-20",
    registrationDeadline: "2026-10-08",
    statusOverride: "past",
    featured: false,
    image: "https://res.cloudinary.com/payb7fsq/image/upload/v1792430791/WhatsApp_Image_2026-10-19_at_22.55.23.jpg",
    relatedImages: [
      "https://res.cloudinary.com/payb7fsq/image/upload/v1792430791/WhatsApp_Image_2026-10-19_at_22.55.24.jpg",
      "https://res.cloudinary.com/payb7fsq/image/upload/v1791982756/WhatsApp_Image_2026-10-14_at_6.28.03_P.jpg",
    ],
    prizePool: "₹25,000 + Goodies",
    teamSize: { min: 1, max: 4 },
    registrationFee: "Free",
    tracks: ["Web3 & AI", "Open Innovation", "FinTech"],
    perks: ["Verified E-Certificates", "Swag Kits", "Incubation Fast-track"],
    eligibility: "Open to all college students.",
    rules: ["Plagiarism leads to disqualification."],
    resultsAnnounced: true,
    resultsAnnouncedAt: "2026-10-10",
    structuredWinners: [
      {
        rank: 1,
        title: "Grand Champion / 1st Place",
        teamName: "Team CyberKnights",
        leaderName: "Aarav Sharma",
        collegeOrOrg: "IIT Roorkee",
        projectName: "DeFiShield: AI Smart Contract Auditing Suite",
        prizeWon: "₹15,000 Cash + Cloud Credits + Trophy",
        projectUrl: "https://github.com/hackkro-community/defishield-showcase",
      },
      {
        rank: 2,
        title: "1st Runner Up",
        teamName: "Team DevNova",
        leaderName: "Priya Patel",
        collegeOrOrg: "BITS Pilani",
        projectName: "MediVault: Zero-Knowledge Health Record Portal",
        prizeWon: "₹7,000 Cash + Swag Kits",
        projectUrl: "https://github.com/hackkro-community/medivault",
      },
      {
        rank: 3,
        title: "2nd Runner Up",
        teamName: "Team AlgoRiders",
        leaderName: "Rohan Verma",
        collegeOrOrg: "DTU Delhi",
        projectName: "SupplyFlow: Transparent Agri-Logistics Tracker",
        prizeWon: "₹3,000 Cash + Goodies",
      },
    ],
    rounds: [
      {
        roundNumber: 1,
        title: "Final Prototype Demo & Code Submission",
        scheduledDate: "2026-10-09",
        startTime: "10:00 AM",
        endTime: "05:00 PM",
        durationMinutes: 420,
        mode: "online",
        status: "completed",
      },
    ],
  },
]

export function getEventById(id: string): EventItem | undefined {
  return EVENTS_DATA.find(
    (e) =>
      e.id === id ||
      String(e.numericId) === id ||
      (id === "codesprint-2026" && e.id === "codefest-2026")
  )
}

export function getLiveAndUpcomingEvents(): EventItem[] {
  return EVENTS_DATA.filter((e) => e.statusOverride === "live" || e.statusOverride === "coming-soon")
}
