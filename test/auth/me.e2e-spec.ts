import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateUserInputDto } from '../../src/modules/user-accounts/users/api/dto';
import {
  createUser,
  loginAndGetToken,
  runAfterAllSetup,
  runBeforeAllSetup,
} from '../helpers';

describe('AuthController (e2e) - GET /api/auth/me', () => {
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

  it('returns current user for a valid bearer token', async () => {
    const newUser: CreateUserInputDto = {
      login: 'me_user',
      password: 'secret12',
      email: 'me-user@example.com',
    };

    const createdUser = await createUser(app, basicAuthorization, newUser);
    const accessToken = await loginAndGetToken(
      app,
      newUser.login,
      newUser.password,
    );

    const { body } = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(HttpStatus.OK);

    expect(body).toEqual({
      userId: createdUser.id,
      login: createdUser.login,
      email: createdUser.email,
    });
  });

  it('returns 401 when authorization header is missing', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 401 when bearer token is invalid', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set({ Authorization: 'Bearer invalid-token' })
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
