/**
 * Encryption layer — placeholder. No end-to-end encryption exists yet.
 *
 * These helpers are identity pass-throughs: encryptMessage returns its input
 * unchanged and decryptMessage returns its input unchanged. Messages are
 * currently stored and transmitted as plaintext over TLS. Nothing here
 * encrypts message content, derives keys, or manages key material.
 *
 * ALL message content flows through these helpers so a real end-to-end
 * encryption scheme (e.g. libsodium / Signal protocol) can be dropped in
 * here without touching UI or data-access code. Until that lands, no copy
 * in the app may claim messages are end-to-end encrypted.
 */

export async function encryptMessage(plaintext: string, _receiverPublicKey?: string | null): Promise<string> {
  // TODO: replace with real asymmetric encryption using receiver's public_key.
  return plaintext;
}

export async function decryptMessage(ciphertext: string): Promise<string> {
  // TODO: replace with real decryption using local private key.
  return ciphertext;
}
