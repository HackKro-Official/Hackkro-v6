-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "displayName" TEXT NOT NULL,
    "primaryEmail" TEXT,
    "emailVerifiedAt" DATETIME,
    "primaryPhoneE164" TEXT,
    "phoneVerifiedAt" DATETIME,
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "country" TEXT NOT NULL DEFAULT 'IN',
    "dateOfBirth" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "primaryIntent" TEXT NOT NULL DEFAULT 'student',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 100,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecretEnc" TEXT,
    "lastLoginAt" DATETIME,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "providerEmail" TEXT,
    "providerEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "hashVersion" TEXT NOT NULL DEFAULT 'scrypt_v1',
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "destinationHash" TEXT NOT NULL,
    "destinationMasked" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" DATETIME,
    "supersededAt" DATETIME,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'sent',
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfToken" TEXT NOT NULL,
    "activeOrganizationId" TEXT,
    "activeRole" TEXT NOT NULL DEFAULT 'participant',
    "deviceLabel" TEXT NOT NULL DEFAULT 'Web Browser',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "ipRiskMetadata" TEXT NOT NULL DEFAULT '{}',
    "rememberDevice" BOOLEAN NOT NULL DEFAULT false,
    "lastReauthAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "granted" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "profileVisibility" TEXT NOT NULL DEFAULT 'public',
    "resumeVisibility" TEXT NOT NULL DEFAULT 'applied_only',
    "recruiterDiscovery" BOOLEAN NOT NULL DEFAULT false,
    "contactSharing" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "publicPortfolio" BOOLEAN NOT NULL DEFAULT true,
    "personalizationConsent" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrivacySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataExportRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataExportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT '',
    "officialEmail" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "bannerUrl" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "culture" TEXT NOT NULL DEFAULT '',
    "locationsJson" TEXT NOT NULL DEFAULT '[]',
    "benefitsJson" TEXT NOT NULL DEFAULT '[]',
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending_review',
    "evidenceType" TEXT NOT NULL DEFAULT '',
    "evidenceUrl" TEXT NOT NULL DEFAULT '',
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "verificationExpiresAt" DATETIME,
    "rejectionReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "customPermissionsJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedBy" TEXT,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "institutionType" TEXT NOT NULL DEFAULT 'engineering_college',
    "accreditation" TEXT NOT NULL DEFAULT '',
    "departmentsJson" TEXT NOT NULL DEFAULT '[]',
    "placementCellEmail" TEXT NOT NULL DEFAULT '',
    "placementCellPhone" TEXT NOT NULL DEFAULT '',
    "verifiedCohortsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Institution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "collegeName" TEXT NOT NULL DEFAULT '',
    "institutionId" TEXT,
    "degree" TEXT NOT NULL DEFAULT 'B.Tech',
    "branch" TEXT NOT NULL DEFAULT '',
    "graduationYear" TEXT NOT NULL DEFAULT '2026',
    "experienceYears" REAL NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL DEFAULT '',
    "workAuthorization" TEXT NOT NULL DEFAULT 'Authorized',
    "languagesJson" TEXT NOT NULL DEFAULT '["English"]',
    "educationJson" TEXT NOT NULL DEFAULT '[]',
    "experienceJson" TEXT NOT NULL DEFAULT '[]',
    "achievementsJson" TEXT NOT NULL DEFAULT '[]',
    "githubUrl" TEXT NOT NULL DEFAULT '',
    "linkedinUrl" TEXT NOT NULL DEFAULT '',
    "portfolioUrl" TEXT NOT NULL DEFAULT '',
    "interestsJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Profile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileAssetId" TEXT,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT NOT NULL DEFAULT '',
    "extractedText" TEXT NOT NULL DEFAULT '',
    "parsedMetadataJson" TEXT NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResumeVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResumeVersion_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Creator',
    "description" TEXT NOT NULL,
    "technologiesJson" TEXT NOT NULL DEFAULT '[]',
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "projectUrl" TEXT NOT NULL DEFAULT '',
    "repoUrl" TEXT NOT NULL DEFAULT '',
    "mediaJson" TEXT NOT NULL DEFAULT '[]',
    "contributionStatement" TEXT NOT NULL DEFAULT '',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PortfolioProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provenance" TEXT NOT NULL DEFAULT 'self_declared',
    "evidenceRef" TEXT NOT NULL DEFAULT '',
    "proficiency" INTEGER NOT NULL DEFAULT 3,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonalTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "actionUrl" TEXT NOT NULL,
    "dueAt" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonalTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortSummary" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "inviteCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "statusReason" TEXT NOT NULL DEFAULT '',
    "bannerAssetUrl" TEXT NOT NULL DEFAULT '',
    "logoAssetUrl" TEXT NOT NULL DEFAULT '',
    "skillsJson" TEXT NOT NULL DEFAULT '[]',
    "locationMode" TEXT NOT NULL DEFAULT 'online',
    "locationText" TEXT NOT NULL DEFAULT 'Remote / Pan-India',
    "venue" TEXT NOT NULL DEFAULT '',
    "registrationOpenAt" DATETIME,
    "registrationCloseAt" DATETIME,
    "eventStartAt" DATETIME,
    "eventEndAt" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "teamMin" INTEGER NOT NULL DEFAULT 1,
    "teamMax" INTEGER NOT NULL DEFAULT 4,
    "allowMultipleApplications" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "reservedCount" INTEGER NOT NULL DEFAULT 0,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "refundPolicy" TEXT NOT NULL DEFAULT 'Full refund up to 48 hours before event start unless tickets are marked non-refundable.',
    "prizeText" TEXT NOT NULL DEFAULT '',
    "stipendText" TEXT NOT NULL DEFAULT '',
    "salaryShared" BOOLEAN NOT NULL DEFAULT false,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "employmentType" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "experienceMin" REAL NOT NULL DEFAULT 0,
    "experienceMax" REAL,
    "externalApplyUrl" TEXT NOT NULL DEFAULT '',
    "contactChannel" TEXT NOT NULL DEFAULT '',
    "dataUseNotice" TEXT NOT NULL DEFAULT 'Submitted data is used strictly to administer this opportunity and evaluate eligibility.',
    "accessibilityNotes" TEXT NOT NULL DEFAULT 'Screen-reader accessible forms and extra-time assessment accommodations supported.',
    "termsVersion" TEXT NOT NULL DEFAULT 'v3.0',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "tracksJson" TEXT NOT NULL DEFAULT '[]',
    "perksJson" TEXT NOT NULL DEFAULT '[]',
    "rulesJson" TEXT NOT NULL DEFAULT '[]',
    "faqsJson" TEXT NOT NULL DEFAULT '[]',
    "sponsorsJson" TEXT NOT NULL DEFAULT '[]',
    "winnersJson" TEXT NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpportunityVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "changeReason" TEXT NOT NULL DEFAULT '',
    "changedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpportunityVersion_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EligibilityRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "trackName" TEXT,
    "countriesJson" TEXT NOT NULL DEFAULT '[]',
    "minAge" INTEGER,
    "educationLevelsJson" TEXT NOT NULL DEFAULT '[]',
    "graduationYearsJson" TEXT NOT NULL DEFAULT '[]',
    "institutionsJson" TEXT NOT NULL DEFAULT '[]',
    "coursesJson" TEXT NOT NULL DEFAULT '[]',
    "branchesJson" TEXT NOT NULL DEFAULT '[]',
    "minExperienceYears" REAL,
    "requiredSkillsJson" TEXT NOT NULL DEFAULT '[]',
    "locationsJson" TEXT NOT NULL DEFAULT '[]',
    "workAuthRequired" BOOLEAN NOT NULL DEFAULT false,
    "allowManualException" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EligibilityRule_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistrationForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Application Form',
    "instructions" TEXT NOT NULL DEFAULT '',
    "sectionsJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RegistrationForm_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL DEFAULT 'general',
    "label" TEXT NOT NULL,
    "helpText" TEXT NOT NULL DEFAULT '',
    "fieldType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    "validationJson" TEXT NOT NULL DEFAULT '{}',
    "conditionalRuleJson" TEXT NOT NULL DEFAULT '{}',
    "profileMapping" TEXT NOT NULL DEFAULT '',
    "retentionClass" TEXT NOT NULL DEFAULT 'standard',
    "exportName" TEXT NOT NULL DEFAULT '',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "RegistrationForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowOrganization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowOrganization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptCode" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "opportunityVersionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "resumeVersionId" TEXT,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "customStatusLabel" TEXT,
    "eligibilityPassed" BOOLEAN NOT NULL DEFAULT true,
    "eligibilitySnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "manualExceptionRequested" BOOLEAN NOT NULL DEFAULT false,
    "manualExceptionApproved" BOOLEAN,
    "manualExceptionReason" TEXT NOT NULL DEFAULT '',
    "consentSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "paymentState" TEXT NOT NULL DEFAULT 'not_required',
    "trackName" TEXT NOT NULL DEFAULT '',
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_opportunityVersionId_fkey" FOREIGN KEY ("opportunityVersionId") REFERENCES "OpportunityVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Application_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "responsesJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormResponse_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicationStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reasonCategory" TEXT NOT NULL DEFAULT 'workflow',
    "participantNote" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trackName" TEXT NOT NULL DEFAULT '',
    "captainId" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" DATETIME,
    "inviteToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Team_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "invitedEmail" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'invited',
    "joinedAt" DATETIME,
    "removedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "milestone" TEXT NOT NULL DEFAULT 'General',
    "assigneeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "dueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamTask_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamDiscussion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamDiscussion_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamDiscussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamActivityLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'submission',
    "mode" TEXT NOT NULL DEFAULT 'online',
    "startAt" DATETIME,
    "endAt" DATETIME,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "assessmentId" TEXT,
    "instructions" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Round_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Round_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "qrToken" TEXT NOT NULL,
    "checkedInBy" TEXT,
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT NOT NULL DEFAULT 'qr',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CheckIn_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncidentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "originalDeadline" DATETIME,
    "revisedDeadline" DATETIME,
    "notifiedCount" INTEGER NOT NULL DEFAULT 0,
    "approvedBy" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "declaredMime" TEXT NOT NULL,
    "detectedMime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'clean',
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "roundId" TEXT,
    "teamId" TEXT,
    "userId" TEXT NOT NULL,
    "trackName" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 0,
    "similarityScore" REAL NOT NULL DEFAULT 0,
    "similarityNote" TEXT NOT NULL DEFAULT '',
    "appealStatus" TEXT NOT NULL DEFAULT 'none',
    "appealText" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Submission_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Submission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubmissionVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "repoUrl" TEXT NOT NULL DEFAULT '',
    "demoUrl" TEXT NOT NULL DEFAULT '',
    "textContent" TEXT NOT NULL DEFAULT '',
    "fileAssetIdsJson" TEXT NOT NULL DEFAULT '[]',
    "checksumSha256" TEXT NOT NULL DEFAULT '',
    "contributionStatement" TEXT NOT NULL DEFAULT '',
    "sourceAttribution" TEXT NOT NULL DEFAULT '',
    "submittedBy" TEXT NOT NULL,
    "deadlineSnapshot" DATETIME,
    "lateReason" TEXT NOT NULL DEFAULT '',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionVersion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "organizationId" TEXT,
    "opportunityId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructionsJson" TEXT NOT NULL DEFAULT '[]',
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "sectionalTimersJson" TEXT NOT NULL DEFAULT '[]',
    "randomizedPoolSize" INTEGER,
    "negativeMarkingRatio" REAL NOT NULL DEFAULT 0,
    "partialCredit" BOOLEAN NOT NULL DEFAULT false,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "calculatorAllowed" BOOLEAN NOT NULL DEFAULT false,
    "proctoringConfigJson" TEXT NOT NULL DEFAULT '{}',
    "showExplanations" BOOLEAN NOT NULL DEFAULT false,
    "resultsPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passingScore" REAL NOT NULL DEFAULT 40,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Assessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assessment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT,
    "organizationId" TEXT,
    "format" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'General',
    "skillTag" TEXT NOT NULL DEFAULT 'Problem Solving',
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "prompt" TEXT NOT NULL,
    "codeSnippet" TEXT NOT NULL DEFAULT '',
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    "correctAnswerJson" TEXT NOT NULL DEFAULT '{}',
    "testCasesJson" TEXT NOT NULL DEFAULT '[]',
    "points" REAL NOT NULL DEFAULT 1,
    "timeLimitSeconds" INTEGER,
    "explanation" TEXT NOT NULL DEFAULT '',
    "accessibilityAlt" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Question_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Question_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "accommodationExtraMinutes" INTEGER NOT NULL DEFAULT 0,
    "proctoringConsentedAt" DATETIME,
    "startedAt" DATETIME,
    "submittedAt" DATETIME,
    "answersJson" TEXT NOT NULL DEFAULT '{}',
    "codeSnapshotsJson" TEXT NOT NULL DEFAULT '{}',
    "rawScore" REAL NOT NULL DEFAULT 0,
    "normalizedScore" REAL NOT NULL DEFAULT 0,
    "reviewerOverrideScore" REAL,
    "overrideReason" TEXT NOT NULL DEFAULT '',
    "scoringVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "proctorRiskBand" TEXT NOT NULL DEFAULT 'low',
    "appealStatus" TEXT NOT NULL DEFAULT 'none',
    "appealNotes" TEXT NOT NULL DEFAULT '',
    "rank" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentAttempt_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProctorSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProctorSignal_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "roundId" TEXT,
    "trackName" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "criteriaJson" TEXT NOT NULL,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rubric_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rubric_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JudgeAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "blindMode" BOOLEAN NOT NULL DEFAULT true,
    "coiDeclared" BOOLEAN NOT NULL DEFAULT false,
    "coiHasConflict" BOOLEAN NOT NULL DEFAULT false,
    "coiReason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JudgeAssignment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JudgeAssignment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JudgeAssignment_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "criterionScoresJson" TEXT NOT NULL DEFAULT '{}',
    "totalWeightedScore" REAL NOT NULL DEFAULT 0,
    "evidenceNotes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isSecondReview" BOOLEAN NOT NULL DEFAULT false,
    "isTieBreak" BOOLEAN NOT NULL DEFAULT false,
    "outlierFlagged" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credentialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "opportunityId" TEXT,
    "courseId" TEXT,
    "recipientName" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "achievementType" TEXT NOT NULL,
    "criteriaText" TEXT NOT NULL DEFAULT '',
    "evidenceSummary" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'valid',
    "revocationReason" TEXT NOT NULL DEFAULT '',
    "correctedFromId" TEXT,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Certificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Certificate_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "outcomesJson" TEXT NOT NULL DEFAULT '[]',
    "syllabusJson" TEXT NOT NULL DEFAULT '[]',
    "level" TEXT NOT NULL DEFAULT 'beginner',
    "durationHours" REAL NOT NULL DEFAULT 4,
    "instructorName" TEXT NOT NULL,
    "prerequisites" TEXT NOT NULL DEFAULT 'None',
    "language" TEXT NOT NULL DEFAULT 'English',
    "deliveryMode" TEXT NOT NULL DEFAULT 'self_paced',
    "priceAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "certificateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "accessibilityNotes" TEXT NOT NULL DEFAULT 'Full transcripts and captions provided.',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "bodyMarkdown" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT NOT NULL DEFAULT '',
    "captionsVtt" TEXT NOT NULL DEFAULT '',
    "transcriptText" TEXT NOT NULL DEFAULT '',
    "resourcesJson" TEXT NOT NULL DEFAULT '[]',
    "quizJson" TEXT NOT NULL DEFAULT '{}',
    "completionRule" TEXT NOT NULL DEFAULT 'read_ack',
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enrollmentOpenAt" DATETIME NOT NULL,
    "enrollmentCloseAt" DATETIME NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "scheduleJson" TEXT NOT NULL DEFAULT '[]',
    "instructorName" TEXT NOT NULL,
    "attendanceJson" TEXT NOT NULL DEFAULT '[]',
    "announcementsJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Cohort_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "cohortId" TEXT,
    "completedLessonIdsJson" TEXT NOT NULL DEFAULT '[]',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "companyTag" TEXT NOT NULL DEFAULT 'General',
    "roleTag" TEXT NOT NULL DEFAULT 'Software Engineer',
    "skillTag" TEXT NOT NULL DEFAULT 'Algorithms',
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "prompt" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    "answerKeyJson" TEXT NOT NULL DEFAULT '{}',
    "explanation" TEXT NOT NULL DEFAULT '',
    "testCasesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "practiceItemId" TEXT NOT NULL,
    "submittedAnswerJson" TEXT NOT NULL DEFAULT '{}',
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeAttempt_practiceItemId_fkey" FOREIGN KEY ("practiceItemId") REFERENCES "PracticeItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MockInterview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "experienceLevel" TEXT NOT NULL DEFAULT '0-2 years',
    "interviewType" TEXT NOT NULL DEFAULT 'technical',
    "mode" TEXT NOT NULL DEFAULT 'ai_simulation',
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "transcriptJson" TEXT NOT NULL DEFAULT '[]',
    "aiFeedbackJson" TEXT NOT NULL DEFAULT '{}',
    "actionItemsJson" TEXT NOT NULL DEFAULT '[]',
    "consentedToTranscript" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MockInterview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MentorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "expertiseJson" TEXT NOT NULL DEFAULT '[]',
    "company" TEXT NOT NULL DEFAULT '',
    "roleTitle" TEXT NOT NULL DEFAULT '',
    "experienceYears" INTEGER NOT NULL DEFAULT 3,
    "languagesJson" TEXT NOT NULL DEFAULT '["English"]',
    "verifiedFactsJson" TEXT NOT NULL DEFAULT '[]',
    "selfReportedJson" TEXT NOT NULL DEFAULT '[]',
    "sessionTypesJson" TEXT NOT NULL DEFAULT '[]',
    "hourlyRate" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "cancellationPolicy" TEXT NOT NULL DEFAULT 'Free cancellation up to 12 hours before session start.',
    "responseExpectation" TEXT NOT NULL DEFAULT 'Typically responds within 24 hours',
    "ratingAvg" REAL NOT NULL DEFAULT 5.0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MentorSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mentorId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorSlot_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mentorId" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "menteeTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentOrderId" TEXT,
    "meetingUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "rating" INTEGER,
    "reviewText" TEXT NOT NULL DEFAULT '',
    "reviewModerated" BOOLEAN NOT NULL DEFAULT false,
    "reportReason" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "MentorSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobRequisition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hiringManagerId" TEXT NOT NULL,
    "hiringTeamIdsJson" TEXT NOT NULL DEFAULT '[]',
    "customStagesJson" TEXT NOT NULL DEFAULT '[]',
    "screeningCriteriaJson" TEXT NOT NULL DEFAULT '{}',
    "automationRulesJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobRequisition_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobRequisition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CandidateStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requisitionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "canonicalStage" TEXT NOT NULL DEFAULT 'new',
    "customStageLabel" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT,
    "privateNotesJson" TEXT NOT NULL DEFAULT '[]',
    "aiSummaryJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CandidateStage_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "JobRequisition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateStage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TalentPool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL DEFAULT 180,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TalentPool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TalentPoolCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "provenance" TEXT NOT NULL DEFAULT 'sourced_search',
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TalentPoolCandidate_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "TalentPool" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TalentPoolCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filtersJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedSearch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutreachCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "recipientIdsJson" TEXT NOT NULL DEFAULT '[]',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "bouncedCount" INTEGER NOT NULL DEFAULT 0,
    "repliedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutreachCampaign_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "panelUserIdsJson" TEXT NOT NULL DEFAULT '[]',
    "scheduledStartAt" DATETIME NOT NULL,
    "scheduledEndAt" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "meetingUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "feedbackDeadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Interview_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "JobRequisition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Interview_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scorecard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interviewId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "competenciesJson" TEXT NOT NULL DEFAULT '[]',
    "overallRecommendation" TEXT NOT NULL,
    "evidenceNotes" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scorecard_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scorecard_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "compensationSummaryJson" TEXT NOT NULL DEFAULT '{}',
    "termsText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "compApprovedBy" TEXT,
    "compApprovedAt" DATETIME,
    "hrApprovedBy" TEXT,
    "hrApprovedAt" DATETIME,
    "sentAt" DATETIME,
    "viewedAt" DATETIME,
    "respondedAt" DATETIME,
    "expiresAt" DATETIME,
    "eSignatureStatus" TEXT NOT NULL DEFAULT 'not_started',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "JobRequisition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampusCohort" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "graduationYear" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "verifiedEmailsJson" TEXT NOT NULL DEFAULT '[]',
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampusCohort_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlacementDrive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "companyName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eligibilityJson" TEXT NOT NULL DEFAULT '{}',
    "registrationOpenAt" DATETIME,
    "registrationCloseAt" DATETIME,
    "driveDate" DATETIME,
    "attendanceJson" TEXT NOT NULL DEFAULT '[]',
    "offersCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlacementDrive_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlacementDrive_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AmbassadorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "referralCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "campaignNotes" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL DEFAULT 0,
    "rewardTier" TEXT NOT NULL DEFAULT 'Bronze',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AmbassadorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferralEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ambassadorId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referredUserId" TEXT,
    "opportunityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'clicked',
    "fraudReason" TEXT NOT NULL DEFAULT '',
    "fingerprintHash" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReferralEvent_ambassadorId_fkey" FOREIGN KEY ("ambassadorId") REFERENCES "AmbassadorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReferralEvent_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReferralEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "guidelines" TEXT NOT NULL DEFAULT 'Be respectful, constructive, and uphold HackKro community standards.',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isAnnouncement" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Microsite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "opportunityId" TEXT,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "themeTokensJson" TEXT NOT NULL DEFAULT '{}',
    "sectionsJson" TEXT NOT NULL DEFAULT '[]',
    "seoJson" TEXT NOT NULL DEFAULT '{}',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedVersion" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Microsite_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Microsite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT NOT NULL DEFAULT '',
    "dedupKey" TEXT,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'sent',
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "senderId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "segmentFilterJson" TEXT NOT NULL DEFAULT '{}',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'approved',
    "approvedBy" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageCampaign_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MessageCampaign_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "taxRatePercent" REAL NOT NULL DEFAULT 18,
    "platformFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "salesStartAt" DATETIME,
    "salesEndAt" DATETIME,
    "isTeamTicket" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TicketTier_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'percent',
    "discountValue" INTEGER NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 100,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    CONSTRAINT "Coupon_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "opportunityId" TEXT,
    "ticketTierId" TEXT,
    "bookingId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "subtotalAmount" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "platformFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'created',
    "refundPolicySnapshot" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentOrder_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'sandbox',
    "providerIntentId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "rawMetaJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "firstApproverId" TEXT,
    "secondApproverId" TEXT,
    "requiresDualApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModerationReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reasonCategory" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'flagged',
    "assigneeId" TEXT,
    "policyCode" TEXT NOT NULL DEFAULT '',
    "decisionNote" TEXT NOT NULL DEFAULT '',
    "appealNote" TEXT NOT NULL DEFAULT '',
    "appealResult" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModerationReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "slaDueAt" DATETIME NOT NULL,
    "assigneeId" TEXT,
    "subject" TEXT NOT NULL,
    "linkedResourceType" TEXT NOT NULL DEFAULT '',
    "linkedResourceId" TEXT NOT NULL DEFAULT '',
    "messagesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rolloutPercent" INTEGER NOT NULL DEFAULT 100,
    "updatedBy" TEXT NOT NULL DEFAULT 'system',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "ipRiskMeta" TEXT NOT NULL DEFAULT '{}',
    "beforeSummary" TEXT NOT NULL DEFAULT '{}',
    "afterSummary" TEXT NOT NULL DEFAULT '{}',
    "reasonCode" TEXT NOT NULL DEFAULT '',
    "approvalRef" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eventsJson" TEXT NOT NULL DEFAULT '[]',
    "secretHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpointId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "responseStatus" INTEGER,
    "lastAttemptAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobType" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT NOT NULL DEFAULT '',
    "runAfter" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventName" TEXT NOT NULL,
    "actorId" TEXT,
    "tenantId" TEXT,
    "resourceType" TEXT NOT NULL DEFAULT '',
    "resourceId" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'web',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "consentGranted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "subscribeDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FeedbackEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "additionalFeedback" TEXT NOT NULL DEFAULT '',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_primaryEmail_key" ON "User"("primaryEmail");

-- CreateIndex
CREATE UNIQUE INDEX "User_primaryPhoneE164_key" ON "User"("primaryPhoneE164");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_primaryIntent_idx" ON "User"("primaryIntent");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubject_key" ON "AuthIdentity"("provider", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordCredential_userId_key" ON "PasswordCredential"("userId");

-- CreateIndex
CREATE INDEX "OtpChallenge_destinationHash_purpose_idx" ON "OtpChallenge"("destinationHash", "purpose");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_consentType_idx" ON "ConsentRecord"("userId", "consentType");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacySettings_userId_key" ON "PrivacySettings"("userId");

-- CreateIndex
CREATE INDEX "DataExportRequest_userId_idx" ON "DataExportRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_verificationStatus_idx" ON "Organization"("verificationStatus");

-- CreateIndex
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_status_idx" ON "OrganizationMembership"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_roleKey_key" ON "OrganizationMembership"("userId", "organizationId", "roleKey");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_email_idx" ON "OrganizationInvitation"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_organizationId_key" ON "Institution"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "ResumeVersion_userId_idx" ON "ResumeVersion"("userId");

-- CreateIndex
CREATE INDEX "PortfolioProject_userId_idx" ON "PortfolioProject"("userId");

-- CreateIndex
CREATE INDEX "UserSkill_name_provenance_idx" ON "UserSkill"("name", "provenance");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_name_key" ON "UserSkill"("userId", "name");

-- CreateIndex
CREATE INDEX "PersonalTask_userId_status_idx" ON "PersonalTask"("userId", "status");

-- CreateIndex
CREATE INDEX "PersonalTask_sourceType_sourceId_idx" ON "PersonalTask"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_slug_key" ON "Opportunity"("slug");

-- CreateIndex
CREATE INDEX "Opportunity_status_visibility_idx" ON "Opportunity"("status", "visibility");

-- CreateIndex
CREATE INDEX "Opportunity_type_category_idx" ON "Opportunity"("type", "category");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");

-- CreateIndex
CREATE INDEX "Opportunity_registrationCloseAt_idx" ON "Opportunity"("registrationCloseAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityVersion_opportunityId_versionNumber_key" ON "OpportunityVersion"("opportunityId", "versionNumber");

-- CreateIndex
CREATE INDEX "EligibilityRule_opportunityId_idx" ON "EligibilityRule"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationForm_opportunityId_key" ON "RegistrationForm"("opportunityId");

-- CreateIndex
CREATE INDEX "FormField_formId_orderIndex_idx" ON "FormField"("formId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SavedOpportunity_userId_opportunityId_key" ON "SavedOpportunity"("userId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowOrganization_userId_organizationId_key" ON "FollowOrganization"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_receiptCode_key" ON "Application"("receiptCode");

-- CreateIndex
CREATE UNIQUE INDEX "Application_idempotencyKey_key" ON "Application"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Application_opportunityId_userId_idx" ON "Application"("opportunityId", "userId");

-- CreateIndex
CREATE INDEX "Application_userId_status_idx" ON "Application"("userId", "status");

-- CreateIndex
CREATE INDEX "Application_teamId_idx" ON "Application"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "FormResponse_applicationId_key" ON "FormResponse"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_applicationId_idx" ON "ApplicationStatusHistory"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_inviteToken_key" ON "Team"("inviteToken");

-- CreateIndex
CREATE INDEX "Team_opportunityId_idx" ON "Team"("opportunityId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_status_idx" ON "TeamMember"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_invitedEmail_key" ON "TeamMember"("teamId", "invitedEmail");

-- CreateIndex
CREATE INDEX "TeamTask_teamId_idx" ON "TeamTask"("teamId");

-- CreateIndex
CREATE INDEX "TeamDiscussion_teamId_idx" ON "TeamDiscussion"("teamId");

-- CreateIndex
CREATE INDEX "TeamActivityLog_teamId_idx" ON "TeamActivityLog"("teamId");

-- CreateIndex
CREATE INDEX "Round_opportunityId_roundNumber_idx" ON "Round"("opportunityId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_qrToken_key" ON "CheckIn"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_opportunityId_userId_key" ON "CheckIn"("opportunityId", "userId");

-- CreateIndex
CREATE INDEX "IncidentEvent_opportunityId_idx" ON "IncidentEvent"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");

-- CreateIndex
CREATE INDEX "FileAsset_ownerId_idx" ON "FileAsset"("ownerId");

-- CreateIndex
CREATE INDEX "Submission_opportunityId_status_idx" ON "Submission"("opportunityId", "status");

-- CreateIndex
CREATE INDEX "Submission_userId_idx" ON "Submission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionVersion_submissionId_versionNumber_key" ON "SubmissionVersion"("submissionId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_slug_key" ON "Assessment"("slug");

-- CreateIndex
CREATE INDEX "Assessment_opportunityId_idx" ON "Assessment"("opportunityId");

-- CreateIndex
CREATE INDEX "Question_assessmentId_idx" ON "Question"("assessmentId");

-- CreateIndex
CREATE INDEX "Question_topic_difficulty_idx" ON "Question"("topic", "difficulty");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_assessmentId_userId_idx" ON "AssessmentAttempt"("assessmentId", "userId");

-- CreateIndex
CREATE INDEX "ProctorSignal_attemptId_idx" ON "ProctorSignal"("attemptId");

-- CreateIndex
CREATE INDEX "Rubric_opportunityId_idx" ON "Rubric"("opportunityId");

-- CreateIndex
CREATE INDEX "JudgeAssignment_evaluatorId_status_idx" ON "JudgeAssignment"("evaluatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeAssignment_submissionId_evaluatorId_key" ON "JudgeAssignment"("submissionId", "evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_submissionId_evaluatorId_isSecondReview_key" ON "Evaluation"("submissionId", "evaluatorId", "isSecondReview");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_credentialId_key" ON "Certificate"("credentialId");

-- CreateIndex
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");

-- CreateIndex
CREATE INDEX "Certificate_credentialId_idx" ON "Certificate"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Lesson_courseId_orderIndex_idx" ON "Lesson"("courseId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeItem_slug_key" ON "PracticeItem"("slug");

-- CreateIndex
CREATE INDEX "PracticeItem_category_difficulty_idx" ON "PracticeItem"("category", "difficulty");

-- CreateIndex
CREATE INDEX "PracticeAttempt_userId_idx" ON "PracticeAttempt"("userId");

-- CreateIndex
CREATE INDEX "MockInterview_userId_idx" ON "MockInterview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorProfile_userId_key" ON "MentorProfile"("userId");

-- CreateIndex
CREATE INDEX "MentorSlot_mentorId_status_startAt_idx" ON "MentorSlot"("mentorId", "status", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_slotId_key" ON "Booking"("slotId");

-- CreateIndex
CREATE INDEX "Booking_mentorId_status_idx" ON "Booking"("mentorId", "status");

-- CreateIndex
CREATE INDEX "Booking_menteeId_status_idx" ON "Booking"("menteeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JobRequisition_opportunityId_key" ON "JobRequisition"("opportunityId");

-- CreateIndex
CREATE INDEX "JobRequisition_organizationId_status_idx" ON "JobRequisition"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateStage_applicationId_key" ON "CandidateStage"("applicationId");

-- CreateIndex
CREATE INDEX "CandidateStage_requisitionId_canonicalStage_idx" ON "CandidateStage"("requisitionId", "canonicalStage");

-- CreateIndex
CREATE INDEX "TalentPool_organizationId_idx" ON "TalentPool"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TalentPoolCandidate_poolId_userId_key" ON "TalentPoolCandidate"("poolId", "userId");

-- CreateIndex
CREATE INDEX "Interview_requisitionId_idx" ON "Interview"("requisitionId");

-- CreateIndex
CREATE INDEX "Interview_candidateId_idx" ON "Interview"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Scorecard_interviewId_interviewerId_key" ON "Scorecard"("interviewId", "interviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_applicationId_key" ON "Offer"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "AmbassadorProfile_userId_key" ON "AmbassadorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AmbassadorProfile_referralCode_key" ON "AmbassadorProfile"("referralCode");

-- CreateIndex
CREATE INDEX "ReferralEvent_ambassadorId_status_idx" ON "ReferralEvent"("ambassadorId", "status");

-- CreateIndex
CREATE INDEX "ReferralEvent_referralCode_idx" ON "ReferralEvent"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityGroup_slug_key" ON "CommunityGroup"("slug");

-- CreateIndex
CREATE INDEX "CommunityPost_groupId_isHidden_idx" ON "CommunityPost"("groupId", "isHidden");

-- CreateIndex
CREATE UNIQUE INDEX "Microsite_slug_key" ON "Microsite"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupKey_key" ON "Notification"("dedupKey");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_opportunityId_code_key" ON "Coupon"("opportunityId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_orderNumber_key" ON "PaymentOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_idempotencyKey_key" ON "PaymentOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_status_idx" ON "PaymentOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_organizationId_idx" ON "PaymentOrder"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_providerIntentId_key" ON "PaymentTransaction"("providerIntentId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");

-- CreateIndex
CREATE INDEX "Refund_orderId_status_idx" ON "Refund"("orderId", "status");

-- CreateIndex
CREATE INDEX "LedgerEntry_orderId_idx" ON "LedgerEntry"("orderId");

-- CreateIndex
CREATE INDEX "ModerationReport_status_targetType_idx" ON "ModerationReport"("status", "targetType");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_referenceId_key" ON "SupportTicket"("referenceId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_priority_idx" ON "SupportTicket"("status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "AuditEvent_action_resourceType_idx" ON "AuditEvent"("action", "resourceType");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_idx" ON "AuditEvent"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_eventId_key" ON "WebhookDelivery"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJob_idempotencyKey_key" ON "BackgroundJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_runAfter_idx" ON "BackgroundJob"("status", "runAfter");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventName_createdAt_idx" ON "AnalyticsEvent"("eventName", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

