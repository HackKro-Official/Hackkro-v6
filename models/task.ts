import mongoose, { Schema, Document } from "mongoose"

export interface ITaskDoc extends Document {
  title: string
  description: string
  assignedTo?: string // backwards compatibility: single email or "all"
  assignedInterns?: mongoose.Types.ObjectId[]
  assignedEmails?: string[]
  isAllInterns: boolean
  points: number
  deadline: Date
  dueDate: Date // alias for backwards compatibility
  priority: "low" | "medium" | "high"
  status: "pending" | "process" | "complete" | "rejected" | "active" | "completed"
  notes?: string
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const TaskSchema = new Schema<ITaskDoc>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    assignedTo: {
      type: String, // Backwards compatibility with existing data
      default: "all",
    },
    assignedInterns: [
      {
        type: Schema.Types.ObjectId,
        ref: "TeamMember",
      },
    ],
    assignedEmails: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    isAllInterns: {
      type: Boolean,
      default: false,
    },
    points: {
      type: Number,
      default: 100,
      min: 0,
    },
    deadline: {
      type: Date,
      default: function (this: any) {
        return this.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
    },
    dueDate: {
      type: Date,
      default: function (this: any) {
        return this.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "process", "complete", "rejected", "active", "completed"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
    createdBy: {
      type: String,
      default: "team@hackkro.com",
    },
  },
  {
    timestamps: true,
  }
)

// Pre-save hook to ensure deadline and dueDate stay in sync
TaskSchema.pre("save", function (next) {
  if (this.deadline && !this.dueDate) {
    this.dueDate = this.deadline
  } else if (this.dueDate && !this.deadline) {
    this.deadline = this.dueDate
  }
  next()
})

export const Task = mongoose.models.Task || mongoose.model<ITaskDoc>("Task", TaskSchema)
