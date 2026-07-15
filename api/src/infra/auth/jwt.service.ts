import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class JwtServiceCustom {

  constructor(
    private readonly jwt: JwtService
  ){}


  generate(payload: {
    id:string;
  }) {

    return this.jwt.sign(payload);

  }


  verify(token:string){

    return this.jwt.verify(token);

  }

}