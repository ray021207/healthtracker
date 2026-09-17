import { describe, expect, it } from "vitest";

import { decrypt, encrypt } from "../encryption.js";

describe("encryption", () => {
  it("round-trips a plaintext string", () => {
    const ciphertext = encrypt("145");
    expect(ciphertext).not.toBe("145");
    expect(decrypt(ciphertext)).toBe("145");
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encrypt("hello");
    const b = encrypt("hello");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("hello");
    expect(decrypt(b)).toBe("hello");
  });

  it("rejects a tampered ciphertext", () => {
    const [iv, tag, ct] = encrypt("secret").split(":");
    const tampered = `${iv}:${tag}:${ct?.slice(0, -2)}AA`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws on a malformed payload", () => {
    expect(() => decrypt("not-a-valid-payload")).toThrow("Malformed encrypted payload");
  });
});
