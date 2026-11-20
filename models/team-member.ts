import mongoose, { Schema, Document } from "mongoose"

export interface ITeamMemberDoc extends Document {
  email: string
  name: string
  role: string // "Intern" | "Member" | "Coordinator" | "Lead" | "Head" | etc.
  position?: string
  isAdmin: boolean
  active: boolean
  profilePhoto?: string
  phone?: string
  bio?: string
  college?: string
  githubUrl?: string
  linkedinUrl?: string
  portfolioUrl?: string
  skills?: string[]
  // For Interns assigned to a specific Team Member (Team Lead / Mentor)
  mentorId?: mongoose.Types.ObjectId
  mentorName?: string
  mentorEmail?: string
  addedAt: Date
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}

const TeamMemberSchema = new Schema<ITeamMemberDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      default: "Member",
      trim: true,
    },
    position: {
      type: String,
      default: "",
      trim: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    bio: {
      type: String,
      default: "",
    },
    college: {
      type: String,
      default: "",
      trim: true,
    },
    githubUrl: {
      type: String,
      default: "",
      trim: true,
    },
    linkedinUrl: {
      type: String,
      default: "",
      trim: true,
    },
    portfolioUrl: {
      type: String,
      default: "",
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
    },
    mentorName: {
      type: String,
      default: "",
    },
    mentorEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export const TeamMember =
  mongoose.models.TeamMember || mongoose.model<ITeamMemberDoc>("TeamMember", TeamMemberSchema)
