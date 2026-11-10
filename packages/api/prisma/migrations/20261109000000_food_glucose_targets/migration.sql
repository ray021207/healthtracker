-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "PlateCategory" AS ENUM ('NONSTARCHY_VEG', 'PROTEIN', 'CARB', 'FAT_OTHER', 'DRINK');

-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('MANUAL', 'AI_TEXT', 'AI_PHOTO');

-- CreateEnum
CREATE TYPE "GlucoseContext" AS ENUM ('FASTING', 'BEFORE_MEAL', 'AFTER_MEAL', 'BEDTIME', 'OTHER');

-- AlterTable
ALTER TABLE "HealthProfile" ADD COLUMN     "abdomenIn" TEXT,
ADD COLUMN     "clinicianNotes" TEXT,
ADD COLUMN     "targetsOverridden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FoodEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proteinG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plateCategory" "PlateCategory" NOT NULL,
    "volumeCups" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" "FoodSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlucoseReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "valueMgDl" TEXT NOT NULL,
    "context" "GlucoseContext" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlucoseReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodEntry_patientId_logDate_idx" ON "FoodEntry"("patientId", "logDate");

-- CreateIndex
CREATE INDEX "GlucoseReading_patientId_logDate_idx" ON "GlucoseReading"("patientId", "logDate");

-- AddForeignKey
ALTER TABLE "FoodEntry" ADD CONSTRAINT "FoodEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlucoseReading" ADD CONSTRAINT "GlucoseReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

