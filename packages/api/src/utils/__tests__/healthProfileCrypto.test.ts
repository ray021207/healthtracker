import { describe, expect, it } from "vitest";

import { decryptHealthProfileFields, encryptHealthProfileFields } from "../healthProfileCrypto.js";

const plainInput = {
  ldlMgDl: 145,
  hdlMgDl: 48,
  triglyceridesMgDl: 173,
  fastingGlucoseMgDl: 102,
  hba1cPercent: 6.2,
  systolicBp: 132,
  diastolicBp: 83,
  allergies: ["Peanut", "Shellfish"],
  medicalConditions: ["Prediabetes"],
  medications: ["Metformin"],
};

describe("healthProfileCrypto", () => {
  it("encrypts numeric and array fields to ciphertext strings", () => {
    const encrypted = encryptHealthProfileFields(plainInput);
    expect(encrypted.ldlMgDl).not.toBe("145");
    expect(typeof encrypted.ldlMgDl).toBe("string");
    expect(encrypted.allergies).not.toContain("Peanut");
  });

  it("round-trips through encrypt then decrypt", () => {
    const encrypted = encryptHealthProfileFields(plainInput);
    const decrypted = decryptHealthProfileFields(encrypted);
    expect(decrypted.ldlMgDl).toBe(145);
    expect(decrypted.hdlMgDl).toBe(48);
    expect(decrypted.systolicBp).toBe(132);
    expect(decrypted.allergies).toEqual(["Peanut", "Shellfish"]);
    expect(decrypted.medicalConditions).toEqual(["Prediabetes"]);
    expect(decrypted.medications).toEqual(["Metformin"]);
  });

  it("handles null/undefined optional numeric fields", () => {
    const encrypted = encryptHealthProfileFields({
      ...plainInput,
      ldlMgDl: null,
      hdlMgDl: undefined,
    });
    expect(encrypted.ldlMgDl).toBeNull();
    expect(encrypted.hdlMgDl).toBeNull();

    const decrypted = decryptHealthProfileFields(encrypted);
    expect(decrypted.ldlMgDl).toBeNull();
    expect(decrypted.hdlMgDl).toBeNull();
  });

  it("handles empty arrays", () => {
    const encrypted = encryptHealthProfileFields({ ...plainInput, allergies: [], medications: [] });
    const decrypted = decryptHealthProfileFields(encrypted);
    expect(decrypted.allergies).toEqual([]);
    expect(decrypted.medications).toEqual([]);
  });
});
