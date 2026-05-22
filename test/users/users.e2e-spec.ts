import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateUserInputDto } from '../../src/modules/user-accounts/users/api/dto';
import { createUser, runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('UsersController (e2e) - /api/users', () => {
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

  it('creates a user and returns it in get all users response', async () => {
    const newUser: CreateUserInputDto = {
      login: 'john_doe',
      password: 'secret12',
      email: 'john@example.com',
    };

    const createdUser = await createUser(app, basicAuthorization, newUser);

    expect(createdUser).toEqual({
      id: expect.any(String),
      login: newUser.login,
      email: newUser.email,
      createdAt: expect.any(String),
    });

    const { body: usersList } = await request(app.getHttpServer())
      .get('/api/users')
      .set(basicAuthorization)
      .expect(HttpStatus.OK);

    expect(usersList).toEqual({
      pagesCount: 1,
      page: 1,
      pageSize: 10,
      totalCount: 1,
      items: [createdUser],
    });
  });

  it('deletes user by id', async () => {
    const createdUser = await createUser(app, basicAuthorization, {
      login: 'to_delete',
      password: 'secret12',
      email: 'delete@example.com',
    });

    await request(app.getHttpServer())
      .delete(`/api/users/${createdUser.id}`)
      .set(basicAuthorization)
      .expect(HttpStatus.NO_CONTENT);

    const { body: usersList } = await request(app.getHttpServer())
      .get('/api/users')
      .set(basicAuthorization)
      .expect(HttpStatus.OK);

    expect(usersList).toEqual({
      pagesCount: 0,
      page: 1,
      pageSize: 10,
      totalCount: 0,
      items: [],
    });
  });

  it('returns 400 for invalid create user payload', async () => {
    const invalidUser = {
      login: 'ok_login',
      password: 'secret12',
      email: 'invalid-email',
    };

    const { body } = await request(app.getHttpServer())
      .post('/api/users')
      .set(basicAuthorization)
      .send(invalidUser)
      .expect(HttpStatus.BAD_REQUEST);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
    );
  });

  it('returns 401 if authorization header is missing', async () => {
    const newUser: CreateUserInputDto = {
      login: 'no_auth',
      password: 'secret12',
      email: 'no-auth@example.com',
    };

    await request(app.getHttpServer())
      .post('/api/users')
      .send(newUser)
      .expect(HttpStatus.UNAUTHORIZED);

    await request(app.getHttpServer())
      .get('/api/users')
      .expect(HttpStatus.UNAUTHORIZED);

    await request(app.getHttpServer())
      .delete('/api/users/507f1f77bcf86cd799439011')
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
