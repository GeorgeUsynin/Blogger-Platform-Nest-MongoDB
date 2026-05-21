import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('BlogsController (e2e) - DELETE /api/blogs/:id', () => {
  let app: INestApplication;
  let basicAuthorization: {
    Authorization: string;
  };

  beforeAll(async () => {
    ({ app, basicAuthorization } = await runBeforeAllSetup());
  });

  afterAll(async () => {
    if (app) {
      await runAfterAllSetup(app);
    }
  });

  const createBlog = async () => {
    const newBlog: CreateBlogInputDto = {
      description: 'Eco lifestyle description',
      name: 'Eco Lifestyle',
      websiteUrl: 'https://ecolifestyle.com',
    };

    const { body } = await request(app.getHttpServer())
      .post('/api/blogs')
      .set(basicAuthorization)
      .send(newBlog)
      .expect(HttpStatus.CREATED);

    return body.id as string;
  };

  it('deletes blog from database by providing ID', async () => {
    const requestedId = await createBlog();

    await request(app.getHttpServer())
      .delete(`/api/blogs/${requestedId}`)
      .set(basicAuthorization)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get(`/api/blogs/${requestedId}`)
      .expect(HttpStatus.NOT_FOUND);

    const { body } = await request(app.getHttpServer())
      .get('/api/blogs')
      .expect(HttpStatus.OK);

    expect(body.totalCount).toBe(0);
    expect(body.items).toHaveLength(0);
  });

  it('returns 404 status code if the blog was not found by requested ID', async () => {
    const fakeRequestedId = '507f1f77bcf86cd799439011';

    await request(app.getHttpServer())
      .delete(`/api/blogs/${fakeRequestedId}`)
      .set(basicAuthorization)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('returns 401 Unauthorized status code if there is no proper Authorization header', async () => {
    const requestedId = await createBlog();

    await request(app.getHttpServer())
      .delete(`/api/blogs/${requestedId}`)
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
