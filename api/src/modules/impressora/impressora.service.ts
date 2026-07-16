import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';

@Injectable()
export class ImpressoraService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImpressoraService.name);
  private impressora: ThermalPrinter;

  async onModuleInit() {
    this.logger.log('Iniciando comunicação com a impressora...');

    try {
      const printerIp = process.env.IP_IMPRESSORA;

      if (!printerIp) {
        this.logger.warn(
          'IP da impressora não configurado no .env (IP_IMPRESSORA). A impressão será ignorada.',
        );
        return;
      }

      this.impressora = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: `tcp://${printerIp}`,
        characterSet: CharacterSet.PC860_PORTUGUESE,
        removeSpecialCharacters: true,
        breakLine: BreakLine.WORD,
      });

      const isConnected = await this.impressora.isPrinterConnected();

      if (isConnected) {
        this.logger.log(`Impressora conectada com sucesso no IP: ${printerIp}`);
      } else {
        this.logger.error(
          `A impressora no IP ${printerIp} não está respondendo. Verifique se ela está ligada e na mesma rede.`,
        );
      }
    } catch (error) {
      this.logger.error('Falha ao configurar a impressora no boot do sistema', error);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Encerrando módulo de impressão...');
  }

  async print(textoFormatado: string) {
    if (!this.impressora) {
      this.logger.warn('Impressão abortada: Impressora não configurada ou não instanciada.');
      return;
    }

    this.logger.log('Enviando dados para a impressora...');

    try {
      this.impressora.println(textoFormatado);

      this.impressora.cut();

      await this.impressora.execute();

      this.impressora.clear();

      this.logger.log('Impressão concluída com sucesso!');
    } catch (error) {
      this.logger.error('Erro durante a impressão do cupom:', error);

      this.impressora.clear();

      throw error
    }
  }
}
