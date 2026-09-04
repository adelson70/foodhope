import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { readdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BreakLine,
  CharacterSet,
  PrinterTypes,
  ThermalPrinter,
} from 'node-thermal-printer';

import { PrismaReadService } from '../../infra/database/prisma-read.service.js';
import { PrismaWriteService } from '../../infra/database/prisma-write.service.js';
import { ConfigurarImpressoraDto } from './dto/configurar.dto.js';
import {
  MARCA_BANNER_ABRE,
  MARCA_BANNER_FECHA,
  MARCA_BIG_ABRE,
  MARCA_BIG_FECHA,
  MARCA_CENTER_ABRE,
  MARCA_CENTER_FECHA,
  MARCA_ITEM_ABRE,
  MARCA_ITEM_FECHA,
  MARCA_META_ABRE,
  MARCA_META_FECHA,
  MARCA_OBS_ABRE,
  MARCA_OBS_FECHA,
  MARCA_TOTAL_ABRE,
  MARCA_TOTAL_FECHA,
} from './impressao-texto.js';

const CONFIG_ID = 'default';

function escapeRegExp(valor: string) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function marcaLinha(abre: string, fecha: string) {
  return new RegExp(
    `^${escapeRegExp(abre)}(.*)${escapeRegExp(fecha)}$`,
  );
}

const MARCAS_LINHA = [
  {
    re: marcaLinha(MARCA_BIG_ABRE, MARCA_BIG_FECHA),
    aplicar: (impressora: ThermalPrinter, texto: string) => {
      impressora.alignCenter();
      impressora.bold(true);
      impressora.setTextSize(1, 1);
      impressora.print(texto);
      impressora.setTextNormal();
      impressora.bold(false);
      impressora.alignCenter();
      impressora.newLine();
    },
  },
  {
    re: marcaLinha(MARCA_BANNER_ABRE, MARCA_BANNER_FECHA),
    aplicar: (impressora: ThermalPrinter, texto: string) => {
      impressora.alignCenter();
      impressora.bold(true);
      impressora.setTextDoubleHeight();
      impressora.print(texto);
      impressora.setTextNormal();
      impressora.bold(false);
      impressora.alignLeft();
      impressora.newLine();
    },
  },
  {
    re: marcaLinha(MARCA_ITEM_ABRE, MARCA_ITEM_FECHA),
    aplicar: (impressora: ThermalPrinter, texto: string) => {
      impressora.alignLeft();
      impressora.bold(true);
      impressora.setTextDoubleHeight();
      impressora.print(texto);
      impressora.setTextNormal();
      impressora.bold(false);
      impressora.newLine();
    },
  },
  {
    re: marcaLinha(MARCA_OBS_ABRE, MARCA_OBS_FECHA),
    aplicar: (impressora: ThermalPrinter, texto: string) => {
      impressora.alignLeft();
      impressora.bold(true);
      impressora.println(texto);
    },
  },
  {
    re: marcaLinha(MARCA_CENTER_ABRE, MARCA_CENTER_FECHA),
    aplicar: (impressora: ThermalPrinter, texto: string) => {
      impressora.alignCenter();
      impressora.bold(true);
      impressora.setTextDoubleHeight();
      impressora.print(texto);
      impressora.setTextNormal();
      impressora.bold(false);
      impressora.alignCenter();
      impressora.newLine();
    },
  },
  {
    re: marcaLinha(MARCA_META_ABRE, MARCA_META_FECHA),
    aplicar: (impressora: ThermalPrinter, texto: string) => {
      impressora.alignCenter();
      impressora.bold(true);
      impressora.println(texto);
    },
  },
  {
    re: marcaLinha(MARCA_TOTAL_ABRE, MARCA_TOTAL_FECHA),
    aplicar: (impressora: ThermalPrinter, texto: string) => {
      impressora.alignLeft();
      impressora.bold(true);
      impressora.setTextDoubleHeight();
      impressora.print(texto);
      impressora.setTextNormal();
      impressora.bold(false);
      impressora.newLine();
    },
  },
] as const;

const DISPOSITIVO_RE =
  /^(?:\/dev\/(?:usb\/)?lp\d+|\/dev\/tty(?:USB|ACM)\d+|\/dev\/serial\/by-id\/[A-Za-z0-9._+-]+|COM\d+)$/i;

const LINHAS_ANTES_DO_CORTE = 15;

const COMANDO_CORTE = Buffer.from([
  ...Array<number>(LINHAS_ANTES_DO_CORTE).fill(0x0a),
  0x1b,
  0x69,
]);

type DestinoImpressora =
  | { tipo: 'rede'; ip: string }
  | { tipo: 'local'; dispositivo: string };

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
      const destino = await this.resolverDestinoInicial();

      if (!destino) {
        this.logger.warn(
          'Impressora não configurada. Configure em Configurações > Impressora.',
        );
        return;
      }

      await this.reconfigurar(destino);
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
        select: { ip: true, dispositivo: true },
      });

      return {
        dados: {
          ip: config?.ip ?? null,
          dispositivo: config?.dispositivo ?? null,
        },
      };
    } catch (erro) {
      this.logger.error('Erro ao obter config da impressora', erro);
      throw new InternalServerErrorException(
        'Não foi possível carregar a configuração da impressora.',
      );
    }
  }

  async listarPortas() {
    try {
      const portas = await this.descobrirPortasLocais();
      return { dados: { portas } };
    } catch (erro) {
      this.logger.error('Erro ao listar portas da impressora', erro);
      return { dados: { portas: [] as { path: string; label: string }[] } };
    }
  }

  async testar(dto: ConfigurarImpressoraDto) {
    const destino = this.resolverDestinoDto(dto);
    const conectada = await this.verificarConexao(destino);

    if (!conectada) {
      throw new BadRequestException(
        destino.tipo === 'rede'
          ? 'A impressora não está respondendo. Verifique o IP, se ela está ligada e na mesma rede.'
          : 'A impressora não está respondendo neste dispositivo. Verifique se está ligada e conectada.',
      );
    }

    return {
      mensagem: 'Conexão com a impressora OK',
      dados: {
        conectada: true,
        ip: destino.tipo === 'rede' ? destino.ip : null,
        dispositivo: destino.tipo === 'local' ? destino.dispositivo : null,
      },
    };
  }

  async salvar(dto: ConfigurarImpressoraDto) {
    const destino = this.resolverDestinoDto(dto);
    const conectada = await this.verificarConexao(destino);

    if (!conectada) {
      throw new BadRequestException(
        destino.tipo === 'rede'
          ? 'Não foi possível salvar: a impressora não está respondendo neste IP.'
          : 'Não foi possível salvar: a impressora não está respondendo neste dispositivo.',
      );
    }

    const ip = destino.tipo === 'rede' ? destino.ip : null;
    const dispositivo = destino.tipo === 'local' ? destino.dispositivo : null;

    try {
      const config = await this.prismaWrite.configImpressora.upsert({
        where: { id: CONFIG_ID },
        create: { id: CONFIG_ID, ip, dispositivo },
        update: { ip, dispositivo },
      });

      await this.reconfigurar(
        config.dispositivo
          ? { tipo: 'local', dispositivo: config.dispositivo }
          : { tipo: 'rede', ip: config.ip! },
      );

      return {
        mensagem: 'Impressora configurada com sucesso',
        dados: {
          ip: config.ip ?? null,
          dispositivo: config.dispositivo ?? null,
        },
      };
    } catch (erro) {
      if (erro instanceof BadRequestException) throw erro;
      this.logger.error('Erro ao salvar config da impressora', erro);
      throw new InternalServerErrorException(
        'Não foi possível salvar a configuração da impressora.',
      );
    }
  }

  async reconfigurar(destino: DestinoImpressora) {
    const impressora = this.criarInstancia(destino);
    const conectada = await impressora.isPrinterConnected();

    this.impressora = impressora;

    const alvo =
      destino.tipo === 'rede' ? destino.ip : destino.dispositivo;

    if (conectada) {
      this.logger.debug(`Impressora conectada com sucesso em: ${alvo}`);
    } else {
      this.logger.error(
        `A impressora em ${alvo} não está respondendo. Verifique se ela está ligada.`,
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
      this.renderizarTexto(textoFormatado);
      this.impressora.add(COMANDO_CORTE);
      await this.impressora.execute();
      this.impressora.clear();
      this.logger.log('Impressão concluída com sucesso!');
    } catch (error) {
      this.logger.error('Erro durante a impressão do cupom:', error);
      this.impressora.clear();
      throw error;
    }
  }

  private renderizarTexto(texto: string) {
    const impressora = this.impressora;
    if (!impressora) return;

    for (const linha of texto.split('\n')) {
      let renderizada = false;

      for (const marca of MARCAS_LINHA) {
        const match = linha.match(marca.re);
        if (!match) continue;
        marca.aplicar(impressora, match[1] ?? '');
        this.resetarEstilo(impressora);
        renderizada = true;
        break;
      }

      if (!renderizada) {
        impressora.println(linha);
      }
    }
  }

  private resetarEstilo(impressora: ThermalPrinter) {
    impressora.setTextNormal();
    impressora.bold(false);
    impressora.invert(false);
    impressora.alignLeft();
    impressora.resetLineSpacing();
  }

  estaConfigurada(): boolean {
    return this.impressora !== null;
  }

  private resolverDestinoDto(dto: ConfigurarImpressoraDto): DestinoImpressora {
    const ip = dto.ip?.trim() || null;
    const dispositivo = dto.dispositivo?.trim() || null;

    if (ip && dispositivo) {
      throw new BadRequestException(
        'Informe apenas o IP ou o dispositivo local, não os dois.',
      );
    }

    if (dispositivo) {
      if (!DISPOSITIVO_RE.test(dispositivo)) {
        throw new BadRequestException(
          'Informe um dispositivo válido (/dev/usb/lp0, /dev/ttyUSB0, COM1, …)',
        );
      }
      return { tipo: 'local', dispositivo };
    }

    if (ip) {
      return { tipo: 'rede', ip };
    }

    throw new BadRequestException(
      'Informe o IP da impressora ou escolha um dispositivo local.',
    );
  }

  private async resolverDestinoInicial(): Promise<DestinoImpressora | null> {
    const config = await this.prismaRead.configImpressora.findUnique({
      where: { id: CONFIG_ID },
      select: { ip: true, dispositivo: true },
    });

    if (config?.dispositivo) {
      return { tipo: 'local', dispositivo: config.dispositivo };
    }

    if (config?.ip) {
      return { tipo: 'rede', ip: config.ip };
    }

    const envIp = process.env.IP_IMPRESSORA?.trim();
    if (!envIp) {
      return null;
    }

    await this.prismaWrite.configImpressora.create({
      data: { id: CONFIG_ID, ip: envIp, dispositivo: null },
    });

    this.logger.log(
      `IP da impressora migrado do .env para o banco (${envIp}).`,
    );

    return { tipo: 'rede', ip: envIp };
  }

  private criarInstancia(destino: DestinoImpressora) {
    const iface =
      destino.tipo === 'local'
        ? destino.dispositivo
        : `tcp://${destino.ip}`;

    return new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: iface,
      characterSet: CharacterSet.PC860_PORTUGUESE,
      removeSpecialCharacters: true,
      breakLine: BreakLine.WORD,
    });
  }

  private async verificarConexao(destino: DestinoImpressora): Promise<boolean> {
    const alvo =
      destino.tipo === 'rede' ? destino.ip : destino.dispositivo;

    try {
      const impressora = this.criarInstancia(destino);
      return await impressora.isPrinterConnected();
    } catch (error) {
      this.logger.error(`Falha ao testar impressora em ${alvo}`, error);
      return false;
    }
  }

  private async descobrirPortasLocais(): Promise<
    { path: string; label: string }[]
  > {
    const portas: { path: string; label: string }[] = [];
    const resolvidos = new Set<string>();

    try {
      const byId = await readdir('/dev/serial/by-id');
      for (const nome of byId) {
        const path = join('/dev/serial/by-id', nome);
        try {
          resolvidos.add(await realpath(path));
        } catch {
          // symlink quebrado
        }
        portas.push({
          path,
          label: nome
            .replace(/^usb-/i, '')
            .replace(/-if\d+$/i, '')
            .replace(/_/g, ' '),
        });
      }
    } catch {
      // /dev/serial/by-id pode não existir
    }

    try {
      const usbEntries = await readdir('/dev/usb');
      for (const nome of usbEntries) {
        if (!/^lp\d+$/i.test(nome)) continue;
        const path = join('/dev/usb', nome);
        if (resolvidos.has(path)) continue;
        portas.push({ path, label: path });
      }
    } catch {
      // /dev/usb pode não existir
    }

    try {
      const entries = await readdir('/dev');
      for (const nome of entries) {
        if (
          !/^lp\d+$/i.test(nome) &&
          !/^ttyUSB\d+$/i.test(nome) &&
          !/^ttyACM\d+$/i.test(nome)
        ) {
          continue;
        }
        const path = join('/dev', nome);
        if (resolvidos.has(path)) continue;
        portas.push({ path, label: path });
      }
    } catch {
      // /dev inacessível
    }

    return portas.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }
}
