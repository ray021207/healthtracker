import "dotenv/config";

import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clinicEmail = "demo-clinic@monarkhealth.com";
  const adminEmail = "admin@monarkhealth.com";
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

  const clinic = await prisma.clinic.upsert({
    where: { email: clinicEmail },
    update: {
      name: "Monark Demo Clinic",
      address: "101 Wellness Avenue, Springfield",
      phone: "+1-555-0102",
    },
    create: {
      name: "Monark Demo Clinic",
      address: "101 Wellness Avenue, Springfield",
      phone: "+1-555-0102",
      email: clinicEmail,
    },
  });

  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      clinicId: clinic.id,
      passwordHash,
      firstName: "Clinic",
      lastName: "Admin",
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      clinicId: clinic.id,
      email: adminEmail,
      passwordHash,
      firstName: "Clinic",
      lastName: "Admin",
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const patientEmail = "patient@monarkhealth.com";
  const patientPassword = "Patient@12345";
  const patientHash = await bcrypt.hash(patientPassword, 12);

  await prisma.patient.upsert({
    where: { email: patientEmail },
    update: {
      clinicId: clinic.id,
      passwordHash: patientHash,
      firstName: "Demo",
      lastName: "Patient",
      isActive: true,
    },
    create: {
      clinicId: clinic.id,
      email: patientEmail,
      passwordHash: patientHash,
      firstName: "Demo",
      lastName: "Patient",
      dateOfBirth: new Date("1990-06-15"),
      gender: "FEMALE",
      isActive: true,
    },
  });

  // Seed output avoids any PHI and only includes non-sensitive account identifiers.
  console.log("Seed complete for clinic email:", clinicEmail);
  console.log("Seed complete for admin email:", adminEmail);
  console.log("Seed complete for patient email:", patientEmail);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
