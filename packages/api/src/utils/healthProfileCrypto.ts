import { decrypt, encrypt } from "./encryption.js";

export interface HealthProfilePlainInput {
  ldlMgDl?: number | null;
  hdlMgDl?: number | null;
  triglyceridesMgDl?: number | null;
  fastingGlucoseMgDl?: number | null;
  hba1cPercent?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  allergies: string[];
  medicalConditions: string[];
  medications: string[];
}

export interface HealthProfileEncryptedFields {
  ldlMgDl: string | null;
  hdlMgDl: string | null;
  triglyceridesMgDl: string | null;
  fastingGlucoseMgDl: string | null;
  hba1cPercent: string | null;
  systolicBp: string | null;
  diastolicBp: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
}

const encryptNumber = (value: number | null | undefined): string | null =>
  value === null || value === undefined ? null : encrypt(String(value));

const decryptNumber = (value: string | null | undefined): number | null =>
  value === null || value === undefined ? null : Number(decrypt(value));

const encryptStringArray = (values: string[]): string => encrypt(JSON.stringify(values ?? []));

const decryptStringArray = (value: string | null | undefined): string[] =>
  value === null || value === undefined ? [] : (JSON.parse(decrypt(value)) as string[]);

export function encryptHealthProfileFields(input: HealthProfilePlainInput): HealthProfileEncryptedFields {
  return {
    ldlMgDl: encryptNumber(input.ldlMgDl),
    hdlMgDl: encryptNumber(input.hdlMgDl),
    triglyceridesMgDl: encryptNumber(input.triglyceridesMgDl),
    fastingGlucoseMgDl: encryptNumber(input.fastingGlucoseMgDl),
    hba1cPercent: encryptNumber(input.hba1cPercent),
    systolicBp: encryptNumber(input.systolicBp),
    diastolicBp: encryptNumber(input.diastolicBp),
    allergies: encryptStringArray(input.allergies),
    medicalConditions: encryptStringArray(input.medicalConditions),
    medications: encryptStringArray(input.medications),
  };
}

export function decryptHealthProfileFields<T extends HealthProfileEncryptedFields>(
  record: T,
): Omit<T, keyof HealthProfileEncryptedFields> & HealthProfilePlainInput {
  return {
    ...record,
    ldlMgDl: decryptNumber(record.ldlMgDl),
    hdlMgDl: decryptNumber(record.hdlMgDl),
    triglyceridesMgDl: decryptNumber(record.triglyceridesMgDl),
    fastingGlucoseMgDl: decryptNumber(record.fastingGlucoseMgDl),
    hba1cPercent: decryptNumber(record.hba1cPercent),
    systolicBp: decryptNumber(record.systolicBp),
    diastolicBp: decryptNumber(record.diastolicBp),
    allergies: decryptStringArray(record.allergies),
    medicalConditions: decryptStringArray(record.medicalConditions),
    medications: decryptStringArray(record.medications),
  };
}
