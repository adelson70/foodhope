import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class ImpressoraService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImpressoraService.name);
  private conexaoImpressora: any;

  async onModuleInit() {
    this.logger.log('Iniciando comunicação com a impressora...');
    try {
      this.logger.log('Impressora conectada com sucesso!');
    } catch (error) {
      this.logger.error('Falha ao conectar com a impressora no boot do sistema', error);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Encerrando conexão com a impressora...');
    if (this.conexaoImpressora) {
      // await this.conexaoImpressora.disconnect();
    }
  }

  async print(dto: any) {
    this.logger.log("Imprimindo...")
  }
}