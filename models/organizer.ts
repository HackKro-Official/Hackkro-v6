import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IOrganizer extends Document {
  name: string
  email: string
  password: string
  organization: string
  designation?: string
  phone?: string
  website?: string
  collegeOrCompany?: string
  description?: string
  status: "active" | "approved" | "pending" | "rejected" | "suspended"
  active: boolean
  adminNotes?: string
  reviewedAt?: Date
  reviewedBy?: string
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

const OrganizerSchema = new Schema<IOrganizer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    organization: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      default: "Event Organizer",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    collegeOrCompany: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "approved", "pending", "rejected", "suspended"],
      default: "pending",
    },
    active: {
      type: Boolean,
      default: false,
    },
    adminNotes: {
      type: String,
      default: "",
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
  },
  {
    timestamps: true,
  }
)

export const Organizer: Model<IOrganizer> =
  mongoose.models.Organizer || mongoose.model<IOrganizer>("Organizer", OrganizerSchema)
