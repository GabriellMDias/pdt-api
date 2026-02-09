import { MonthlyResult } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class MonthlyResultEntity implements MonthlyResult {
    @ApiProperty()
    id: number;

    @ApiProperty()
    storeId: number
    
    @ApiProperty()
    costCenterId: number
    
    @ApiProperty()
    date: Date
    
    @ApiProperty()
    recBruta: number      
    
    @ApiProperty()
    devolucao: number     
    
    @ApiProperty()
    imposto: number       
    
    @ApiProperty()
    custo: number         
    
    @ApiProperty()
    embalagem: number     
    
    @ApiProperty()
    quebra: number        
    
    @ApiProperty()
    recCom: number        
    
    @ApiProperty()
    despesaPessoal: number

    @ApiProperty()
    despesaPessoalRat: number
    
    @ApiProperty()
    despesaOperacional: number 
}
