import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('BlogsController (e2e) - GET /api/blogs/:id', () => {
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

    return body;
  };

  it('returns blog by requested id', async () => {
    const createdBlog = await createBlog();

    const { body } = await request(app.getHttpServer())
      .get(`/api/blogs/${createdBlog.id}`)
      .expect(HttpStatus.OK);

    expect(body).toEqual(createdBlog);
  });

  it('returns 404 status code if there is no requested blog in database', async () => {
    const fakeRequestedId = '507f1f77bcf86cd799439011';

    await request(app.getHttpServer())
      .get(`/api/blogs/${fakeRequestedId}`)
      .expect(HttpStatus.NOT_FOUND);
  });
});
