import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IEventRound {
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

export interface IEmailBroadcast {
  subject: string
  message: string
  sentAt: Date
  recipientCount: number
  sentBy?: string
}

export interface IEventWinner {
  rank: number // 1 for Winner/Champion, 2 for 1st Runner Up, 3 for 2nd Runner Up, 0 for Special Mention
  title: string // e.g. "Champion / 1st Place", "Runner Up"
  teamName: string
  leaderName?: string
  collegeOrOrg?: string
  projectName?: string
  prizeWon?: string
  avatarUrl?: string
  projectUrl?: string
}

export interface IEventItemDoc extends Document {
  id: string // Unique slug id, e.g. "codefest-2026"
  numericId: number
  title: string
  category: string
  tagline: string
  description: string
  longDescription?: string
  date: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  mode: "Online" | "Offline" | "Hybrid"
  venue?: string
  location?: string
  registrationOpens?: string
  registrationDeadline?: string
  statusOverride?: "live" | "coming-soon" | "past" | "closed"
  featured?: boolean
  image: string
  relatedImages: string[]
  prizePool?: string
  teamSize?: {
    min: number
    max: number
  }
  registrationFee?: string
  tracks?: string[]
  perks?: string[]
  eligibility?: string
  rules?: string[]
  winners?: string[]
  structuredWinners?: IEventWinner[]
  resultsAnnounced?: boolean
  resultsAnnouncedAt?: Date
  resultsUrl?: string
  rounds: IEventRound[]
  approvalStatus: "approved" | "pending" | "rejected"
  organizerId?: string
  organizerName?: string
  organizerEmail?: string
  organizerOrganization?: string
  emailBroadcastsSent: number
  emailBroadcasts: IEmailBroadcast[]
  createdAt: Date
  updatedAt: Date
}

const EventRoundSchema = new Schema<IEventRound>(
  {
    roundNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    testId: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    scheduledDate: { type: String, trim: true, default: "" },
    startTime: { type: String, trim: true, default: "" },
    endTime: { type: String, trim: true, default: "" },
    durationMinutes: { type: Number, default: 30 },
    mode: { type: String, enum: ["online", "offline", "hybrid"], default: "online" },
    status: { type: String, enum: ["scheduled", "live", "completed"], default: "scheduled" },
  },
  { _id: false }
)

const EmailBroadcastSchema = new Schema<IEmailBroadcast>(
  {
    subject: { type: String, required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    recipientCount: { type: Number, default: 0 },
    sentBy: { type: String, default: "" },
  },
  { _id: false }
)

const EventWinnerSchema = new Schema<IEventWinner>(
  {
    rank: { type: Number, default: 1 },
    title: { type: String, default: "Winner" },
    teamName: { type: String, required: true, trim: true },
    leaderName: { type: String, default: "", trim: true },
    collegeOrOrg: { type: String, default: "", trim: true },
    projectName: { type: String, default: "", trim: true },
    prizeWon: { type: String, default: "", trim: true },
    avatarUrl: { type: String, default: "", trim: true },
    projectUrl: { type: String, default: "", trim: true },
  },
  { _id: false }
)

const EventSchema = new Schema<IEventItemDoc>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    numericId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: "Hackathon",
    },
    tagline: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    longDescription: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    endDate: {
      type: String,
      trim: true,
      default: "",
    },
    mode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid"],
      default: "Online",
    },
    venue: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    registrationOpens: {
      type: String,
      default: "",
      trim: true,
    },
    registrationDeadline: {
      type: String,
      default: "",
      trim: true,
    },
    statusOverride: {
      type: String,
      enum: ["live", "coming-soon", "past", "closed"],
      default: "live",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: "https://res.cloudinary.com/payb7fsq/image/upload/v1793190149/1_1.png",
    },
    relatedImages: {
      type: [String],
      default: [],
    },
    prizePool: {
      type: String,
      default: "Certificates & Swags",
      trim: true,
    },
    teamSize: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 4 },
    },
    registrationFee: {
      type: String,
      default: "Free",
      trim: true,
    },
    tracks: {
      type: [String],
      default: [],
    },
    perks: {
      type: [String],
      default: [],
    },
    eligibility: {
      type: String,
      default: "Open for all students and developers",
      trim: true,
    },
    rules: {
      type: [String],
      default: [],
    },
    winners: {
      type: [String],
      default: [],
    },
    structuredWinners: {
      type: [EventWinnerSchema],
      default: [],
    },
    resultsAnnounced: {
      type: Boolean,
      default: false,
      index: true,
    },
    resultsAnnouncedAt: {
      type: Date,
    },
    resultsUrl: {
      type: String,
      default: "",
      trim: true,
    },
    rounds: {
      type: [EventRoundSchema],
      default: [],
    },
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
      index: true,
    },
    organizerId: {
      type: String,
      default: "admin",
      index: true,
    },
    organizerName: {
      type: String,
      default: "",
    },
    organizerEmail: {
      type: String,
      default: "",
    },
    organizerOrganization: {
      type: String,
      default: "",
    },
    emailBroadcastsSent: {
      type: Number,
      default: 0,
    },
    emailBroadcasts: {
      type: [EmailBroadcastSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

export const EventModel: Model<IEventItemDoc> =
  mongoose.models.EventModel || mongoose.model<IEventItemDoc>("EventModel", EventSchema)
