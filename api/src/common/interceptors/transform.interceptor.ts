import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        const response = context.switchToHttp().getResponse();
        
        const mensagem = data?.mensagem ? [data.mensagem] : [];
        const dados = data?.dados !== undefined ? data.dados : data;

        return {
          sucesso: true,
          mensagens: mensagem,
          dados: dados,
          statusCode: response.statusCode,
        };
      }),
    );
  }
}