import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env } from '../../env.js';
import type { RegisterDto, LoginDto } from './auth.dto.js';
import type { AuthService } from './auth.service.js';
import { successResponse } from '../../types/api-response.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../../config/constants.js';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  async register(c: Context<{ Bindings: Env }>) {
    const dto = c.req.valid('json' as never) as RegisterDto;
    const result = await this.service.register(dto) as any;

    this._setRefreshCookie(c, result._refreshToken);
    return c.json(
      successResponse({ accessToken: result.accessToken, expiresIn: result.expiresIn, user: result._user }),
      201,
    );
  }

  async login(c: Context<{ Bindings: Env }>) {
    const dto = c.req.valid('json' as never) as LoginDto;
    const result = await this.service.login(dto) as any;

    this._setRefreshCookie(c, result._refreshToken);
    return c.json(successResponse({ accessToken: result.accessToken, expiresIn: result.expiresIn, user: result._user }));
  }

  async refresh(c: Context<{ Bindings: Env }>) {
    const rawRefreshToken = getCookie(c, REFRESH_COOKIE_NAME);
    if (!rawRefreshToken) {
      return c.json({ success: false, error: { code: 'MISSING_REFRESH_TOKEN', message: 'No refresh token provided' } }, 401);
    }

    const result = await this.service.refresh(rawRefreshToken) as any;
    this._setRefreshCookie(c, result._refreshToken);
    return c.json(successResponse({ accessToken: result.accessToken, expiresIn: result.expiresIn }));
  }

  async logout(c: Context<{ Bindings: Env }>) {
    const rawRefreshToken = getCookie(c, REFRESH_COOKIE_NAME);
    if (rawRefreshToken) {
      await this.service.logout(rawRefreshToken);
    }
    deleteCookie(c, REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    return c.json(successResponse(null));
  }

  private _setRefreshCookie(c: Context, token: string) {
    setCookie(c, REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });
  }
}
