import nodemailer from "nodemailer"

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

/**
 * Send Application Received Confirmation
 */
export async function sendApplicationReceivedEmail(
  toEmail: string,
  name: string,
  applicationId: string,
  collegeName: string
): Promise<boolean> {
  try {
    const transporter = getTransporter()
    if (!transporter) return false

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #004aad 0%, #1e40af 100%); padding: 32px 24px; text-align: center; color: white; }
          .body { padding: 32px 24px; }
          .ticket-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
          .ticket-id { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: 2px; font-family: monospace; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 22px;">Application Received! 🚀</h1>
            <p style="margin:4px 0 0 0; font-size: 13px; opacity: 0.9;">HackKro Campus Ambassador Program 2026</p>
          </div>
          <div class="body">
            <p>Dear <strong>${name}</strong>,</p>
            <p>Thank you for applying to become a <strong>HackKro Campus Ambassador</strong> representing <strong>${collegeName}</strong>.</p>
            
            <div class="ticket-box">
              <div style="font-size: 12px; text-transform: uppercase; color: #1e40af; font-weight: 600;">Your Application Reference ID</div>
              <div class="ticket-id">${applicationId}</div>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Save this ID to check your application status online anytime.</p>
            </div>

            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Our outreach team is reviewing your profile and statement of purpose. You will receive an email update once your application status changes.
            </p>

            <div style="text-align: center; margin-top: 24px;">
              <a href="https://hackkro.com/campus-ambassador/status" style="background:#2563eb; color:#ffffff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600; display:inline-block;">Track Application Status</a>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 HackKro Platform. India's Premier Student Opportunity Ecosystem.</p>
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"HackKro Campus Program" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Application Received: HackKro Campus Ambassador [Ref: ${applicationId}]`,
      html,
    })
    return true
  } catch (err) {
    console.error("sendApplicationReceivedEmail error:", err)
    return false
  }
}

/**
 * Send Application Status Update Email (Approved / Rejected / Under Review)
 */
export async function sendApplicationStatusEmail(
  toEmail: string,
  name: string,
  status: "Approved" | "Rejected" | "Under Review",
  applicationId: string,
  ambassadorId?: string,
  adminNotes?: string
): Promise<boolean> {
  try {
    const transporter = getTransporter()
    if (!transporter) return false

    const isApproved = status === "Approved"
    const isRejected = status === "Rejected"

    const subject = isApproved
      ? `🎉 Congratulations! Your HackKro Campus Ambassador Application is Approved [ID: ${ambassadorId || applicationId}]`
      : isRejected
      ? `Update on your HackKro Campus Ambassador Application [Ref: ${applicationId}]`
      : `Application Under Review: HackKro Campus Ambassador [Ref: ${applicationId}]`

    const statusBadgeColor = isApproved ? "#16a34a" : isRejected ? "#dc2626" : "#f59e0b"

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #004aad 0%, #1e40af 100%); padding: 32px 24px; text-align: center; color: white; }
          .body { padding: 32px 24px; }
          .status-box { background: #f8fafc; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; border: 1px solid #e2e8f0; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 22px;">
              ${isApproved ? "Welcome to the HackKro Team! 🌟" : "Campus Ambassador Program Update"}
            </h1>
            <p style="margin:4px 0 0 0; font-size: 13px; opacity: 0.9;">HackKro Campus Leadership Network</p>
          </div>
          <div class="body">
            <p>Dear <strong>${name}</strong>,</p>

            <div class="status-box">
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1px;">Application Status</span>
              <div style="font-size: 22px; font-weight: 800; color: ${statusBadgeColor}; margin: 6px 0;">
                ${status.toUpperCase()}
              </div>
              ${ambassadorId ? `<div style="font-size: 13px; color: #1e40af; font-family: monospace;">Ambassador ID: <strong>${ambassadorId}</strong></div>` : ""}
            </div>

            ${
              isApproved
                ? `
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Congratulations! We were impressed by your profile and passion for building student communities. You have been officially approved as a <strong>HackKro Campus Ambassador</strong>.
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                You can now log in to the Campus Ambassador Dashboard using your registered email and password to access your referral links, resources, and community channels.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="https://hackkro.com/campus-ambassador/login" style="background:#16a34a; color:#ffffff; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:700; display:inline-block;">Access Ambassador Dashboard</a>
              </div>
            `
                : isRejected
                ? `
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Thank you for taking the time to apply. After reviewing all applications for this cohort, we are unable to proceed with your application at this time.
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                We encourage you to participate in upcoming HackKro hackathons and re-apply in our next semester intake.
              </p>
            `
                : `
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Your application has moved to the <strong>Under Review</strong> stage. Our campus team is doing final cohort selections and will reach out to you shortly.
              </p>
            `
            }

            ${
              adminNotes
                ? `
              <div style="background:#eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #1e40af;">
                <strong>Note from HackKro Team:</strong><br/>
                ${adminNotes}
              </div>
            `
                : ""
            }
          </div>
          <div class="footer">
            <p>© 2026 HackKro Platform. Need help? Contact campus@hackkro.com</p>
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"HackKro Campus Team" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html,
    })
    return true
  } catch (err) {
    console.error("sendApplicationStatusEmail error:", err)
    return false
  }
}
