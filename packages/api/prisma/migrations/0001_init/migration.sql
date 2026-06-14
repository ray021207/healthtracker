CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PATIENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE');

-- CreateEnum
CREATE TYPE "DietStyle" AS ENUM ('MEDITERRANEAN', 'KETO', 'LOW_CARB', 'LOW_CHOLESTEROL', 'VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'INDIAN', 'INDIAN_VEGETARIAN', 'INDIAN_VEGAN', 'DIABETIC_FRIENDLY', 'BALANCED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'VIEW_PATIENT', 'CREATE_PATIENT', 'UPDATE_PATIENT', 'VIEW_HEALTH_PROFILE', 'UPDATE_HEALTH_PROFILE', 'GENERATE_PLAN', 'VIEW_PLAN', 'EXPORT_PDF', 'UPDATE_DAILY_LOG', 'REVOKE_ACCESS');

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "targetWeightKg" DOUBLE PRECISION NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "ldlMgDl" DOUBLE PRECISION,
    "hdlMgDl" DOUBLE PRECISION,
    "triglyceridesMgDl" DOUBLE PRECISION,
    "fastingGlucoseMgDl" DOUBLE PRECISION,
    "hba1cPercent" DOUBLE PRECISION,
    "isDiabetic" BOOLEAN NOT NULL DEFAULT false,
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "activityLevel" "ActivityLevel" NOT NULL,
    "dietStyle" "DietStyle" NOT NULL,
    "dietaryRestrictions" TEXT[],
    "allergies" TEXT[],
    "medicalConditions" TEXT[],
    "medications" TEXT[],
    "includeAyurvedic" BOOLEAN NOT NULL DEFAULT false,
    "includeAntiInflammatory" BOOLEAN NOT NULL DEFAULT false,
    "bmr" DOUBLE PRECISION NOT NULL,
    "tdee" DOUBLE PRECISION NOT NULL,
    "dailyCalorieTarget" DOUBLE PRECISION NOT NULL,
    "dailyProteinG" DOUBLE PRECISION NOT NULL,
    "dailyCarbsG" DOUBLE PRECISION NOT NULL,
    "dailyFatG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regeneratedAt" TIMESTAMP(3),
    "generatedBy" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalDays" INTEGER NOT NULL DEFAULT 90,
    "startDate" TIMESTAMP(3) NOT NULL,
    "aiModel" TEXT NOT NULL,
    "dietPlan" JSONB NOT NULL,
    "exercisePlan" JSONB NOT NULL,
    "ayurvedicNotes" JSONB,
    "dietPdfPath" TEXT,
    "exercisePdfPath" TEXT,

    CONSTRAINT "GeneratedPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "breakfastDone" BOOLEAN NOT NULL DEFAULT false,
    "lunchDone" BOOLEAN NOT NULL DEFAULT false,
    "dinnerDone" BOOLEAN NOT NULL DEFAULT false,
    "snack1Done" BOOLEAN NOT NULL DEFAULT false,
    "snack2Done" BOOLEAN NOT NULL DEFAULT false,
    "waterLitres" DOUBLE PRECISION,
    "mealNotes" TEXT,
    "exerciseDone" BOOLEAN NOT NULL DEFAULT false,
    "exerciseDuration" INTEGER,
    "exerciseNotes" TEXT,
    "weightKg" DOUBLE PRECISION,
    "energyLevel" INTEGER,
    "mood" INTEGER,
    "syncedAt" TIMESTAMP(3),
    "createdOffline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "adminId" TEXT,
    "patientId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" "Role" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_email_key" ON "Clinic"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_patientId_key" ON "HealthProfile"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedPlan_patientId_key" ON "GeneratedPlan"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_patientId_logDate_key" ON "DailyLog"("patientId", "logDate");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_userRole_idx" ON "RefreshToken"("userId", "userRole");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPlan" ADD CONSTRAINT "GeneratedPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

