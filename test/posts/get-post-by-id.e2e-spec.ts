import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { CreatePostInputDto } from '../../src/modules/bloggers-platform/posts/api/dto';
import { runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('PostsController (e2e) - GET /api/posts/:id', () => {
  let app: INestApplication;
  let basicAuthorization: {
    Authorization: string;
  };

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

  const createBlog = async () => {
    const newBlog: CreateBlogInputDto = {
      description: 'Tech blog description',
      name: 'Tech Blog',
      websiteUrl: 'https://techblog.com',
    };

    const { body } = await request(app.getHttpServer())
      .post('/api/blogs')
      .set(basicAuthorization)
      .send(newBlog)
      .expect(HttpStatus.CREATED);

    return body;
  };

  const createPost = async () => {
    const blog = await createBlog();
    const newPost: CreatePostInputDto = {
      title: 'First post',
      shortDescription: 'Short description for first post',
      content: 'Detailed content for first post',
      blogId: blog.id,
    };

    const { body } = await request(app.getHttpServer())
      .post('/api/posts')
      .set(basicAuthorization)
      .send(newPost)
      .expect(HttpStatus.CREATED);

    return body;
  };

  it('returns post by requested id', async () => {
    const createdPost = await createPost();

    const { body } = await request(app.getHttpServer())
      .get(`/api/posts/${createdPost.id}`)
      .expect(HttpStatus.OK);

    expect(body).toEqual(createdPost);
  });

  it('returns 404 status code if there is no requested post in database', async () => {
    await request(app.getHttpServer())
      .get('/api/posts/507f1f77bcf86cd799439011')
      .expect(HttpStatus.NOT_FOUND);
  });
});
