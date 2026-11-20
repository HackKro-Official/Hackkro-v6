import nodemailer from "nodemailer"
import { getAppBaseUrl } from "./url-helper"

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

const FROM_HEADER = `"HackKro Team Portal" <${process.env.EMAIL_USER || "team@hackkro.com"}>`

/**
 * Send dedicated Welcome & Onboarding Email to newly added Interns
 */
export async function sendInternWelcomeEmail(
  email: string,
  name: string,
  position?: string,
  request?: Request
): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn("Nodemailer SMTP not configured. Skipping intern welcome email.")
    return
  }

  const baseUrl = getAppBaseUrl(request)
  const loginUrl = `${baseUrl}/team/login?email=${encodeURIComponent(email)}`
  const dashboardUrl = `${baseUrl}/team/dashboard`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #e2e8f0; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border-radius: 14px; overflow: hidden; border: 1px solid #1f2937; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%); padding: 36px 24px; text-align: center; color: white; }
        .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 0; opacity: 0.95; font-size: 14px; font-weight: 500; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); color: #ffffff; padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }
        .body { padding: 30px 24px; }
        .welcome-lead { font-size: 15px; color: #f3f4f6; margin-bottom: 20px; line-height: 1.5; }
        .highlight-box { background: #1f2937; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #374151; }
        .highlight-title { font-size: 14px; font-weight: 700; color: #60a5fa; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .perk-item { display: flex; align-items: flex-start; margin-bottom: 12px; font-size: 13px; color: #d1d5db; line-height: 1.4; }
        .perk-icon { margin-right: 10px; font-size: 16px; }
        .creds-box { background: #0f172a; border-radius: 10px; padding: 18px; margin: 20px 0; border: 1px dashed #3b82f6; text-align: center; }
        .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); }
        .footer { background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to HackKro Internship Program! 🚀</h1>
          <p>India's Premier Hackathon & Student Developer Ecosystem</p>
          <div class="badge">Official Intern Appointment</div>
        </div>

        <div class="body">
          <p class="welcome-lead">
            Dear <strong>${name}</strong>,<br><br>
            Congratulations! You have been officially appointed as an <strong>Intern${position ? ` (${position})` : ""}</strong> with HackKro. We are thrilled to welcome you to our innovation & engineering team.
          </p>

          <div class="highlight-box">
            <div class="highlight-title">🎯 Your Internship & Evaluation Journey</div>
            
            <div class="perk-item">
              <span class="perk-icon">📋</span>
              <div><strong>Task Assignments & Milestones:</strong> You will be assigned real engineering and product tasks with deliverables and deadlines directly on your portal.</div>
            </div>

            <div class="perk-item">
              <span class="perk-icon">🏆</span>
              <div><strong>Points & Performance Scoring:</strong> Every submission is evaluated up to 100 points based on architecture, code quality, and execution.</div>
            </div>

            <div class="perk-item">
              <span class="perk-icon">💬</span>
              <div><strong>Mentor Code Reviews:</strong> HackKro leads review your GitHub repositories and live deployments, sharing constructive feedback.</div>
            </div>

            <div class="perk-item" style="margin-bottom: 0;">
              <span class="perk-icon">📜</span>
              <div><strong>Verified Credentials & LOR:</strong> High-performing interns unlock verified internship certificates and letters of recommendation upon completion.</div>
            </div>
          </div>

          <div class="creds-box">
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Your Registered Intern Email</p>
            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #60a5fa; font-family: monospace;">${email}</p>
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Log in anytime password-free using a one-time OTP sent directly to this inbox.</p>
          </div>

          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Access Intern Dashboard & Tasks →</a>
            <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Direct link: <a href="${dashboardUrl}" style="color: #3b82f6;">${dashboardUrl}</a></p>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} HackKro. Platform Management & Technology Operations.</p>
          <p style="margin: 0;">If you have any questions or onboarding queries, reach out to team@hackkro.com</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: FROM_HEADER,
      to: email,
      subject: `Welcome to HackKro Internship Program! 🎉 [Access Portal Inside]`,
      html,
    })
    console.log(`[Email] Dedicated intern welcome notification sent to ${email}`)
  } catch (err) {
    console.warn(`[Email] Failed to send intern welcome email to ${email}:`, err)
  }
}

/**
 * Send standard invitation email for other team members (Non-interns)
 */
export async function sendTeamWelcomeEmail(
  email: string,
  name: string,
  role: string,
  position?: string,
  request?: Request
): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn("Nodemailer SMTP not configured. Skipping team welcome email.")
    return
  }

  const baseUrl = getAppBaseUrl(request)
  const loginUrl = `${baseUrl}/team/login?email=${encodeURIComponent(email)}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #e2e8f0; }
        .container { max-width: 580px; margin: 0 auto; background: #111827; border-radius: 12px; overflow: hidden; border: 1px solid #1f2937; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 24px; text-align: center; color: white; }
        .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
        .body { padding: 24px; }
        .card { background: #1f2937; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #374151; }
        .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        .footer { background: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to HackKro Team! 🤝</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">Platform Management & Operations</p>
        </div>
        <div class="body">
          <p>Dear <strong>${name}</strong>,</p>
          <p>You have been added to the HackKro team with the role of <strong>${role}</strong>${
            position ? ` (${position})` : ""
          }.</p>

          <div class="card">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;">Registered Email:</p>
            <p style="margin: 0; font-weight: 700; color: #60a5fa;">${email}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">Access is verified securely using an OTP sent to your email.</p>
          </div>

          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Access Team Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} HackKro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: FROM_HEADER,
      to: email,
      subject: `You've been invited to join the HackKro Team`,
      html,
    })
    console.log(`[Email] Team welcome notification sent to ${email}`)
  } catch (err) {
    console.warn(`[Email] Failed to send team welcome email to ${email}:`, err)
  }
}

/**
 * Send email when a new task is assigned to an intern / team member
 */
export async function sendTaskAssignedEmail(
  internEmails: string[],
  task: {
    title: string
    description: string
    deadline: Date | string
    points: number
  },
  request?: Request
): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn("Nodemailer SMTP not configured (EMAIL_USER or EMAIL_PASS missing). Skipping task assigned email.")
    return
  }

  const validEmails = internEmails.filter((e) => e && e.includes("@"))
  if (validEmails.length === 0) return

  const baseUrl = getAppBaseUrl(request)
  const dashboardUrl = `${baseUrl}/team/dashboard`

  const formattedDeadline = new Date(task.deadline).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #e2e8f0; }
        .container { max-width: 580px; margin: 0 auto; background: #111827; border-radius: 12px; overflow: hidden; border: 1px solid #1f2937; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 24px; text-align: center; color: white; }
        .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
        .body { padding: 24px; }
        .card { background: #1f2937; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #374151; }
        .badge { display: inline-block; background: #3b82f6; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #374151; font-size: 14px; }
        .label { color: #9ca3af; }
        .value { font-weight: 600; color: #f3f4f6; }
        .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        .footer { background: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Task Assigned 📋</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">HackKro Intern & Team Portal</p>
        </div>
        <div class="body">
          <p>Hello,</p>
          <p>You have been assigned a new task on the HackKro platform. Please review the details below and submit your work before the deadline.</p>

          <div class="card">
            <h3 style="margin: 0 0 10px 0; color: #60a5fa; font-size: 18px;">${task.title}</h3>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #d1d5db; line-height: 1.5;">${task.description}</p>
            
            <div class="info-row">
              <span class="label">Maximum Points:</span>
              <span class="value" style="color: #fbbf24;">🏆 ${task.points} Pts</span>
            </div>
            <div class="info-row" style="border-bottom: none;">
              <span class="label">Submission Deadline:</span>
              <span class="value">📅 ${formattedDeadline}</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${dashboardUrl}" class="button">Open Team Dashboard & Submit</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} HackKro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  for (const email of validEmails) {
    try {
      await transporter.sendMail({
        from: FROM_HEADER,
        to: email,
        subject: `New Task Assigned: ${task.title} [${task.points} Pts]`,
        html,
      })
      console.log(`[Email] Task assignment notification sent to ${email}`)
    } catch (err) {
      console.warn(`[Email] Failed to send task assignment email to ${email}:`, err)
    }
  }
}

/**
 * Send email to Admin when an intern submits a task solution
 */
export async function sendTaskSubmittedEmail(
  adminEmail: string,
  submission: {
    internName: string
    internEmail: string
    taskTitle: string
    submissionUrl: string
    notes?: string
  },
  request?: Request
): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn("Nodemailer SMTP not configured. Skipping task submitted email.")
    return
  }

  const targetEmail = adminEmail || process.env.EMAIL_USER || "team@hackkro.com"
  const baseUrl = getAppBaseUrl(request)
  const adminUrl = `${baseUrl}/admin/dashboard`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #e2e8f0; }
        .container { max-width: 580px; margin: 0 auto; background: #111827; border-radius: 12px; overflow: hidden; border: 1px solid #1f2937; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px 24px; text-align: center; color: white; }
        .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
        .body { padding: 24px; }
        .card { background: #1f2937; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #374151; }
        .button { display: inline-block; background: #10b981; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        .footer { background: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Task Solution Submitted 🚀</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">Awaiting Review & Evaluation</p>
        </div>
        <div class="body">
          <p>Hi Admin,</p>
          <p><strong>${submission.internName || submission.internEmail}</strong> has submitted a solution for task <strong>${submission.taskTitle}</strong>.</p>

          <div class="card">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;">Submitted Link:</p>
            <a href="${submission.submissionUrl}" target="_blank" style="color: #60a5fa; word-break: break-all; font-weight: 600;">${submission.submissionUrl}</a>

            ${
              submission.notes
                ? `<div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #374151;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; color: #9ca3af;">Intern Notes:</p>
                    <p style="margin: 0; font-size: 14px; color: #e5e7eb; font-style: italic;">"${submission.notes}"</p>
                  </div>`
                : ""
            }
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${adminUrl}" class="button">Open Admin Dashboard to Evaluate</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} HackKro. Platform Management.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: FROM_HEADER,
      to: targetEmail,
      subject: `[Submission Alert] ${submission.internName || submission.internEmail} submitted: ${submission.taskTitle}`,
      html,
    })
    console.log(`[Email] Task submission notification sent to admin: ${targetEmail}`)
  } catch (err) {
    console.warn(`[Email] Failed to send submission alert to admin:`, err)
  }
}

/**
 * Send email to Intern when their submission is evaluated/reviewed
 */
export async function sendSubmissionReviewedEmail(
  internEmail: string,
  review: {
    internName: string
    taskTitle: string
    status: "approved" | "rejected"
    pointsAwarded: number
    maxPoints: number
    feedback?: string
  },
  request?: Request
): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn("Nodemailer SMTP not configured. Skipping submission reviewed email.")
    return
  }

  const baseUrl = getAppBaseUrl(request)
  const dashboardUrl = `${baseUrl}/team/dashboard`

  const isApproved = review.status === "approved"
  const bannerColor = isApproved
    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
    : "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
  const statusLabel = isApproved ? "Approved ✅" : "Needs Revision ❌"

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #e2e8f0; }
        .container { max-width: 580px; margin: 0 auto; background: #111827; border-radius: 12px; overflow: hidden; border: 1px solid #1f2937; }
        .header { background: ${bannerColor}; padding: 28px 24px; text-align: center; color: white; }
        .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
        .body { padding: 24px; }
        .card { background: #1f2937; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #374151; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #374151; font-size: 14px; }
        .label { color: #9ca3af; }
        .value { font-weight: 600; color: #f3f4f6; }
        .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        .footer { background: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Submission Evaluated: ${statusLabel}</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">${review.taskTitle}</p>
        </div>
        <div class="body">
          <p>Hi <strong>${review.internName || "there"}</strong>,</p>
          <p>Your submission for <strong>${review.taskTitle}</strong> has been evaluated by the HackKro team.</p>

          <div class="card">
            <div class="info-row">
              <span class="label">Evaluation Status:</span>
              <span class="value" style="color: ${isApproved ? "#34d399" : "#f87171"};">${statusLabel}</span>
            </div>
            <div class="info-row">
              <span class="label">Points Awarded:</span>
              <span class="value" style="color: #fbbf24; font-size: 16px;">${review.pointsAwarded} / ${review.maxPoints} Pts</span>
            </div>

            ${
              review.feedback
                ? `<div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #374151;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; color: #9ca3af;">Admin Feedback & Remarks:</p>
                    <p style="margin: 0; font-size: 14px; color: #e5e7eb; line-height: 1.5; background: #111827; padding: 12px; border-radius: 6px; border: 1px solid #374151;">${review.feedback}</p>
                  </div>`
                : ""
            }
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${dashboardUrl}" class="button">View Details on Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} HackKro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: FROM_HEADER,
      to: internEmail,
      subject: `Submission ${review.status.toUpperCase()}: ${review.taskTitle} [${review.pointsAwarded}/${review.maxPoints} Pts]`,
      html,
    })
    console.log(`[Email] Review notification sent to ${internEmail}`)
  } catch (err) {
    console.warn(`[Email] Failed to send review notification to ${internEmail}:`, err)
  }
}
