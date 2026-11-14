import type { RegisterQueueOptions } from '@nestjs/bullmq';

/**
 * Cada BullModule.registerQueue cria a própria instância da fila; as opções precisam estar em
 * todos os registros, senão o job sai com attempts 0 (sem nenhuma nova tentativa).
 * 10 tentativas exponenciais a partir de 5 s (~40 min no total): uma queda da ponte ESP32 ou
 * da impressora não perde comanda.
 */
export const FILA_IMPRESSAO: RegisterQueueOptions = {
  name: 'fila-impressao',
  defaultJobOptions: {
    attempts: 10,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
};
