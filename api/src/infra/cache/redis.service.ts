import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';

import { Redis } from 'ioredis';


@Injectable()
export class RedisService
    implements OnModuleInit, OnModuleDestroy {


    private readonly logger =
        new Logger(RedisService.name);


    private client: Redis;


    constructor() {

        this.client = new Redis({

            host: process.env.REDIS_HOST,

            port: Number(
                process.env.REDIS_PORT ?? 6379
            ),

            password:
                process.env.REDIS_PASSWORD || undefined,

            maxRetriesPerRequest: 3,

        });

    }


    async onModuleInit() {

        await this.client.ping();

        this.logger.log(
            'Redis conectado: OK'
        );

    }


    async onModuleDestroy() {

        await this.client.quit();

        this.logger.log(
            'Redis desconectado'
        );

    }


    getClient(): Redis {

        return this.client;

    }


    async set(
        key: string,
        value: string,
        ttl?: number
    ) {

        if (ttl) {

            return this.client.set(
                key,
                value,
                'EX',
                ttl
            );

        }


        return this.client.set(
            key,
            value
        );

    }


    async get<T = string>(
        key: string
    ): Promise<T | null> {


        const value =
            await this.client.get(key);


        if (!value) {
            return null;
        }


        return value as T;

    }


    async delete(
        key: string
    ) {

        return this.client.del(key);

    }


}