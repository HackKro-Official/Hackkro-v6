import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../backend/utils/crypto"
import { CORE_ROLES, ROLE_METADATA, ALL_PERMISSIONS, ROLE_PERMISSION_MATRIX } from "../config/permissions"

const prisma = new PrismaClient()

export async function runSeed() {
  console.log("Seeding HackKro v3.0 relational database...")

  // 1. Seed Roles & Permissions
  for (const permKey of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permKey },
      update: {},
      create: { key: permKey, description: `Permission ${permKey}` },
    })
  }

  for (const roleKey of CORE_ROLES) {
    const meta = ROLE_METADATA[roleKey]
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: { name: meta.name, scope: meta.scope, description: meta.description },
      create: { key: roleKey, name: meta.name, scope: meta.scope, description: meta.description },
    })
    const permKeys = ROLE_PERMISSION_MATRIX[roleKey] || []
    for (const pk of permKeys) {
      const perm = await prisma.permission.findUnique({ where: { key: pk } })
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        })
      }
    }
  }

  // 2. Seed Core Persona Users (all use scrypt_v1 passphrase "HackKroPass!2026")
  const defaultHash = hashPassword("HackKroPass!2026")

  async function ensureUser(data: {
    username: string
    displayName: string
    email: string
    phone?: string
    intent: string
    college?: string
    skills?: string[]
  }) {
    const existing = await prisma.user.findUnique({ where: { primaryEmail: data.email } })
    if (existing) return existing

    const u = await prisma.user.create({
      data: {
        username: data.username,
        displayName: data.displayName,
        primaryEmail: data.email,
        emailVerifiedAt: new Date(),
        primaryPhoneE164: data.phone || null,
        phoneVerifiedAt: data.phone ? new Date() : null,
        primaryIntent: data.intent,
        onboardingCompleted: true,
        status: "active",
        points: 250,
      },
    })
    await prisma.passwordCredential.create({
      data: { userId: u.id, passwordHash: defaultHash, hashVersion: "scrypt_v1" },
    })
    await prisma.profile.create({
      data: {
        userId: u.id,
        headline: `${data.displayName} — Builder & Innovator`,
        summary: "Full-stack builder passionate about AI systems, open source, and scalable cloud products.",
        collegeName: data.college || "National Institute of Technology",
        degree: "B.Tech",
        branch: "Computer Science & Engineering",
        graduationYear: "2026",
        experienceYears: 1,
        location: "Bengaluru, India",
        githubUrl: `https://github.com/${data.username}`,
        linkedinUrl: `https://linkedin.com/in/${data.username}`,
        interestsJson: JSON.stringify(["Hackathon", "Generative AI", "Software Engineering"]),
      },
    })
    await prisma.privacySettings.create({
      data: { userId: u.id, recruiterDiscovery: true, publicPortfolio: true, personalizationConsent: true },
    })
    await prisma.consentRecord.create({
      data: { userId: u.id, consentType: "terms", version: "v3.0-2026", locale: "en", granted: true },
    })
    for (const sk of data.skills || ["TypeScript", "React", "Python", "SQL"]) {
      await prisma.userSkill.create({
        data: { userId: u.id, name: sk, provenance: "self_declared", proficiency: 4 },
      })
    }
    return u
  }

  const studentUser = await ensureUser({
    username: "aarav_dev",
    displayName: "Aarav Sharma",
    email: "student@hackkro.local",
    phone: "+919876543210",
    intent: "student",
    college: "IIT Delhi",
    skills: ["TypeScript", "Next.js", "Python", "PostgreSQL", "System Design"],
  })

  const organizerUser = await ensureUser({
    username: "priya_org",
    displayName: "Priya Nair",
    email: "organizer@hackkro.local",
    phone: "+919811122233",
    intent: "organizer",
    college: "HackKro Community Events",
  })

  const recruiterUser = await ensureUser({
    username: "rohan_hire",
    displayName: "Rohan Mehta",
    email: "recruiter@hackkro.local",
    intent: "recruiter",
  })

  const judgeUser = await ensureUser({
    username: "ananya_judge",
    displayName: "Dr. Ananya Rao",
    email: "judge@hackkro.local",
    intent: "mentor",
  })

  const mentorUser = await ensureUser({
    username: "vikram_mentor",
    displayName: "Vikramaditya Joshi",
    email: "mentor@hackkro.local",
    intent: "mentor",
  })

  const collegeUser = await ensureUser({
    username: "tpo_nit",
    displayName: "Prof. Suresh Kulkarni",
    email: "college@hackkro.local",
    intent: "college",
    college: "NIT Surathkal",
  })

  const adminUser = await ensureUser({
    username: "platform_admin",
    displayName: "HackKro Platform Admin",
    email: "admin@hackkro.local",
    intent: "organizer",
  })

  // 3. Seed Organizations & Memberships (Multi-tenant isolation testing relies on 2 distinct orgs)
  const orgHackKro = await prisma.organization.upsert({
    where: { slug: "hackkro-labs" },
    update: {},
    create: {
      slug: "hackkro-labs",
      legalName: "HackKro Innovation Foundation",
      displayName: "HackKro Innovation Labs",
      type: "community",
      domain: "hackkro.local",
      officialEmail: "events@hackkro.local",
      website: "https://hackkro.local",
      description: "National organizer of flagship AI, Web3, and product buildathons across India.",
      verificationStatus: "verified",
      evidenceType: "domain_dns",
      verifiedBy: adminUser.id,
      verifiedAt: new Date(),
      createdBy: organizerUser.id,
    },
  })

  const orgNovaTech = await prisma.organization.upsert({
    where: { slug: "novatech-cloud" },
    update: {},
    create: {
      slug: "novatech-cloud",
      legalName: "NovaTech Cloud Systems Pvt Ltd",
      displayName: "NovaTech Cloud",
      type: "company",
      domain: "novatech.local",
      officialEmail: "talent@novatech.local",
      website: "https://novatech.local",
      description: "High-scale distributed cloud and developer infrastructure engineering team.",
      culture: "High ownership, remote-friendly, weekly architecture reviews, open-source first.",
      locationsJson: JSON.stringify(["Bengaluru", "Hyderabad", "Remote"]),
      benefitsJson: JSON.stringify(["Health Insurance", "Learning Budget", "ESOPs", "Flexible Hours"]),
      verificationStatus: "verified",
      evidenceType: "corporate_registration",
      verifiedBy: adminUser.id,
      verifiedAt: new Date(),
      createdBy: recruiterUser.id,
    },
  })

  const orgNit = await prisma.organization.upsert({
    where: { slug: "nit-surathkal" },
    update: {},
    create: {
      slug: "nit-surathkal",
      legalName: "National Institute of Technology Karnataka",
      displayName: "NIT Surathkal Placement Cell",
      type: "college",
      domain: "nitk.edu.in",
      officialEmail: "tpo@nitk.edu.in",
      description: "Official campus placement & student innovation ecosystem for NIT Surathkal.",
      verificationStatus: "verified",
      evidenceType: "edu_domain",
      verifiedBy: adminUser.id,
      verifiedAt: new Date(),
      createdBy: collegeUser.id,
    },
  })

  // Memberships
  const membershipPairs = [
    { userId: organizerUser.id, organizationId: orgHackKro.id, roleKey: "organizer_owner" },
    { userId: judgeUser.id, organizationId: orgHackKro.id, roleKey: "evaluator" },
    { userId: recruiterUser.id, organizationId: orgNovaTech.id, roleKey: "recruiter_admin" },
    { userId: collegeUser.id, organizationId: orgNit.id, roleKey: "college_admin" },
    { userId: adminUser.id, organizationId: orgHackKro.id, roleKey: "platform_admin" },
    { userId: studentUser.id, organizationId: orgHackKro.id, roleKey: "campus_ambassador" },
  ]
  for (const m of membershipPairs) {
    await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId_roleKey: {
          userId: m.userId,
          organizationId: m.organizationId,
          roleKey: m.roleKey,
        },
      },
      update: { status: "active" },
      create: { ...m, status: "active", acceptedAt: new Date() },
    })
  }

  // Institution + Cohorts + Placement Drive
  const inst = await prisma.institution.upsert({
    where: { organizationId: orgNit.id },
    update: {},
    create: {
      organizationId: orgNit.id,
      institutionType: "engineering_college",
      accreditation: "Institute of National Importance",
      departmentsJson: JSON.stringify(["CSE", "IT", "ECE", "Mechanical"]),
      placementCellEmail: "tpo@nitk.edu.in",
      verifiedCohortsCount: 2,
    },
  })

  if ((await prisma.campusCohort.count({ where: { institutionId: inst.id } })) === 0) {
    await prisma.campusCohort.createMany({
      data: [
        {
          institutionId: inst.id,
          name: "B.Tech CSE Class of 2026",
          graduationYear: "2026",
          department: "CSE",
          verifiedEmailsJson: JSON.stringify(["student@hackkro.local"]),
          studentCount: 140,
        },
        {
          institutionId: inst.id,
          name: "M.Tech AI & Data Science 2026",
          graduationYear: "2026",
          department: "AI & DS",
          verifiedEmailsJson: JSON.stringify([]),
          studentCount: 45,
        },
      ],
    })
  }

  // 4. Seed Diverse Opportunities across Hackathons, Jobs, Internships, Quizzes, Case Studies, Scholarships, Workshops
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  const seedOpportunities = [
    {
      slug: "hackkro-national-buildathon-2026",
      title: "HackKro National Buildathon 2026",
      shortSummary: "India's flagship 36-hour multi-track AI, FinTech & Cloud hackathon with ₹2,50,000 in prizes & grants.",
      fullDescription:
        "<h3>Build Production MVPs in 36 Hours</h3><p>Collaborate in teams of 1–4 across Generative AI, FinTech Infrastructure, and Developer Tools. Includes live mentor office hours, automated sandbox evaluation, and direct fast-track interviews with hiring partners.</p>",
      type: "hackathon",
      category: "Generative AI & Cloud",
      organizationId: orgHackKro.id,
      status: "live",
      locationMode: "hybrid",
      locationText: "Bengaluru + Virtual Arena",
      venue: "HackKro Innovation Hub, Bengaluru",
      registrationOpenAt: new Date(now - 5 * day),
      registrationCloseAt: new Date(now + 21 * day),
      eventStartAt: new Date(now + 23 * day),
      eventEndAt: new Date(now + 25 * day),
      teamMin: 1,
      teamMax: 4,
      capacity: 500,
      feeAmount: 0,
      prizeText: "₹2,50,000 Prize Pool + Cloud Credits",
      skills: ["TypeScript", "Python", "React", "AI/ML", "PostgreSQL"],
      tracks: ["Generative AI Agents", "FinTech & Open Banking", "Climate & Civic Tech"],
      featured: true,
      popularityScore: 420,
      createdBy: organizerUser.id,
    },
    {
      slug: "novatech-sde-intern-2026",
      title: "Software Engineer Intern — Distributed Systems (Summer 2026)",
      shortSummary: "Paid 6-month software engineering internship working on high-throughput event pipelines at NovaTech Cloud.",
      fullDescription:
        "<h3>Role Overview</h3><p>Join our core platform team building resilient distributed task queues, TypeScript APIs, and observability dashboards. High-performing interns receive pre-placement offers (PPO).</p>",
      type: "internship",
      category: "Software Engineering",
      organizationId: orgNovaTech.id,
      status: "live",
      locationMode: "hybrid",
      locationText: "Bengaluru, India (Hybrid)",
      registrationOpenAt: new Date(now - 3 * day),
      registrationCloseAt: new Date(now + 30 * day),
      eventStartAt: new Date(now + 45 * day),
      teamMin: 1,
      teamMax: 1,
      capacity: 200,
      feeAmount: 0,
      stipendText: "₹65,000 / month",
      salaryShared: true,
      salaryMin: 65000,
      salaryMax: 65000,
      employmentType: "internship",
      department: "Platform Engineering",
      skills: ["TypeScript", "Node.js", "PostgreSQL", "System Design"],
      tracks: ["Backend Systems"],
      featured: true,
      popularityScore: 380,
      createdBy: recruiterUser.id,
    },
    {
      slug: "novatech-fullstack-engineer-2026",
      title: "Full-Stack Product Engineer (New Grad / 0–2 Yrs)",
      shortSummary: "Full-time role shipping accessible, fast Next.js + PostgreSQL applications at NovaTech Cloud.",
      fullDescription:
        "<h3>What You Will Build</h3><p>Own end-to-end features across React Server Components, REST APIs, and Prisma schemas with strong automated test coverage.</p>",
      type: "job",
      category: "Full-Stack Development",
      organizationId: orgNovaTech.id,
      status: "live",
      locationMode: "online",
      locationText: "Remote (India)",
      registrationOpenAt: new Date(now - 2 * day),
      registrationCloseAt: new Date(now + 40 * day),
      teamMin: 1,
      teamMax: 1,
      feeAmount: 0,
      salaryShared: true,
      salaryMin: 1400000,
      salaryMax: 2200000,
      employmentType: "full_time",
      department: "Product Engineering",
      skills: ["React", "TypeScript", "Next.js", "SQL"],
      tracks: ["Full-Stack"],
      featured: true,
      popularityScore: 310,
      createdBy: recruiterUser.id,
    },
    {
      slug: "algo-sprint-coding-contest-2026",
      title: "AlgoSprint National Coding Championship 2026",
      shortSummary: "90-minute competitive programming & algorithmic debugging challenge with isolated sandbox judging.",
      fullDescription:
        "<p>Solve algorithmic and data-structure challenges in our isolated code execution sandbox. Top 50 performers receive verified assessed skill badges.</p>",
      type: "coding_contest",
      category: "Algorithms & DSA",
      organizationId: orgHackKro.id,
      status: "live",
      locationMode: "online",
      locationText: "Online",
      registrationOpenAt: new Date(now - 4 * day),
      registrationCloseAt: new Date(now + 15 * day),
      teamMin: 1,
      teamMax: 1,
      capacity: 1000,
      feeAmount: 0,
      prizeText: "₹50,000 + Verified Coding Badges",
      skills: ["Algorithms", "JavaScript", "Data Structures"],
      tracks: ["Competitive Programming"],
      featured: true,
      popularityScore: 295,
      createdBy: organizerUser.id,
    },
    {
      slug: "product-strategy-case-challenge-2026",
      title: "FinTech Product & Case Strategy Cup 2026",
      shortSummary: "Solve a real B2B payments growth case study and pitch to product leaders.",
      fullDescription:
        "<p>Teams analyze unit economics, regulatory onboarding friction, and GTM strategy for emerging digital credit infrastructure.</p>",
      type: "case_study",
      category: "Product & Strategy",
      organizationId: orgHackKro.id,
      status: "live",
      locationMode: "online",
      locationText: "Pan-India Virtual",
      registrationOpenAt: new Date(now - 2 * day),
      registrationCloseAt: new Date(now + 18 * day),
      teamMin: 2,
      teamMax: 3,
      feeAmount: 19900, // ₹199 paid ticket example for payment/ledger testing
      prizeText: "₹1,00,000 + PM Interview Fast-Track",
      skills: ["Product Strategy", "SQL", "Analytics"],
      tracks: ["FinTech Strategy"],
      featured: false,
      popularityScore: 190,
      createdBy: organizerUser.id,
    },
    {
      slug: "cloud-architecture-workshop-2026",
      title: "Zero-Downtime Postgres & Distributed Queues Workshop",
      shortSummary: "Hands-on engineering workshop covering migrations, idempotency, and observability.",
      fullDescription:
        "<p>Deep-dive live workshop with architecture blueprints, Q&A, and verifiable attendance certificate.</p>",
      type: "workshop",
      category: "Cloud & Infrastructure",
      organizationId: orgNovaTech.id,
      status: "live",
      locationMode: "online",
      locationText: "Live Webinar",
      registrationOpenAt: new Date(now - 1 * day),
      registrationCloseAt: new Date(now + 10 * day),
      teamMin: 1,
      teamMax: 1,
      capacity: 300,
      feeAmount: 0,
      prizeText: "Verified Attendance Credential",
      skills: ["PostgreSQL", "System Design"],
      tracks: ["Infrastructure"],
      featured: false,
      popularityScore: 145,
      createdBy: recruiterUser.id,
    },
  ]

  const createdOps: Record<string, any> = {}
  for (const opData of seedOpportunities) {
    let op = await prisma.opportunity.findUnique({ where: { slug: opData.slug } })
    if (!op) {
      op = await prisma.opportunity.create({
        data: {
          slug: opData.slug,
          title: opData.title,
          shortSummary: opData.shortSummary,
          fullDescription: opData.fullDescription,
          type: opData.type,
          category: opData.category,
          organizationId: opData.organizationId,
          visibility: "public",
          status: opData.status,
          locationMode: opData.locationMode,
          locationText: opData.locationText,
          venue: opData.venue || "",
          registrationOpenAt: opData.registrationOpenAt,
          registrationCloseAt: opData.registrationCloseAt,
          eventStartAt: opData.eventStartAt || null,
          eventEndAt: opData.eventEndAt || null,
          teamMin: opData.teamMin,
          teamMax: opData.teamMax,
          capacity: opData.capacity ?? null,
          feeAmount: opData.feeAmount,
          currency: "INR",
          prizeText: opData.prizeText || "",
          stipendText: opData.stipendText || "",
          salaryShared: opData.salaryShared || false,
          salaryMin: opData.salaryMin ?? null,
          salaryMax: opData.salaryMax ?? null,
          employmentType: opData.employmentType || "",
          department: opData.department || "",
          skillsJson: JSON.stringify(opData.skills),
          tracksJson: JSON.stringify(opData.tracks),
          perksJson: JSON.stringify(["Verified Digital Certificate", "Mentor Feedback", "Portfolio Recognition"]),
          rulesJson: JSON.stringify([
            "All submissions must be original work created during the competition window.",
            "Respect the HackKro Code of Conduct.",
          ]),
          faqsJson: JSON.stringify([
            { q: "Can cross-college teams participate?", a: "Yes, cross-college and cross-organization teams are welcome unless restricted by track." },
            { q: "Is there a registration fee?", a: opData.feeAmount > 0 ? `Standard ticket fee is INR ${opData.feeAmount / 100} + applicable taxes.` : "Participation is 100% free." },
          ]),
          contactChannel: "support@hackkro.local",
          featured: opData.featured,
          popularityScore: opData.popularityScore,
          createdBy: opData.createdBy,
          publishedAt: new Date(),
        },
      })

      await prisma.opportunityVersion.create({
        data: {
          opportunityId: op.id,
          versionNumber: 1,
          snapshotJson: JSON.stringify(op),
          changeReason: "Initial publication",
          changedBy: opData.createdBy,
        },
      })

      const form = await prisma.registrationForm.create({
        data: {
          opportunityId: op.id,
          title: `${op.title} — Application Form`,
          instructions: "Your HackKro profile auto-fills common fields. Review and confirm before submitting.",
        },
      })

      await prisma.formField.createMany({
        data: [
          {
            formId: form.id,
            sectionKey: "background",
            label: "Why are you excited to participate?",
            helpText: "Share your goals or relevant project experience.",
            fieldType: "long_text",
            required: true,
            exportName: "motivation",
            orderIndex: 1,
          },
          {
            formId: form.id,
            sectionKey: "links",
            label: "GitHub or Portfolio URL",
            fieldType: "url",
            required: false,
            profileMapping: "githubUrl",
            exportName: "portfolio_url",
            orderIndex: 2,
          },
        ],
      })

      if (op.type === "job" || op.type === "internship") {
        await prisma.jobRequisition.create({
          data: {
            opportunityId: op.id,
            organizationId: op.organizationId,
            hiringManagerId: opData.createdBy,
            hiringTeamIdsJson: JSON.stringify([opData.createdBy]),
            status: "open",
          },
        })
      }

      if (op.feeAmount > 0) {
        await prisma.ticketTier.create({
          data: {
            opportunityId: op.id,
            name: "Standard Team Pass",
            description: "Includes full case deck, mentor office hours, and evaluation certificate.",
            priceAmount: op.feeAmount,
            currency: "INR",
            capacity: 200,
          },
        })
        await prisma.coupon.create({
          data: {
            opportunityId: op.id,
            code: "HACKKRO50",
            discountType: "percent",
            discountValue: 50,
            maxUses: 100,
          },
        })
      }
    }
    createdOps[opData.slug] = op
  }

  // Placement Drive linked to internship
  if ((await prisma.placementDrive.count({ where: { institutionId: inst.id } })) === 0) {
    await prisma.placementDrive.create({
      data: {
        institutionId: inst.id,
        opportunityId: createdOps["novatech-sde-intern-2026"]?.id,
        companyName: "NovaTech Cloud",
        title: "NovaTech Cloud Summer 2026 Campus Drive",
        eligibilityJson: JSON.stringify({ minCgpa: 7.0, branches: ["CSE", "IT", "ECE"] }),
        registrationOpenAt: new Date(),
        registrationCloseAt: new Date(now + 20 * day),
        driveDate: new Date(now + 25 * day),
        status: "open",
      },
    })
  }

  // 5. Seed Rubric, Rounds, and Assessment (with MCQ + Multi + Coding Sandbox question)
  const buildathon = createdOps["hackkro-national-buildathon-2026"]
  if (buildathon && (await prisma.rubric.count({ where: { opportunityId: buildathon.id } })) === 0) {
    await prisma.rubric.create({
      data: {
        opportunityId: buildathon.id,
        trackName: "Generative AI Agents",
        title: "Buildathon Final Judging Rubric",
        criteriaJson: JSON.stringify([
          { id: "innovation", name: "Innovation & Problem Fit", description: "Originality and depth of user problem solved.", weight: 30, maxScore: 10, anchors: "10 = Breakthrough validated workflow" },
          { id: "engineering", name: "Engineering & Architecture", description: "Code quality, security, reliability, and live demo.", weight: 40, maxScore: 10, anchors: "10 = Production-ready full-stack deployment" },
          { id: "impact", name: "Usability & Impact", description: "Accessibility, UX clarity, and real-world feasibility.", weight: 30, maxScore: 10, anchors: "10 = Accessible, measurable impact" },
        ]),
      },
    })
  }

  const assessmentSlug = "hackkro-fullstack-coding-round-1"
  let assessment = await prisma.assessment.findUnique({ where: { slug: assessmentSlug } })
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        slug: assessmentSlug,
        organizationId: orgHackKro.id,
        opportunityId: createdOps["algo-sprint-coding-contest-2026"]?.id,
        title: "Round 1: Algorithms, Systems & Live Coding Assessment",
        description: "Mixed assessment combining system design MCQs, multi-select security checks, and an isolated JavaScript coding problem.",
        instructionsJson: JSON.stringify([
          "Your progress autosaves automatically every few seconds.",
          "Accommodations (extra time / screen-reader mode) can be enabled before starting.",
          "Tab switches are logged as review indicators only — never auto-disqualification.",
        ]),
        durationMinutes: 45,
        negativeMarkingRatio: 0.25,
        partialCredit: true,
        maxAttempts: 2,
        proctoringConfigJson: JSON.stringify({
          required: true,
          tabSwitchMonitoring: true,
          fullscreenRecommended: true,
          retentionDays: 30,
        }),
        showExplanations: true,
        resultsPublished: true,
        passingScore: 40,
        createdBy: organizerUser.id,
      },
    })

    await prisma.question.createMany({
      data: [
        {
          assessmentId: assessment.id,
          organizationId: orgHackKro.id,
          format: "mcq_single",
          topic: "Backend Architecture",
          skillTag: "System Design",
          difficulty: "medium",
          prompt: "Which mechanism prevents duplicate payment charges when a client retries an HTTP POST checkout request after a network timeout?",
          optionsJson: JSON.stringify([
            { id: "a", text: "Client-side setTimeout debounce only" },
            { id: "b", text: "Server-enforced unique Idempotency-Key checked atomically inside a DB transaction" },
            { id: "c", text: "Storing payment status inside browser localStorage" },
            { id: "d", text: "Using HTTP GET instead of POST" },
          ]),
          correctAnswerJson: JSON.stringify({ optionId: "b" }),
          points: 10,
          explanation: "An atomic server-side idempotency key ensures repeated retries resolve to the single original transaction.",
        },
        {
          assessmentId: assessment.id,
          organizationId: orgHackKro.id,
          format: "mcq_multi",
          topic: "Web Security",
          skillTag: "Security",
          difficulty: "medium",
          prompt: "Select ALL mandatory properties for secure browser session cookies on HackKro:",
          optionsJson: JSON.stringify([
            { id: "a", text: "HttpOnly flag to block JavaScript document.cookie access" },
            { id: "b", text: "Storing raw session secret in localStorage" },
            { id: "c", text: "SameSite=Lax (or Strict) paired with CSRF verification on mutations" },
            { id: "d", text: "Secure flag over HTTPS in production" },
          ]),
          correctAnswerJson: JSON.stringify({ optionIds: ["a", "c", "d"] }),
          points: 15,
          explanation: "HttpOnly + SameSite + Secure cookies protect sessions from XSS exfiltration and CSRF.",
        },
        {
          assessmentId: assessment.id,
          organizationId: orgHackKro.id,
          format: "numerical",
          topic: "Algorithms",
          skillTag: "Algorithms",
          difficulty: "easy",
          prompt: "What is the minimum number of comparisons required in the worst case to find a target in a sorted array of 1024 unique elements using binary search?",
          optionsJson: JSON.stringify([]),
          correctAnswerJson: JSON.stringify({ value: 11 }),
          points: 10,
          explanation: "floor(log2(1024)) + 1 = 10 + 1 = 11 iterations.",
        },
        {
          assessmentId: assessment.id,
          organizationId: orgHackKro.id,
          format: "coding",
          topic: "Algorithms",
          skillTag: "JavaScript",
          difficulty: "medium",
          prompt: "Write a JavaScript function `twoSumSorted(nums, target)` that returns `[index1, index2]` (0-based) of two numbers adding up to `target`, or `[-1, -1]` if none exist.",
          codeSnippet: "function twoSumSorted(nums, target) {\n  // Your O(n) two-pointer solution\n  return [-1, -1];\n}",
          correctAnswerJson: JSON.stringify({ functionName: "twoSumSorted" }),
          testCasesJson: JSON.stringify([
            { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1], isHidden: false },
            { input: [[1, 3, 4, 6, 8], 10], expectedOutput: [1, 4], isHidden: false },
            { input: [[1, 2, 3], 99], expectedOutput: [-1, -1], isHidden: true },
          ]),
          points: 25,
          explanation: "Use left and right pointers converging from both ends in O(n) time and O(1) space.",
        },
      ],
    })
  }

  // 6. Seed Courses, Practice Items & Mentor Marketplace
  if ((await prisma.course.count()) === 0) {
    const course = await prisma.course.create({
      data: {
        slug: "production-system-design-2026",
        organizationId: orgHackKro.id,
        title: "Production System Design & Full-Stack Security",
        subtitle: "Learn multi-tenant architecture, RBAC/ABAC, idempotent transactions, and observability.",
        description: "Hands-on cohort-ready curriculum designed for hackathon winners and software engineering interviews.",
        outcomesJson: JSON.stringify([
          "Design multi-tenant RBAC + ABAC authorization layers",
          "Build idempotent payment & registration state machines",
          "Implement WCAG 2.2 AA accessible web forms",
        ]),
        syllabusJson: JSON.stringify(["Module 1: Identity & Session Security", "Module 2: Transactional Consistency", "Module 3: Event-Driven Queues"]),
        level: "intermediate",
        durationHours: 6,
        instructorName: "Dr. Ananya Rao",
        certificateEnabled: true,
      },
    })

    await prisma.lesson.createMany({
      data: [
        {
          courseId: course.id,
          orderIndex: 1,
          title: "Lesson 1: Memory-Hard Hashing, Sessions & Anti-Enumeration",
          contentType: "text",
          bodyMarkdown: "Always normalize email/E.164 identifiers server-side, hash passwords with Argon2id or scrypt, rotate session tokens on login, and return neutral responses on account lookup and forgot-password.",
          transcriptText: "Transcript: Today we cover anti-enumeration, scrypt salts, and HttpOnly SameSite cookies.",
          completionRule: "quiz_pass",
          quizJson: JSON.stringify({
            questions: [
              {
                id: "q1",
                prompt: "Should a forgot-password endpoint reveal whether an email exists?",
                options: [
                  { id: "a", text: "Yes, show User Not Found" },
                  { id: "b", text: "No, return a neutral confirmation regardless" },
                ],
                correctId: "b",
              },
            ],
          }),
        },
        {
          courseId: course.id,
          orderIndex: 2,
          title: "Lesson 2: Atomic Seat Reservations & Financial Ledgers",
          contentType: "text",
          bodyMarkdown: "Wrap seat capacity checks and application creation inside serializable database transactions. Keep ledger tables append-only and never mutate paid amounts in place.",
          transcriptText: "Transcript: Append-only ledgers preserve financial auditability across refunds and chargebacks.",
          completionRule: "read_ack",
        },
      ],
    })
  }

  if ((await prisma.practiceItem.count()) === 0) {
    await prisma.practiceItem.createMany({
      data: [
        {
          slug: "practice-rate-limiter-design",
          category: "system_design",
          companyTag: "NovaTech Cloud",
          roleTag: "Backend Engineer",
          skillTag: "System Design",
          topic: "API Resilience",
          difficulty: "medium",
          prompt: "Which rate-limiting strategy best protects an OTP endpoint without allowing an attacker to permanently lock out a legitimate victim's account?",
          optionsJson: JSON.stringify([
            { id: "a", text: "Permanent account lockout after 3 failed attempts" },
            { id: "b", text: "Sliding-window throttling with temporary cooldowns keyed by IP + destination + risk signals" },
            { id: "c", text: "Disable rate limiting for authenticated cookies" },
          ]),
          answerKeyJson: JSON.stringify({ correctOptionId: "b" }),
          explanation: "Temporary progressive throttling prevents credential stuffing without creating a denial-of-service lockout vector against victims.",
        },
        {
          slug: "practice-sql-window-rank",
          category: "sql",
          companyTag: "HackKro Labs",
          roleTag: "Data Engineer",
          skillTag: "SQL",
          topic: "Window Functions",
          difficulty: "easy",
          prompt: "Which SQL window function assigns consecutive ranks without gaps when two candidates tie in score?",
          optionsJson: JSON.stringify([
            { id: "a", text: "ROW_NUMBER()" },
            { id: "b", text: "RANK()" },
            { id: "c", text: "DENSE_RANK()" },
          ]),
          answerKeyJson: JSON.stringify({ correctOptionId: "c" }),
          explanation: "DENSE_RANK() assigns identical ranks to ties and does not skip subsequent rank integers.",
        },
      ],
    })
  }

  // Mentor Profile + Slots
  let mentorProfile = await prisma.mentorProfile.findUnique({ where: { userId: mentorUser.id } })
  if (!mentorProfile) {
    mentorProfile = await prisma.mentorProfile.create({
      data: {
        userId: mentorUser.id,
        headline: "Staff Software Architect @ NovaTech Cloud • Ex-FAANG Mentor",
        bio: "10+ years architecting distributed systems, mentoring hackathon finalists, and conducting 400+ engineering interviews.",
        expertiseJson: JSON.stringify(["System Design", "Backend Architecture", "Mock Interviews", "Hackathon Strategy"]),
        company: "NovaTech Cloud",
        roleTitle: "Principal Architect",
        experienceYears: 10,
        verifiedFactsJson: JSON.stringify(["Verified HackKro Judge", "Verified Employer Organization Member"]),
        selfReportedJson: JSON.stringify(["400+ Mock Interviews Conducted"]),
        sessionTypesJson: JSON.stringify([
          { name: "1:1 Architecture & Hackathon Review", durationMin: 30, price: 0 },
          { name: "Mock System Design Interview", durationMin: 45, price: 0 },
        ]),
        hourlyRate: 0,
        currency: "INR",
      },
    })

    await prisma.mentorSlot.createMany({
      data: [
        {
          mentorId: mentorProfile.id,
          startAt: new Date(now + 2 * day),
          endAt: new Date(now + 2 * day + 45 * 60 * 1000),
          timezone: "Asia/Kolkata",
          status: "available",
        },
        {
          mentorId: mentorProfile.id,
          startAt: new Date(now + 3 * day),
          endAt: new Date(now + 3 * day + 45 * 60 * 1000),
          timezone: "Asia/Kolkata",
          status: "available",
        },
      ],
    })
  }

  // 7. Seed Campus Ambassador, Community Groups, Microsite, Feature Flags
  await prisma.ambassadorProfile.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      institutionName: "IIT Delhi",
      city: "New Delhi",
      state: "Delhi",
      referralCode: "HK-AARAV-2026",
      status: "approved",
      points: 180,
      rewardTier: "Gold",
    },
  })

  if ((await prisma.communityGroup.count()) === 0) {
    const grp = await prisma.communityGroup.create({
      data: {
        slug: "ai-builders-india",
        organizationId: orgHackKro.id,
        name: "AI & Full-Stack Builders Guild",
        description: "Discuss hackathon ideas, find teammates, and review system design patterns.",
        visibility: "public",
      },
    })
    await prisma.communityPost.create({
      data: {
        groupId: grp.id,
        authorId: organizerUser.id,
        title: "Welcome to HackKro National Buildathon 2026!",
        body: "Use this forum to pitch problem statements, discover collaborators, and review submission guidelines.",
        isAnnouncement: true,
      },
    })
  }

  if (buildathon && (await prisma.microsite.count({ where: { opportunityId: buildathon.id } })) === 0) {
    await prisma.microsite.create({
      data: {
        slug: "buildathon-2026",
        opportunityId: buildathon.id,
        organizationId: orgHackKro.id,
        title: "HackKro National Buildathon 2026",
        themeTokensJson: JSON.stringify({ primaryColor: "#2563eb", accentColor: "#0f172a", layout: "modern" }),
        sectionsJson: JSON.stringify([
          { id: "hero", type: "hero", title: "HackKro National Buildathon 2026", htmlContent: "<p>36 hours of live engineering, mentorship, and national recognition.</p>" },
          { id: "tracks", type: "tracks", title: "Challenge Tracks", htmlContent: "<ul><li>Generative AI Agents</li><li>FinTech & Open Banking</li><li>Climate & Civic Tech</li></ul>" },
          { id: "prizes", type: "prizes", title: "Prizes & Opportunities", htmlContent: "<p>₹2,50,000 total prize pool plus direct internship & full-time interviews.</p>" },
        ]),
        seoJson: JSON.stringify({
          title: "HackKro National Buildathon 2026 | Official Event Page",
          description: "Join India's premier 36-hour hackathon across AI, FinTech, and Civic Tech.",
        }),
        status: "published",
        publishedVersion: 1,
        publishedAt: new Date(),
      },
    })
  }

  const defaultFlags = [
    { key: "enable_ai_interview_feedback", description: "Enable AI-labeled advisory feedback on mock interviews", enabled: true },
    { key: "enable_proctoring_telemetry", description: "Enable consented proctoring telemetry & risk bands", enabled: true },
    { key: "enable_sandbox_payments", description: "Enable sandbox ticket checkout & signed webhook reconciliation", enabled: true },
    { key: "enable_public_community", description: "Enable public community discussion boards", enabled: true },
  ]
  for (const flag of defaultFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    })
  }

  // 8. Seed a sample Verified Certificate for the student so /verify/[credentialId] works out of the box
  const existingCert = await prisma.certificate.findUnique({ where: { credentialId: "HK-2026-DEMO-VERIFIED" } })
  if (!existingCert) {
    await prisma.certificate.create({
      data: {
        credentialId: "HK-2026-DEMO-VERIFIED",
        userId: studentUser.id,
        organizationId: orgHackKro.id,
        opportunityId: buildathon?.id ?? null,
        recipientName: studentUser.displayName,
        issuerName: "HackKro Innovation Labs",
        title: "HackKro National Buildathon — Verified Finalist Credential",
        achievementType: "finalist",
        criteriaText: "Verified finalist project evaluation across engineering, architecture, and accessibility.",
        evidenceSummary: "Evaluated by HackKro judging panel.",
        status: "valid",
      },
    })
  }

  console.log("HackKro v3.0 database seeded successfully.")
}

if (require.main === module) {
  runSeed()
    .catch((err) => {
      console.error("Seed error:", err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
