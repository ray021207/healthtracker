-- Convert HealthProfile sensitive fields to text columns so they can hold
-- AES-256-GCM ciphertext. Existing values are cast to text here (still
-- plaintext); a follow-up data migration script (scripts/encryptHealthProfileData.ts)
-- must be run once, immediately after this migration, to overwrite them with
-- ciphertext. Array fields are JSON-encoded to text to match the app's
-- encrypt/decrypt helpers (utils/healthProfileCrypto.ts).

ALTER TABLE "HealthProfile"
  ALTER COLUMN "ldlMgDl" TYPE TEXT USING "ldlMgDl"::text,
  ALTER COLUMN "hdlMgDl" TYPE TEXT USING "hdlMgDl"::text,
  ALTER COLUMN "triglyceridesMgDl" TYPE TEXT USING "triglyceridesMgDl"::text,
  ALTER COLUMN "fastingGlucoseMgDl" TYPE TEXT USING "fastingGlucoseMgDl"::text,
  ALTER COLUMN "hba1cPercent" TYPE TEXT USING "hba1cPercent"::text,
  ALTER COLUMN "systolicBp" TYPE TEXT USING "systolicBp"::text,
  ALTER COLUMN "diastolicBp" TYPE TEXT USING "diastolicBp"::text,
  ALTER COLUMN "allergies" TYPE TEXT USING array_to_json("allergies")::text,
  ALTER COLUMN "medicalConditions" TYPE TEXT USING array_to_json("medicalConditions")::text,
  ALTER COLUMN "medications" TYPE TEXT USING array_to_json("medications")::text;
