import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { CreatePostInputDto } from '../../src/modules/bloggers-platform/posts/api/dto';
import { runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('PostsController (e2e) - DELETE /api/posts/:id', () => {
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

  const createPost = async () => {
    const newBlog: CreateBlogInputDto = {
      description: 'Tech blog description',
      name: 'Tech Blog',
      websiteUrl: 'https://techblog.com',
    };

    const blog = await request(app.getHttpServer())
      .post('/api/blogs')
      .set(basicAuthorization)
      .send(newBlog)
      .expect(HttpStatus.CREATED);

    const newPost: CreatePostInputDto = {
      title: 'Post title',
      shortDescription: 'Post short description',
      content: 'Post content',
      blogId: blog.body.id,
    };

    const post = await request(app.getHttpServer())
      .post('/api/posts')
      .set(basicAuthorization)
      .send(newPost)
      .expect(HttpStatus.CREATED);

    return post.body.id as string;
  };

  it('deletes post from database by providing ID', async () => {
    const requestedId = await createPost();

    await request(app.getHttpServer())
      .delete(`/api/posts/${requestedId}`)
      .set(basicAuthorization)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get(`/api/posts/${requestedId}`)
      .expect(HttpStatus.NOT_FOUND);

    const { body } = await request(app.getHttpServer())
      .get('/api/posts')
      .expect(HttpStatus.OK);

    expect(body.totalCount).toBe(0);
    expect(body.items).toHaveLength(0);
  });

  it('returns 404 status code if the post was not found by requested ID', async () => {
    await request(app.getHttpServer())
      .delete('/api/posts/507f1f77bcf86cd799439011')
      .set(basicAuthorization)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('returns 401 Unauthorized status code if there is no proper Authorization header', async () => {
    const requestedId = await createPost();

    await request(app.getHttpServer())
      .delete(`/api/posts/${requestedId}`)
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
