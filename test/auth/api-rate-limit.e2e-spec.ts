import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { runAfterAllSetup, runBeforeAllSetup } from '../helpers';
import { TestingModuleBuilder } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthController (e2e) - API rate limit', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await runBeforeAllSetup((builder: TestingModuleBuilder) => {
      builder.overrideGuard(ThrottlerGuard).useClass(ThrottlerGuard);
    }));
  });

  afterEach(async () => {
    await request(app.getHttpServer())
      .delete('/api/testing/all-data')
      .expect(HttpStatus.NO_CONTENT);
  });

  afterAll(async () => {
    if (app) {
      await runAfterAllSetup(app);
    }
  });

  const expectRateLimit = async (
    path: string,
    payload: Record<string, unknown>,
    expectedStatusBeforeLimit: number,
  ) => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post(path)
        .send(payload)
        .expect(expectedStatusBeforeLimit);
    }

    const { body } = await request(app.getHttpServer())
      .post(path)
      .send(payload)
      .expect(HttpStatus.TOO_MANY_REQUESTS);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([
        {
          message: 'ThrottlerException: Too Many Requests',
        },
      ]),
    );
  };

  it('returns 429 for POST /auth/login after 5 requests in 10 seconds', async () => {
    await expectRateLimit(
      '/api/auth/login',
      { loginOrEmail: '   ' },
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('returns 429 for POST /auth/registration after 5 requests in 10 seconds', async () => {
    await expectRateLimit(
      '/api/auth/registration',
      { login: '  ' },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('returns 429 for POST /auth/registration-confirmation after 5 requests in 10 seconds', async () => {
    await expectRateLimit(
      '/api/auth/registration-confirmation',
      { code: 'invalid-code' },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('returns 429 for POST /auth/registration-email-resending after 5 requests in 10 seconds', async () => {
    await expectRateLimit(
      '/api/auth/registration-email-resending',
      { email: 'missing-user@example.com' },
      HttpStatus.NO_CONTENT,
    );
  });

  it('returns 429 for POST /auth/password-recovery after 5 requests in 10 seconds', async () => {
    await expectRateLimit(
      '/api/auth/password-recovery',
      { email: '   ' },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('returns 429 for POST /auth/new-password after 5 requests in 10 seconds', async () => {
    await expectRateLimit(
      '/api/auth/new-password',
      { newPassword: '   ', recoveryCode: '   ' },
      HttpStatus.BAD_REQUEST,
    );
  });
});
