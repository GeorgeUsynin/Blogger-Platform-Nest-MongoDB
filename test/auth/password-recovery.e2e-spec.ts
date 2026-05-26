import { add } from 'date-fns/add';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { EmailAdapter } from '../../src/modules/notification/email.adapter';
import { CreateUserInputDto } from '../../src/modules/user-accounts/users/api/dto';
import { createUser, runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('AuthController (e2e) - password recovery endpoints', () => {
  let app: INestApplication;
  let basicAuthorization: { Authorization: string };
  let sendEmailSpy: jest.SpyInstance;

  beforeAll(async () => {
    ({ app, basicAuthorization } = await runBeforeAllSetup());
    sendEmailSpy = jest
      .spyOn(EmailAdapter.prototype, 'sendEmail')
      .mockImplementation(() => {});
  });

  afterEach(async () => {
    await request(app.getHttpServer())
      .delete('/api/testing/all-data')
      .expect(HttpStatus.NO_CONTENT);
    sendEmailSpy.mockClear();
  });

  afterAll(async () => {
    sendEmailSpy.mockRestore();
    if (app) {
      await runAfterAllSetup(app);
    }
  });

  const getLastRecoveryCode = (): string => {
    const lastCall =
      sendEmailSpy.mock.calls[sendEmailSpy.mock.calls.length - 1];
    const message = lastCall?.[2] as string | undefined;
    const recoveryCode = message?.match(/recoveryCode=([^']+)/)?.[1];

    expect(recoveryCode).toBeDefined();
    return recoveryCode!;
  };

  describe('POST /auth/password-recovery', () => {
    it('returns 204 and sends recovery email for existing user', async () => {
      const user: CreateUserInputDto = {
        login: 'recover1',
        password: 'secret12',
        email: 'recover-user@example.com',
      };
      await createUser(app, basicAuthorization, user);

      await request(app.getHttpServer())
        .post('/api/auth/password-recovery')
        .send({ email: user.email })
        .expect(HttpStatus.NO_CONTENT);

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(sendEmailSpy).toHaveBeenCalledWith(
        user.email,
        'Password Recovery',
        expect.any(String),
      );
      expect(getLastRecoveryCode()).toEqual(expect.any(String));
    });

    it('returns 204 and does not send email if user does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/password-recovery')
        .send({ email: 'missing-user@example.com' })
        .expect(HttpStatus.NO_CONTENT);

      expect(sendEmailSpy).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid payload', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/password-recovery')
        .send({ email: '   ' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
      );
    });
  });

  describe('POST /auth/new-password', () => {
    it('updates password for valid recovery code and invalidates old password', async () => {
      const user: CreateUserInputDto = {
        login: 'newpass01',
        password: 'secret12',
        email: 'new-password-user@example.com',
      };
      const newPassword = 'new-secret12';
      await createUser(app, basicAuthorization, user);

      await request(app.getHttpServer())
        .post('/api/auth/password-recovery')
        .send({ email: user.email })
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .post('/api/auth/new-password')
        .send({ newPassword, recoveryCode: getLastRecoveryCode() })
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ loginOrEmail: user.login, password: user.password })
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ loginOrEmail: user.login, password: newPassword })
        .expect(HttpStatus.OK);
    });

    it('returns 400 when recovery code does not exist', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/new-password')
        .send({ newPassword: 'new-secret12', recoveryCode: randomUUID() })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'recoveryCode',
            code: 'INVALID_PASSWORD_RECOVERY_CODE',
          }),
        ]),
      );
    });

    it('returns 400 when recovery code is expired', async () => {
      const user: CreateUserInputDto = {
        login: 'expired01',
        password: 'secret12',
        email: 'expired-recovery-user@example.com',
      };
      await createUser(app, basicAuthorization, user);

      await request(app.getHttpServer())
        .post('/api/auth/password-recovery')
        .send({ email: user.email })
        .expect(HttpStatus.NO_CONTENT);

      const dateNowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(add(new Date(), { days: 10 }).getTime());

      const { body } = await request(app.getHttpServer())
        .post('/api/auth/new-password')
        .send({
          newPassword: 'new-secret12',
          recoveryCode: getLastRecoveryCode(),
        })
        .expect(HttpStatus.BAD_REQUEST);

      dateNowSpy.mockRestore();

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'recoveryCode',
            code: 'PASSWORD_RECOVERY_CODE_EXPIRED',
          }),
        ]),
      );
    });

    it('returns 400 for invalid payload', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/new-password')
        .send({ newPassword: '   ', recoveryCode: '   ' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'newPassword' }),
          expect.objectContaining({ field: 'recoveryCode' }),
        ]),
      );
    });
  });
});
