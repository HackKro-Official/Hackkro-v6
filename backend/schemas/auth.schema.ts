import { z } from "zod"

export const identifySchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or mobile number"),
  countryDialCode: z.string().trim().optional().default("+91"),
})

export const passwordLoginSchema = z.object({
  identifier: z.string().trim().min(3),
  countryDialCode: z.string().trim().optional().default("+91"),
  password: z.string().min(1, "Password is required"),
  rememberDevice: z.boolean().optional().default(false),
  returnTo: z.string().optional(),
})

export const otpRequestSchema = z.object({
  identifier: z.string().trim().min(3),
  countryDialCode: z.string().trim().optional().default("+91"),
  purpose: z.enum(["login", "signup", "verify_contact", "link_identity", "step_up"]).default("login"),
})

export const otpVerifySchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
  rememberDevice: z.boolean().optional().default(false),
  returnTo: z.string().optional(),
})

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().trim().email("Valid email is required").optional(),
  phone: z.string().trim().optional(),
  countryDialCode: z.string().trim().optional().default("+91"),
  password: z.string().min(8, "Passphrase must be at least 8 characters"),
  country: z.string().trim().min(2).max(4).default("IN"),
  dateOfBirth: z.string().optional(),
  primaryIntent: z
    .enum(["student", "recruiter", "organizer", "mentor", "college", "ambassador"])
    .default("student"),
  organizationName: z.string().trim().max(150).optional(),
  organizationDomain: z.string().trim().max(120).optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service and Privacy Policy." }),
  }),
  termsVersion: z.string().default("v3.0-2026"),
  marketingConsent: z.boolean().optional().default(false),
  locale: z.string().default("en"),
  referralCode: z.string().trim().optional(),
  returnTo: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3),
  countryDialCode: z.string().trim().optional().default("+91"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(16),
  newPassword: z.string().min(8),
})

export const switchWorkspaceSchema = z.object({
  roleKey: z.string().min(1),
  organizationId: z.string().nullable().optional(),
})
