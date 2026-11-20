import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IUserBadge {
  id: string
  name: string
  icon: string
  earnedAt: Date
  description?: string
}

export interface IUserCertificate {
  id: string
  eventTitle: string
  eventId: string
  issueDate: Date
  type: "participation" | "winner" | "runner_up" | "appreciation"
  certificateUrl?: string
  verificationId: string
}

export interface IUser extends Document {
  name: string
  email: string
  password: string
  mobile?: string
  avatar?: string
  college?: string
  degree?: string
  branch?: string
  graduationYear?: string
  bio?: string
  skills: string[]
  githubUrl?: string
  linkedinUrl?: string
  portfolioUrl?: string
  resumeUrl?: string
  role: "student" | "participant"
  points: number
  badges: IUserBadge[]
  certificates: IUserCertificate[]
  isEmailVerified: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

const UserBadgeSchema = new Schema<IUserBadge>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, default: "🏆" },
    earnedAt: { type: Date, default: Date.now },
    description: { type: String },
  },
  { _id: false }
)

const UserCertificateSchema = new Schema<IUserCertificate>(
  {
    id: { type: String, required: true },
    eventTitle: { type: String, required: true },
    eventId: { type: String, required: true },
    issueDate: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ["participation", "winner", "runner_up", "appreciation"],
      default: "participation",
    },
    certificateUrl: { type: String },
    verificationId: { type: String, required: true },
  },
  { _id: false }
)

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    mobile: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    college: {
      type: String,
      trim: true,
    },
    degree: {
      type: String,
      trim: true,
      default: "B.Tech",
    },
    branch: {
      type: String,
      trim: true,
    },
    graduationYear: {
      type: String,
      trim: true,
      default: "2026",
    },
    bio: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    githubUrl: {
      type: String,
      trim: true,
    },
    linkedinUrl: {
      type: String,
      trim: true,
    },
    portfolioUrl: {
      type: String,
      trim: true,
    },
    resumeUrl: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["student", "participant"],
      default: "student",
    },
    points: {
      type: Number,
      default: 100, // 100 welcome bonus points
    },
    badges: {
      type: [UserBadgeSchema],
      default: [
        {
          id: "welcome_explorer",
          name: "HackKro Pioneer",
          icon: "🚀",
          earnedAt: new Date(),
          description: "Joined HackKro Developer Community",
        },
      ],
    },
    certificates: {
      type: [UserCertificateSchema],
      default: [],
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
