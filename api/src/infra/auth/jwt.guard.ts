import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any) {

        if (info?.name === "TokenExpiredError" || info?.message === 'No auth token' || err || !user) {
            throw new UnauthorizedException('Operação não autorizada');
        }

        return user;
    }
}