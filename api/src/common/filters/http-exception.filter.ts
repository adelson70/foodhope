import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const exceptionResponse: any = exception.getResponse();

    let mensagensDeErro: string[] = [];

    if (
      Array.isArray(exceptionResponse.message) &&
      exceptionResponse.message.length > 0 &&
      typeof exceptionResponse.message[0] === 'object' &&
      'property' in exceptionResponse.message[0]
    ) {
      mensagensDeErro = this.formatarErrosDeValidacao(exceptionResponse.message);
    } else if (typeof exceptionResponse === 'string') {
      mensagensDeErro = [exceptionResponse];
    } else if (Array.isArray(exceptionResponse.message)) {
      mensagensDeErro = exceptionResponse.message;
    } else if (exceptionResponse.message) {
      mensagensDeErro = [exceptionResponse.message];
    } else {
      mensagensDeErro = ['Erro interno no servidor'];
    }

    response.status(status).json({
      sucesso: false,
      mensagens: mensagensDeErro,
      dados: null,
      statusCode: status,
    });
  }

  private formatarErrosDeValidacao(errosValidacao: any[]): string[] {
    let mensagens: string[] = [];

    for (const erro of errosValidacao) {
      // 1. Se o campo NÃO foi enviado ou está vazio (undefined, null ou string vazia)
      if (erro.value === undefined || erro.value === null || erro.value === '') {
        // Verifica se você usou o seu decorator customizado ou o do class-validator
        if (erro.constraints?.isObrigatorio) {
          mensagens.push(erro.constraints.isObrigatorio);
        } else if (erro.constraints?.isNotEmpty) {
          mensagens.push(erro.constraints.isNotEmpty);
        } else {
          // Se não usou nenhum, cospe o nosso padrão e NÃO avalia o resto
          mensagens.push(`O campo '${erro.property}' é obrigatório.`);
        }
      }

      // 2. Se o campo FOI ENVIADO, mas quebrou alguma regra de validação (ex: tamanho, formato)
      else if (erro.constraints) {
        mensagens.push(...(Object.values(erro.constraints) as string[]));
      }

      // 3. Lida com objetos e listas aninhadas (Sub-DTOs)
      if (erro.children && erro.children.length > 0) {
        mensagens.push(...this.formatarErrosDeValidacao(erro.children));
      }
    }

    // Remove mensagens duplicadas e retorna
    return [...new Set(mensagens)];
  }
}
