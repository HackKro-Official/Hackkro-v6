import mongoose, { Schema, Document } from "mongoose"

export interface ISubmissionDoc extends Document {
  taskId: mongoose.Types.ObjectId
  internId: mongoose.Types.ObjectId
  internEmail: string
  internName: string
  submissionUrl: string
  notes?: string
  status: "pending" | "approved" | "rejected"
  pointsAwarded: number
  feedback?: string
  reviewedAt?: Date
  reviewedBy?: string
  createdAt: Date
  updatedAt: Date
}

const SubmissionSchema = new Schema<ISubmissionDoc>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    internId: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      required: true,
      index: true,
    },
    internEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    internName: {
      type: String,
      default: "",
      trim: true,
    },
    submissionUrl: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    pointsAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    feedback: {
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
  },
  {
    timestamps: true,
  }
)

// Compound index to quickly find an intern's submission for a specific task
SubmissionSchema.index({ taskId: 1, internId: 1 })

export const Submission =
  mongoose.models.Submission || mongoose.model<ISubmissionDoc>("Submission", SubmissionSchema)
