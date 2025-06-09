import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OptimizationStrategyDto } from './optimize-deposit.dto';

export class ExecuteOptimizationDto {
  @ApiProperty({
    description: 'Unique operation ID for tracking',
    example: 'opt_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  operationId: string;

  @ApiProperty({
    description: 'Complete optimization strategy to execute',
    type: OptimizationStrategyDto,
  })
  @ValidateNested()
  @Type(() => OptimizationStrategyDto)
  strategy: OptimizationStrategyDto;
}
