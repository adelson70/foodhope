import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  BreakLine,
  CharacterSet,
  PrinterTypes,
  ThermalPrinter,
} from 'node-thermal-printer';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { ConfigurarImpressoraDto } from './dto/configurar.dto.js';

const CONFIG_ID = 'default';

@Injectable()
export class ImpressoraService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImpressoraService.name);
  private impressora: ThermalPrinter | null = null;

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async onModuleInit() {
    this.logger.log('Iniciando comunicação com a impressora...');

    try {
      const ip = await this.resolverIpInicial();

      if (!ip) {
        this.logger.warn(
          'IP da impressora não configurado. Configure em Configurações > Impressora.',
        );
        return;
      }

      await this.reconfigurar(ip);
    } catch (error) {
      this.logger.error('Falha ao configurar a impressora no boot do sistema', error);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Encerrando módulo de impressão...');
  }

  async obter() {
    try {
      const config = await this.prismaRead.configImpressora.findUnique({
        where: { id: CONFIG_ID },
        select: { ip: true },
      });

      return { dados: { ip: config?.ip ?? null } };
    } catch (erro) {
      this.logger.error('Erro ao obter config da impressora', erro);
      throw new InternalServerErrorException(
        'Não foi possível carregar a configuração da impressora.',
      );
    }
  }

  async testar(dto: ConfigurarImpressoraDto) {
    const ip = dto.ip.trim();
    const conectada = await this.verificarConexao(ip);

    if (!conectada) {
      throw new BadRequestException(
        'A impressora não está respondendo. Verifique o IP, se ela está ligada e na mesma rede.',
      );
    }

    return {
      mensagem: 'Conexão com a impressora OK',
      dados: { conectada: true, ip },
    };
  }

  async salvar(dto: ConfigurarImpressoraDto) {
    const ip = dto.ip.trim();
    const conectada = await this.verificarConexao(ip);

    if (!conectada) {
      throw new BadRequestException(
        'Não foi possível salvar: a impressora não está respondendo neste IP.',
      );
    }

    try {
      const config = await this.prismaWrite.configImpressora.upsert({
        where: { id: CONFIG_ID },
        create: { id: CONFIG_ID, ip },
        update: { ip },
      });

      await this.reconfigurar(config.ip);

      return {
        mensagem: 'Impressora configurada com sucesso',
        dados: { ip: config.ip },
      };
    } catch (erro) {
      if (erro instanceof BadRequestException) throw erro;
      this.logger.error('Erro ao salvar config da impressora', erro);
      throw new InternalServerErrorException(
        'Não foi possível salvar a configuração da impressora.',
      );
    }
  }

  async reconfigurar(ip: string) {
    const impressora = this.criarInstancia(ip);
    const conectada = await impressora.isPrinterConnected();

    this.impressora = impressora;

    if (conectada) {
      this.logger.debug(`Impressora conectada com sucesso no IP: ${ip}`);
    } else {
      this.logger.error(
        `A impressora no IP ${ip} não está respondendo. Verifique se ela está ligada e na mesma rede.`,
      );
    }
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
      throw error;
    }
  }

  estaConfigurada(): boolean {
    return this.impressora !== null;
  }

  private async resolverIpInicial(): Promise<string | null> {
    const config = await this.prismaRead.configImpressora.findUnique({
      where: { id: CONFIG_ID },
      select: { ip: true },
    });

    if (config?.ip) {
      return config.ip;
    }

    const envIp = process.env.IP_IMPRESSORA?.trim();
    if (!envIp) {
      return null;
    }

    await this.prismaWrite.configImpressora.create({
      data: { id: CONFIG_ID, ip: envIp },
    });

    this.logger.log(
      `IP da impressora migrado do .env para o banco (${envIp}).`,
    );

    return envIp;
  }

  private criarInstancia(ip: string) {
    return new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `tcp://${ip}`,
      characterSet: CharacterSet.PC860_PORTUGUESE,
      removeSpecialCharacters: true,
      breakLine: BreakLine.WORD,
    });
  }

  private async verificarConexao(ip: string): Promise<boolean> {
    try {
      const impressora = this.criarInstancia(ip);
      return await impressora.isPrinterConnected();
    } catch (error) {
      this.logger.error(`Falha ao testar impressora em ${ip}`, error);
      return false;
    }
  }
}
