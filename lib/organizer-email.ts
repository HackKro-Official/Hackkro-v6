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
 * Send Organization Registration Received Email
 * Notifies the organizer that their application was submitted and will be reviewed by admin before login access.
 */
export async function sendOrganizerRegistrationReceivedEmail(
  toEmail: string,
  name: string,
  organization: string
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
          .status-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 13px; margin: 12px 0; border: 1px solid #fde68a; }
          .notice-box { background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 14px; color: #166534; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 22px;">Application Submitted Successfully! 🚀</h1>
            <p style="margin:4px 0 0 0; font-size: 13px; opacity: 0.9;">HackKro Host & Organization Partner Ecosystem</p>
          </div>
          <div class="body">
            <p>Dear <strong>${name}</strong>,</p>
            <p>Thank you for registering <strong>${organization}</strong> as an organizer partner on <strong>HackKro</strong>.</p>
            
            <div style="text-align: center;">
              <span class="status-badge">Status: Pending Admin Approval ⏳</span>
            </div>

            <div class="notice-box">
              <strong>What Happens Next?</strong><br>
              Aapka application review ke liye submit ho gaya hai. Hamari admin team aapke organization credentials verify karegi. <strong>Approval milne ke baad aap login karke hackathons, coding contests aur opportunities post kar paoge.</strong>
            </div>

            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Jald hi aapko approval confirmation ka email prapt hoga. Agar aapko koi urgent requirement hai, toh aap direct hamari team se contact kar sakte hain:
            </p>

            <ul style="font-size: 13px; color: #475569; line-height: 1.8;">
              <li><strong>Contact Email:</strong> team@hackkro.com</li>
              <li><strong>Organizer Portal:</strong> https://hackkro.com/organizer/login</li>
            </ul>

            <p style="margin-top: 24px; font-size: 14px; color: #334155;">
              Warm regards,<br>
              <strong>The HackKro Team</strong><br>
              <span style="font-size: 12px; color: #64748b;">India's Leading Student Hackathon & Talent Ecosystem</span>
            </p>
          </div>
          <div class="footer">
            © 2026 HackKro Platform. All rights reserved. • This is an automated notification.
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"HackKro Partnerships" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Registration Received: ${organization} [Pending Admin Review]`,
      html,
    })

    return true
  } catch (err) {
    console.warn("sendOrganizerRegistrationReceivedEmail error:", err)
    return false
  }
}

/**
 * Send Organization Approval or Rejection Status Email
 */
export async function sendOrganizerStatusEmail(
  toEmail: string,
  name: string,
  organization: string,
  status: "approved" | "rejected" | "Approved" | "Rejected",
  adminNotes?: string
): Promise<boolean> {
  try {
    const transporter = getTransporter()
    if (!transporter) return false

    const isApproved = status.toLowerCase() === "approved"
    const subject = isApproved
      ? `🎉 Congratulations! ${organization} Account Approved on HackKro`
      : `Update Regarding Your HackKro Organizer Application: ${organization}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: ${isApproved ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" : "linear-gradient(135deg, #475569 0%, #334155 100%)"}; padding: 32px 24px; text-align: center; color: white; }
          .body { padding: 32px 24px; }
          .btn { background: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 22px;">${isApproved ? "Account Approved! 🚀" : "Application Status Update"}</h1>
            <p style="margin:4px 0 0 0; font-size: 13px; opacity: 0.9;">HackKro Host & Organizer Network</p>
          </div>
          <div class="body">
            <p>Dear <strong>${name}</strong>,</p>
            
            ${
              isApproved
                ? `
                <p>Great news! Your organizer application for <strong>${organization}</strong> has been <strong>Approved</strong> by the HackKro Admin Team.</p>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; color: #166534;">
                  <strong>You can now log in and:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                    <li>List national hackathons and coding competitions</li>
                    <li>Schedule online test rounds and MCQ assessments</li>
                    <li>Track real-time registrations with developer IDs</li>
                    <li>Send updates and broadcast announcements directly to participants</li>
                  </ul>
                </div>

                ${adminNotes ? `<p style="font-size: 13px; color: #475569; background:#f8fafc; padding:12px; border-radius:6px; border:1px solid #e2e8f0;"><strong>Admin Note:</strong> ${adminNotes}</p>` : ""}

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://hackkro.com/organizer/login" class="btn">Login to Organizer Dashboard</a>
                </div>
              `
                : `
                <p>Thank you for your interest in hosting events on HackKro for <strong>${organization}</strong>.</p>
                <p>After reviewing the submitted organization details, your application could not be approved at this time.</p>
                
                ${adminNotes ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; color: #991b1b; font-size: 13px;"><strong>Reason / Notes:</strong> ${adminNotes}</div>` : ""}

                <p style="font-size: 13px; color: #64748b;">If you believe this is an error or wish to submit additional verification documents, please reach out to our team at <a href="mailto:team@hackkro.com" style="color: #2563eb;">team@hackkro.com</a>.</p>
              `
            }

            <p style="margin-top: 24px; font-size: 14px; color: #334155;">
              Best regards,<br>
              <strong>The HackKro Team</strong>
            </p>
          </div>
          <div class="footer">
            © 2026 HackKro Platform. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"HackKro Partnerships" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html,
    })

    return true
  } catch (err) {
    console.warn("sendOrganizerStatusEmail error:", err)
    return false
  }
}

/**
 * Notify HackKro Admin about new organization application
 */
export async function sendOrganizerAdminAlertEmail(
  name: string,
  organization: string,
  email: string,
  phone?: string
): Promise<boolean> {
  try {
    const transporter = getTransporter()
    if (!transporter) return false

    await transporter.sendMail({
      from: `"HackKro Alerts" <${process.env.EMAIL_USER}>`,
      to: "team@hackkro.com",
      subject: `🚨 New Organization Partner Application: ${organization}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e40af; margin-top: 0;">New Organization Registration</h2>
          <p>A new organization has registered on HackKro and is awaiting approval:</p>
          <ul>
            <li><strong>Organization:</strong> ${organization}</li>
            <li><strong>Contact Name:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Phone:</strong> ${phone || "N/A"}</li>
          </ul>
          <p><a href="https://hackkro.com/admin/dashboard" style="background:#2563eb; color:white; padding:8px 16px; border-radius:4px; text-decoration:none;">Open Admin Panel to Review</a></p>
        </div>
      `,
    })

    return true
  } catch (err) {
    console.warn("sendOrganizerAdminAlertEmail error:", err)
    return false
  }
}
