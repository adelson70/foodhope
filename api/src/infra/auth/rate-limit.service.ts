import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { RedisService } from '../cache/redis.service.js';

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<void> {
    const count = await this.redis.incrWithTtl(key, windowSeconds);

    if (count > limit) {
      throw new HttpException(
        'Muitas requisições. Tente novamente em instantes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
