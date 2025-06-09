import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEthereumAddress,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class WalletAuthDto {
  @ApiProperty({
    description: 'Wallet address',
    example: '0x742d35Cc6635Cb6C9D1d618d8e5d87a3D19A7AD3',
  })
  @IsString()
  @IsEthereumAddress()
  walletAddress: string;

  @ApiProperty({
    description: 'Signed message from wallet',
    example: 'Login to Alioth at 2024-01-01T00:00:00.000Z',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Signature from wallet',
    example: '0x...',
  })
  @IsString()
  signature: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
  })
  user: {
    id: string;
    walletAddress: string;
    role: string;
    email?: string;
    name?: string;
  };
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
  })
  @IsString()
  refreshToken: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
