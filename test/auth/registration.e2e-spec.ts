import { add } from 'date-fns/add';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { EmailAdapter } from '../../src/modules/notification/email.adapter';
import { CreateUserInputDto } from '../../src/modules/user-accounts/users/api/dto';
import { runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('AuthController (e2e) - registration-related endpoints', () => {
  let app: INestApplication;
  let basicAuthorization: { Authorization: string };
  let sendConfirmationEmailSpy: jest.SpyInstance;

  beforeAll(async () => {
    ({ app, basicAuthorization } = await runBeforeAllSetup());
    sendConfirmationEmailSpy = jest
      .spyOn(EmailAdapter.prototype, 'sendEmail')
      .mockImplementation(() => {});
  });

  afterEach(async () => {
    await request(app.getHttpServer())
      .delete('/api/testing/all-data')
      .expect(HttpStatus.NO_CONTENT);
    sendConfirmationEmailSpy.mockClear();
  });

  afterAll(async () => {
    sendConfirmationEmailSpy.mockRestore();
    if (app) {
      await runAfterAllSetup(app);
    }
  });

  const registrationPayload: CreateUserInputDto = {
    login: 'new_user',
    password: 'secret12',
    email: 'new-user@example.com',
  };

  const findUserByEmail = async (email: string) => {
    const { body } = await request(app.getHttpServer())
      .get('/api/users')
      .set(basicAuthorization)
      .query({ searchTermEmail: email, searchEmailTerm: email })
      .expect(HttpStatus.OK);

    const user = body.items.find((u: { email: string }) => u.email === email);
    expect(user).toBeDefined();
    return user;
  };

  const getLastConfirmationCode = (): string => {
    const lastCall =
      sendConfirmationEmailSpy.mock.calls[
        sendConfirmationEmailSpy.mock.calls.length - 1
      ];
    const message = lastCall?.[2] as string | undefined;
    const code = message?.match(/code=([^']+)/)?.[1];

    expect(code).toBeDefined();
    return code!;
  };

  describe('POST /auth/registration', () => {
    it('creates an unconfirmed user and does not allow login before confirmation', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send(registrationPayload)
        .expect(HttpStatus.NO_CONTENT);

      expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(1);
      expect(sendConfirmationEmailSpy).toHaveBeenCalledWith(
        registrationPayload.email,
        'Email Confirmation',
        expect.any(String),
      );

      const { body } = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: registrationPayload.login,
          password: registrationPayload.password,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Email address is not confirmed',
            code: 'EMAIL_NOT_CONFIRMED',
          }),
        ]),
      );
    });

    it('returns 400 when login is not unique', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send(registrationPayload)
        .expect(HttpStatus.NO_CONTENT);

      const { body } = await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send({ ...registrationPayload, email: 'second-user@example.com' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'login',
            code: 'LOGIN_ALREADY_EXISTS',
          }),
        ]),
      );
    });

    it('returns 400 for invalid payload', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send({ login: '  ', password: '123' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'login' }),
          expect.objectContaining({ field: 'password' }),
          expect.objectContaining({ field: 'email' }),
        ]),
      );
    });
  });

  describe('POST /auth/registration-confirmation', () => {
    const createUnconfirmedUser = async () => {
      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send(registrationPayload)
        .expect(HttpStatus.NO_CONTENT);

      await findUserByEmail(registrationPayload.email);
      return { code: getLastConfirmationCode() };
    };

    it('confirms registration and allows login', async () => {
      const createdUser = await createUnconfirmedUser();

      await request(app.getHttpServer())
        .post('/api/auth/registration-confirmation')
        .send({ code: createdUser.code })
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: registrationPayload.login,
          password: registrationPayload.password,
        })
        .expect(HttpStatus.OK);
    });

    it('returns 400 for invalid confirmation code', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/registration-confirmation')
        .send({ code: randomUUID() })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'code',
            code: 'INVALID_CONFIRMATION_CODE',
          }),
        ]),
      );
    });

    it('returns 400 when confirmation code is already applied', async () => {
      const createdUser = await createUnconfirmedUser();

      await request(app.getHttpServer())
        .post('/api/auth/registration-confirmation')
        .send({ code: createdUser.code })
        .expect(HttpStatus.NO_CONTENT);

      const { body } = await request(app.getHttpServer())
        .post('/api/auth/registration-confirmation')
        .send({ code: createdUser.code })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'code',
            code: 'EMAIL_ALREADY_CONFIRMED_BY_CODE',
          }),
        ]),
      );
    });

    it('returns 400 when confirmation code is expired', async () => {
      const createdUser = await createUnconfirmedUser();
      const dateNowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(add(new Date(), { days: 10 }).getTime());

      const { body } = await request(app.getHttpServer())
        .post('/api/auth/registration-confirmation')
        .send({ code: createdUser.code })
        .expect(HttpStatus.BAD_REQUEST);

      dateNowSpy.mockRestore();

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'code',
            code: 'CONFIRMATION_CODE_EXPIRED',
          }),
        ]),
      );
    });
  });

  describe('POST /auth/registration-email-resending', () => {
    const createUnconfirmedUser = async () => {
      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send(registrationPayload)
        .expect(HttpStatus.NO_CONTENT);

      await findUserByEmail(registrationPayload.email);
      return { code: getLastConfirmationCode() };
    };

    it('resends confirmation email, rotates code and invalidates previous code', async () => {
      const createdUser = await createUnconfirmedUser();
      const oldCode = createdUser.code;

      await request(app.getHttpServer())
        .post('/api/auth/registration-email-resending')
        .send({ email: registrationPayload.email })
        .expect(HttpStatus.NO_CONTENT);

      expect(sendConfirmationEmailSpy).toHaveBeenCalledTimes(2);
      expect(sendConfirmationEmailSpy).toHaveBeenLastCalledWith(
        registrationPayload.email,
        'Email Confirmation',
        expect.any(String),
      );

      await findUserByEmail(registrationPayload.email);
      const newCode = getLastConfirmationCode();
      expect(newCode).not.toBe(oldCode);

      const { body: invalidOldCodeBody } = await request(app.getHttpServer())
        .post('/api/auth/registration-confirmation')
        .send({ code: oldCode })
        .expect(HttpStatus.BAD_REQUEST);

      expect(invalidOldCodeBody.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'code',
            code: 'INVALID_CONFIRMATION_CODE',
          }),
        ]),
      );
    });

    it('returns 204 when email does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/registration-email-resending')
        .send({ email: 'missing-user@example.com' })
        .expect(HttpStatus.NO_CONTENT);
    });

    it('returns 400 when user is already confirmed', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set(basicAuthorization)
        .send(registrationPayload)
        .expect(HttpStatus.CREATED);

      const { body } = await request(app.getHttpServer())
        .post('/api/auth/registration-email-resending')
        .send({ email: registrationPayload.email })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'code',
            code: 'EMAIL_ALREADY_CONFIRMED_BY_CODE',
          }),
        ]),
      );
    });

    it('returns 400 for invalid payload', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/registration-email-resending')
        .send({ email: '   ' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
      );
    });
  });
});
