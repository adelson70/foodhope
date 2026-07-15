import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class AdicionalDto {
    @ApiProperty({ example: 'ovo', description: 'Nome do adicional' })
    @IsString({ message: 'O nome do adicional deve ser um texto' })
    nome: string;
    
    @ApiProperty({ example: 2.50, description: 'Valor cobrado pelo adicional' })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ser numérico com até 2 casas decimais' })
    @Min(0, { message: 'O valor não pode ser negativo' })
    preco: number;
}

export class AdicionalEditarDto extends AdicionalDto {
    @ApiProperty({ example: "65dadeca-26a6-4e72-9386-c85d874f07e9", description: 'ID do adicional' })
    @IsNumber()
    @IsNotEmpty({ message: 'O ID do adicional é obrigatório na edição' })
    id: number;
}