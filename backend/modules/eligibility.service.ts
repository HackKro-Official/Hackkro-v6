import prisma, { safeParseJson } from "@/lib/db"

export interface EligibilityEvaluationResult {
  eligible: boolean
  reasons: string[]
  allowManualException: boolean
  checkedAt: string
  ruleCount: number
}

export async function evaluateUserEligibility(
  userId: string,
  opportunityId: string,
  trackName?: string
): Promise<EligibilityEvaluationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      skills: true,
    },
  })

  if (!user) {
    return {
      eligible: false,
      reasons: ["User profile not found."],
      allowManualException: false,
      checkedAt: new Date().toISOString(),
      ruleCount: 0,
    }
  }

  const rules = await prisma.eligibilityRule.findMany({
    where: {
      opportunityId,
      OR: [{ trackName: null }, ...(trackName ? [{ trackName }] : [])],
    },
  })

  if (rules.length === 0) {
    return {
      eligible: true,
      reasons: [],
      allowManualException: true,
      checkedAt: new Date().toISOString(),
      ruleCount: 0,
    }
  }

  const reasons: string[] = []
  let allowManualException = true
  const profile = user.profile
  const userSkills = new Set(user.skills.map((s) => s.name.toLowerCase()))

  for (const rule of rules) {
    if (!rule.allowManualException) allowManualException = false

    const countries = safeParseJson<string[]>(rule.countriesJson, [])
    if (countries.length > 0 && !countries.map((c) => c.toUpperCase()).includes(user.country.toUpperCase())) {
      reasons.push(`Country eligibility requirement not met (allowed: ${countries.join(", ")}).`)
    }

    if (rule.minAge && user.dateOfBirth) {
      const dob = new Date(user.dateOfBirth)
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (age < rule.minAge) {
        reasons.push(`Minimum age requirement (${rule.minAge}+) is not met.`)
      }
    }

    const eduLevels = safeParseJson<string[]>(rule.educationLevelsJson, [])
    if (
      eduLevels.length > 0 &&
      (!profile?.degree || !eduLevels.some((e) => profile.degree.toLowerCase().includes(e.toLowerCase())))
    ) {
      reasons.push(`Education degree requirement (${eduLevels.join(", ")}) not matched by your profile.`)
    }

    const gradYears = safeParseJson<string[]>(rule.graduationYearsJson, [])
    if (gradYears.length > 0 && (!profile?.graduationYear || !gradYears.includes(profile.graduationYear))) {
      reasons.push(`Eligible graduation years: ${gradYears.join(", ")}.`)
    }

    const branches = safeParseJson<string[]>(rule.branchesJson, [])
    if (
      branches.length > 0 &&
      (!profile?.branch || !branches.some((b) => profile.branch.toLowerCase().includes(b.toLowerCase())))
    ) {
      reasons.push(`Specialization/branch requirement (${branches.join(", ")}) not matched.`)
    }

    const institutions = safeParseJson<string[]>(rule.institutionsJson, [])
    if (
      institutions.length > 0 &&
      (!profile?.collegeName ||
        !institutions.some((inst) => profile.collegeName.toLowerCase().includes(inst.toLowerCase())))
    ) {
      reasons.push(`This opportunity is restricted to specific eligible institutions.`)
    }

    if (
      rule.minExperienceYears !== null &&
      rule.minExperienceYears !== undefined &&
      (profile?.experienceYears ?? 0) < rule.minExperienceYears
    ) {
      reasons.push(`Requires at least ${rule.minExperienceYears} years of experience.`)
    }

    const reqSkills = safeParseJson<string[]>(rule.requiredSkillsJson, [])
    const missingSkills = reqSkills.filter((sk) => !userSkills.has(sk.toLowerCase()))
    if (missingSkills.length > 0) {
      reasons.push(`Missing listed skill(s) on your profile: ${missingSkills.join(", ")}.`)
    }

    if (rule.workAuthRequired && profile?.workAuthorization?.toLowerCase() === "none") {
      reasons.push("Valid work authorization is required for this role.")
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    allowManualException,
    checkedAt: new Date().toISOString(),
    ruleCount: rules.length,
  }
}
