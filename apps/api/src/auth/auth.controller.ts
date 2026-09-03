import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { RegisterEmpresaDto } from './dto/register-empresa.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { GoogleAuthGuard } from './google-auth.guard';
import type { GoogleProfile } from './google.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { parseOAuthState } from './oauth-state';
import type { JwtPayload } from './types';

function authClient(header?: string): 'mobile' | 'web' {
  return header?.toLowerCase() === 'mobile' ? 'mobile' : 'web';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register/doctor')
  registerDoctor(
    @Body() dto: RegisterDoctorDto,
    @Headers('x-client') clientHeader?: string,
  ) {
    return this.authService.registerDoctor(dto, authClient(clientHeader));
  }

  @Post('register/empresa')
  registerEmpresa(
    @Body() dto: RegisterEmpresaDto,
    @Headers('x-client') clientHeader?: string,
  ) {
    return this.authService.registerEmpresa(dto, authClient(clientHeader));
  }

  @Post('register/patient')
  registerPatient(
    @Body() dto: RegisterPatientDto,
    @Headers('x-client') clientHeader?: string,
  ) {
    return this.authService.registerPatient(dto, authClient(clientHeader));
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Headers('x-client') clientHeader?: string) {
    return this.authService.login(dto, authClient(clientHeader));
  }

  /** Canjea el refresh token por un access token nuevo. Sin JwtAuthGuard a
   * propósito: el access token ya está vencido, es lo que se va a renovar. */
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Headers('x-client') clientHeader?: string,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = dto.refreshToken ?? cookies?.piel360_refresh;
    if (!refreshToken) {
      throw new UnauthorizedException('Falta el refresh token');
    }
    return this.authService.refreshTokens(refreshToken, authClient(clientHeader));
  }

  @Post('otp/send')
  @HttpCode(200)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('otp/phone/send')
  @HttpCode(200)
  sendPhoneOtp(@Body() dto: SendPhoneOtpDto) {
    return this.authService.sendPhoneOtp(dto);
  }

  @Post('me/otp/phone/send')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  sendPhoneOtpForMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendPhoneOtpDto,
  ) {
    return this.authService.sendPhoneOtpForAuthenticatedUser(user.sub, dto);
  }

  @Post('me/phone/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  confirmPhoneVerification(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmPhoneVerificationDto,
  ) {
    return this.authService.confirmPhoneVerification(user.sub, dto);
  }

  @Post('otp/phone/verify')
  @HttpCode(200)
  verifyPhoneOtp(@Body() dto: VerifyPhoneOtpDto) {
    return this.authService.verifyPhoneOtp(dto);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  @Get('me/permissions')
  @UseGuards(JwtAuthGuard)
  async mePermissions(@CurrentUser() user: JwtPayload) {
    const permissions = await this.authService.getPermissionsForUser(user.sub);
    return { permissions };
  }

  /**
   * Inicia el flujo OAuth.
   * Query: `role=doctor|patient`, `platform=web|mobile` (viaja en `state`).
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request & { user: GoogleProfile },
    @Res() res: Response,
  ) {
    const { platform, redirectUri, role } = parseOAuthState(req.query.state);
    const client = platform === 'mobile' ? 'mobile' : 'web';
    const result = await this.authService.loginOrRegisterWithGoogle(
      req.user,
      client,
    );
    const code = await this.authService.createGoogleExchangeCode(result);
    const roleQuery =
      role === 'doctor' || role === 'patient'
        ? `&role=${encodeURIComponent(role)}`
        : '';

    // redirect_uri explícito (Expo web / deep link) tiene prioridad.
    if (redirectUri) {
      const sep = redirectUri.includes('?') ? '&' : '?';
      res.redirect(
        `${redirectUri}${sep}code=${encodeURIComponent(code)}${roleQuery}`,
      );
      return;
    }
    if (platform === 'mobile') {
      const deepLink =
        this.config.get<string>('MOBILE_DEEP_LINK') ||
        'piel360://auth/google/callback';
      const sep = deepLink.includes('?') ? '&' : '?';
      res.redirect(
        `${deepLink}${sep}code=${encodeURIComponent(code)}${roleQuery}`,
      );
      return;
    }
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    res.redirect(
      `${frontendUrl}/auth/google/callback?code=${encodeURIComponent(code)}${roleQuery}`,
    );
  }

  @Post('google/exchange')
  @HttpCode(200)
  exchangeGoogleCode(@Body('code') code: string) {
    return this.authService.exchangeGoogleCode(code);
  }
}
