import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import {
  generateChallenge,
  parseSpkiPublicKey,
  verifyEcdsaP256Sha256,
  VISITOR_CHALLENGE_TTL_SECONDS,
} from '../../infra/auth/visitor-crypto.js';
import { ConfirmVisitorDto } from './dto/confirm.dto.js';
import { RegisterVisitorDto } from './dto/register.dto.js';

@Injectable()
export class VisitorService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async register(dto: RegisterVisitorDto) {
    try {
      parseSpkiPublicKey(dto.publicKey);
    } catch {
      throw new BadRequestException('Chave pública inválida');
    }

    const challenge = generateChallenge();
    const challengeExpiresAt = new Date(
      Date.now() + VISITOR_CHALLENGE_TTL_SECONDS * 1000,
    );

    const visitor = await this.prismaWrite.visitor.create({
      data: {
        publicKey: dto.publicKey,
        challenge,
        challengeExpiresAt,
        verified: false,
      },
    });

    return {
      dados: {
        visitorId: visitor.id,
        challenge,
      },
    };
  }

  async confirm(dto: ConfirmVisitorDto) {
    const visitor = await this.prismaRead.visitor.findUnique({
      where: { id: dto.visitorId },
    });

    if (!visitor || !visitor.challenge || !visitor.challengeExpiresAt) {
      throw new UnauthorizedException('Operação não autorizada');
    }

    if (visitor.verified) {
      throw new BadRequestException('Visitor já confirmado');
    }

    if (visitor.challengeExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Challenge expirado');
    }

    let publicKey;
    try {
      publicKey = parseSpkiPublicKey(visitor.publicKey);
    } catch {
      throw new UnauthorizedException('Operação não autorizada');
    }

    const valid = verifyEcdsaP256Sha256(
      publicKey,
      visitor.challenge,
      dto.signature,
    );

    if (!valid) {
      throw new UnauthorizedException('Operação não autorizada');
    }

    await this.prismaWrite.visitor.update({
      where: { id: visitor.id },
      data: {
        verified: true,
        challenge: null,
        challengeExpiresAt: null,
      },
    });

    return {
      dados: {
        visitorId: visitor.id,
        verified: true,
      },
    };
  }
}
