import {
  createHash,
  createPublicKey,
  randomBytes,
  verify,
  type KeyObject,
} from 'node:crypto';

export const VISITOR_TIMESTAMP_SKEW_SECONDS = 60;
export const VISITOR_CHALLENGE_TTL_SECONDS = 300;
export const VISITOR_REPLAY_TTL_SECONDS = 120;

export function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function buildRequestCanonical(
  method: string,
  pathWithQuery: string,
  timestamp: string,
  bodyHashHex: string,
): string {
  return `${method.toUpperCase()}\n${pathWithQuery}\n${timestamp}\n${bodyHashHex}`;
}

export function generateChallenge(): string {
  return randomBytes(32).toString('hex');
}

export function parseSpkiPublicKey(publicKeyBase64: string): KeyObject {
  const der = Buffer.from(publicKeyBase64, 'base64');
  if (der.length < 50 || der.length > 512) {
    throw new Error('publicKey inválida');
  }

  return createPublicKey({
    key: der,
    format: 'der',
    type: 'spki',
  });
}

export function verifyEcdsaP256Sha256(
  publicKey: KeyObject,
  message: string,
  signatureBase64: string,
): boolean {
  const signature = Buffer.from(signatureBase64, 'base64');
  if (signature.length === 0) {
    return false;
  }

  return verify(
    'SHA256',
    Buffer.from(message, 'utf8'),
    { key: publicKey, dsaEncoding: 'ieee-p1363' },
    signature,
  );
}

export function isTimestampFresh(
  timestampSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  return Math.abs(nowSeconds - timestampSeconds) <= VISITOR_TIMESTAMP_SKEW_SECONDS;
}
