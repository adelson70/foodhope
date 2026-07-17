import { UnauthorizedException } from '@nestjs/common';

import { PrismaReadService } from '../database/prisma-read.service.js';
import { RedisService } from '../cache/redis.service.js';
import {
  buildRequestCanonical,
  isTimestampFresh,
  parseSpkiPublicKey,
  sha256Hex,
  verifyEcdsaP256Sha256,
  VISITOR_REPLAY_TTL_SECONDS,
} from './visitor-crypto.js';

export const SOCKET_VISITOR_METHOD = 'GET';
export const SOCKET_VISITOR_PATH = '/socket.io/';

export type VisitorAuthResult = { tipo: 'visitor'; id: string };

export async function validateVisitorCredentials(params: {
  visitorId: string;
  timestamp: string;
  signature: string;
  method: string;
  pathWithQuery: string;
  bodyHashHex: string;
  prismaRead: PrismaReadService;
  redis: RedisService;
}): Promise<VisitorAuthResult> {
  const {
    visitorId,
    timestamp,
    signature,
    method,
    pathWithQuery,
    bodyHashHex,
    prismaRead,
    redis,
  } = params;

  if (!visitorId || !timestamp || !signature) {
    throw new UnauthorizedException('Operação não autorizada');
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || !isTimestampFresh(timestampSeconds)) {
    throw new UnauthorizedException('Operação não autorizada');
  }

  const visitor = await prismaRead.visitor.findUnique({
    where: { id: visitorId },
  });

  if (!visitor || !visitor.verified) {
    throw new UnauthorizedException('Operação não autorizada');
  }

  let publicKey;
  try {
    publicKey = parseSpkiPublicKey(visitor.publicKey);
  } catch {
    throw new UnauthorizedException('Operação não autorizada');
  }

  const canonical = buildRequestCanonical(
    method,
    pathWithQuery,
    timestamp,
    bodyHashHex,
  );

  const valid = verifyEcdsaP256Sha256(publicKey, canonical, signature);
  if (!valid) {
    throw new UnauthorizedException('Operação não autorizada');
  }

  const replayKey = `sig:${visitorId}:${timestamp}:${sha256Hex(signature)}`;
  const stored = await redis.setNx(
    replayKey,
    '1',
    VISITOR_REPLAY_TTL_SECONDS,
  );

  if (!stored) {
    throw new UnauthorizedException('Operação não autorizada');
  }

  return { tipo: 'visitor', id: visitor.id };
}

export async function validateVisitorSocketAuth(params: {
  visitorId: string;
  timestamp: string;
  signature: string;
  prismaRead: PrismaReadService;
  redis: RedisService;
}): Promise<VisitorAuthResult> {
  return validateVisitorCredentials({
    ...params,
    method: SOCKET_VISITOR_METHOD,
    pathWithQuery: SOCKET_VISITOR_PATH,
    bodyHashHex: sha256Hex(''),
  });
}
