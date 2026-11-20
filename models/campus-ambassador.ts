import mongoose, { Schema, type Document, type Model } from "mongoose"

export type AmbassadorApplicationStatus = "Pending" | "Under Review" | "Approved" | "Rejected"

export interface ICampusAmbassador extends Document {
  applicationId: string // e.g. "HK-CA-2026-1049"
  name: string
  email: string
  mobile: string
  password: string
  collegeName: string
  universityName: string
  collegeCity: string
  state: string
  courseBranch: string
  currentYearSemester: string
  collegeStudentId?: string
  profilePhoto?: string
  linkedinUrl?: string
  instagramUrl?: string
  whyJoin: string
  status: AmbassadorApplicationStatus
  adminNotes?: string
  ambassadorId?: string // e.g. "AMB-HK-1049"
  referralCode?: string // e.g. "HK-ALOK2026"
  approvedAt?: Date
  reviewedAt?: Date
  reviewedBy?: string
  lastLogin?: Date
  resetOtp?: string
  resetOtpExpiry?: number
  // Future extensions for custom positions, teams, performance
  customPosition?: string
  team?: string
  points: number
  rank?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const CampusAmbassadorSchema = new Schema<ICampusAmbassador>(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    collegeName: {
      type: String,
      required: true,
      trim: true,
    },
    universityName: {
      type: String,
      required: true,
      trim: true,
    },
    collegeCity: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    courseBranch: {
      type: String,
      required: true,
      trim: true,
    },
    currentYearSemester: {
      type: String,
      required: true,
      trim: true,
    },
    collegeStudentId: {
      type: String,
      default: "",
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: "",
      trim: true,
    },
    linkedinUrl: {
      type: String,
      default: "",
      trim: true,
    },
    instagramUrl: {
      type: String,
      default: "",
      trim: true,
    },
    whyJoin: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
    },
    ambassadorId: {
      type: String,
      default: "",
      trim: true,
    },
    referralCode: {
      type: String,
      default: "",
      trim: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      default: "",
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    resetOtp: {
      type: String,
      default: "",
    },
    resetOtpExpiry: {
      type: Number,
      default: 0,
    },
    customPosition: {
      type: String,
      default: "Campus Ambassador",
      trim: true,
    },
    team: {
      type: String,
      default: "General Outreach",
      trim: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

export const CampusAmbassador: Model<ICampusAmbassador> =
  mongoose.models.CampusAmbassador ||
  mongoose.model<ICampusAmbassador>("CampusAmbassador", CampusAmbassadorSchema)
