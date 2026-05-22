import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateUserInputDto } from '../../src/modules/user-accounts/users/api/dto';
import { createUser, runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('AuthController (e2e) - POST /api/auth/login', () => {
  let app: INestApplication;
  let basicAuthorization: { Authorization: string };

  beforeAll(async () => {
    ({ app, basicAuthorization } = await runBeforeAllSetup());
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

  it('logs in with login', async () => {
    const newUser: CreateUserInputDto = {
      login: 'john_auth',
      password: 'secret12',
      email: 'john-auth@example.com',
    };

    await createUser(app, basicAuthorization, newUser);

    const { body } = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ loginOrEmail: newUser.login, password: newUser.password })
      .expect(HttpStatus.OK);

    expect(body).toEqual({ accessToken: expect.any(String) });
  });

  it('logs in with email', async () => {
    const newUser: CreateUserInputDto = {
      login: 'mail_auth',
      password: 'secret12',
      email: 'mail-auth@example.com',
    };

    await createUser(app, basicAuthorization, newUser);

    const { body } = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ loginOrEmail: newUser.email, password: newUser.password })
      .expect(HttpStatus.OK);

    expect(body).toEqual({ accessToken: expect.any(String) });
  });

  it('returns 401 for invalid credentials', async () => {
    const newUser: CreateUserInputDto = {
      login: 'wrong_pass',
      password: 'secret12',
      email: 'wrong-pass@example.com',
    };

    await createUser(app, basicAuthorization, newUser);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ loginOrEmail: newUser.login, password: 'bad-pass' })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 401 for invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ loginOrEmail: '   ' })
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
