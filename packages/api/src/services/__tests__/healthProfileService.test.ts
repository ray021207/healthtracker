import type { HealthProfile } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { decryptHealthProfileFields } from "../../utils/healthProfileCrypto.js";
import { buildHealthProfileData, calculateAutoTargets, type HealthProfileInput } from "../healthProfileService.js";

const patient = { dateOfBirth: new Date("1985-05-05"), gender: "FEMALE" as const };

const input: HealthProfileInput = {
  heightCm: 170,
  weightKg: 190, // lb
  isDiabetic: false,
  activityLevel: "LIGHTLY_ACTIVE",
  dietStyle: "BALANCED",
  dietaryRestrictions: [],
  includeAyurvedic: false,
  includeAntiInflammatory: false,
  allergies: [],
  medicalConditions: [],
  medications: [],
};

const custom = { dailyCalorieTarget: 1650, dailyProteinG: 120, dailyCarbsG: 150, dailyFatG: 55 };

// Round-trips through the same encrypt/decrypt used by the routes.
const asStoredProfile = (data: ReturnType<typeof buildHealthProfileData>) =>
  ({ id: "p1", patientId: "x", createdAt: new Date(), updatedAt: new Date(), ...data }) as unknown as HealthProfile;

describe("buildHealthProfileData", () => {
  it("uses the automatic targets when nothing is overridden", () => {
    const data = buildHealthProfileData({ input, patient, existing: null });
    const auto = calculateAutoTargets(input, patient).targets;
    expect(data.targetsOverridden).toBe(false);
    expect(data.dailyCalorieTarget).toBe(auto.dailyCalorieTarget);
    expect(data.dailyProteinG).toBe(auto.dailyProteinG);
  });

  it("stores a clinician override and flags it", () => {
    const data = buildHealthProfileData({ input, patient, existing: null, targetsChange: custom });
    expect(data).toMatchObject({ targetsOverridden: true, ...custom });
  });

  it("keeps an override across a later edit that carries no targets (e.g. the patient editing their profile)", () => {
    const existing = asStoredProfile(buildHealthProfileData({ input, patient, existing: null, targetsChange: custom }));
    const next = buildHealthProfileData({ input: { ...input, weightKg: 180 }, patient, existing });
    expect(next).toMatchObject({ targetsOverridden: true, ...custom });
  });

  it("returns to automatic targets when the override is reset with null", () => {
    const existing = asStoredProfile(buildHealthProfileData({ input, patient, existing: null, targetsChange: custom }));
    const next = buildHealthProfileData({ input, patient, existing, targetsChange: null });
    expect(next.targetsOverridden).toBe(false);
    expect(next.dailyCalorieTarget).toBe(calculateAutoTargets(input, patient).targets.dailyCalorieTarget);
  });

  it("encrypts abdomen and recommendations, and preserves them when the writer does not send them", () => {
    const withExtras = buildHealthProfileData({
      input: { ...input, abdomenIn: 38.5, clinicianNotes: "Prefer a high-fibre breakfast" },
      patient,
      existing: null,
    });
    expect(withExtras.abdomenIn).not.toContain("38.5");
    expect(withExtras.clinicianNotes).not.toContain("fibre");

    const existing = asStoredProfile(withExtras);
    expect(decryptHealthProfileFields(existing)).toMatchObject({ abdomenIn: 38.5, clinicianNotes: "Prefer a high-fibre breakfast" });

    // patient self-edit: fields undefined -> unchanged
    const afterPatientEdit = asStoredProfile(buildHealthProfileData({ input, patient, existing }));
    expect(decryptHealthProfileFields(afterPatientEdit)).toMatchObject({ abdomenIn: 38.5, clinicianNotes: "Prefer a high-fibre breakfast" });

    // admin clears them with null
    const cleared = asStoredProfile(
      buildHealthProfileData({ input: { ...input, abdomenIn: null, clinicianNotes: null }, patient, existing }),
    );
    expect(decryptHealthProfileFields(cleared)).toMatchObject({ abdomenIn: null, clinicianNotes: null });
  });
});
