// One-time data migration: encrypts plaintext values left in the HealthProfile
// sensitive columns by the 20260917134004_encrypt_health_profile_fields schema
// migration. Safe to re-run — already-encrypted values (colon-delimited
// iv:authTag:ciphertext) are detected and skipped.
import { prisma } from "../src/lib/prisma.js";
import { encrypt } from "../src/utils/encryption.js";

const isAlreadyEncrypted = (value: string | null): boolean =>
  value !== null && value.split(":").length === 3;

async function main() {
  const profiles = await prisma.healthProfile.findMany();
  let updated = 0;

  for (const profile of profiles) {
    const data: Record<string, string | null> = {};

    for (const field of [
      "ldlMgDl",
      "hdlMgDl",
      "triglyceridesMgDl",
      "fastingGlucoseMgDl",
      "hba1cPercent",
      "systolicBp",
      "diastolicBp",
    ] as const) {
      const value = profile[field];
      if (value !== null && !isAlreadyEncrypted(value)) {
        data[field] = encrypt(value);
      }
    }

    for (const field of ["allergies", "medicalConditions", "medications"] as const) {
      const value = profile[field];
      if (value !== null && !isAlreadyEncrypted(value)) {
        // Plaintext value at this point is JSON (from the schema migration's array_to_json cast).
        data[field] = encrypt(value);
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.healthProfile.update({ where: { id: profile.id }, data });
      updated += 1;
    }
  }

  console.log(`Encrypted ${updated}/${profiles.length} HealthProfile row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
