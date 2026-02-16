import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Key should be 32 bytes for AES-256
  return scryptSync(key, "salt", 32);
}

export function encryptToken(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted (all hex)
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("[Encryption] Error encrypting token:", error);
    throw new Error("Failed to encrypt token");
  }
}

export function decryptToken(encrypted: string): string {
  if (!encrypted || !encrypted.includes(":")) return encrypted;

  try {
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      // Not encrypted with our format, return as-is
      return encrypted;
    }

    const [ivHex, tagHex, encryptedText] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[Encryption] Error decrypting token:", error);
    // If decryption fails, return original (might be old unencrypted token)
    return encrypted;
  }
}
