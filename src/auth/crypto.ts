import * as Crypto from 'expo-crypto';

const ITERATIONS = 5000;

/** 16 random bytes as a hex string. */
export async function makeSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Salted, iterated SHA-256. Deterministic for the same (secret, salt), so a
 * login can re-hash and compare. Never store or return the plaintext secret.
 */
export async function hashSecret(secret: string, salt: string): Promise<string> {
  let digest = `${salt}:${secret}`;
  for (let i = 0; i < ITERATIONS; i++) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, digest);
  }
  return digest;
}
