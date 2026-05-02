/**
 * Encryption layer — placeholder.
 *
 * Veil treats every message as encrypted on the wire. Right now these helpers
 * are pass-through, but ALL message content flows through them so a real
 * end-to-end encryption scheme (e.g. libsodium / Signal protocol) can be
 * dropped in here without touching UI or data-access code.
 *
 * Plaintext NEVER appears on a `message` field — only `encrypted_message`.
 */

export async function encryptMessage(plaintext: string, _receiverPublicKey?: string | null): Promise<string> {
  // TODO: replace with real asymmetric encryption using receiver's public_key.
  return plaintext;
}

export async function decryptMessage(ciphertext: string): Promise<string> {
  // TODO: replace with real decryption using local private key.
  return ciphertext;
}
