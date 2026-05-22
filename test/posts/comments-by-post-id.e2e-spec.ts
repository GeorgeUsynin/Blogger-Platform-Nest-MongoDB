import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { CreatePostInputDto } from '../../src/modules/bloggers-platform/posts/api/dto';
import {
  createUserAndGetToken,
  runAfterAllSetup,
  runBeforeAllSetup,
} from '../helpers';

describe('PostsController (e2e) - comments by post id endpoints', () => {
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
    if (app) await runAfterAllSetup(app);
  });

  const createPost = async () => {
    const blog: CreateBlogInputDto = {
      description: 'Blog for comments',
      name: 'Comments Blog',
      websiteUrl: 'https://comments-blog.com',
    };

    const blogResponse = await request(app.getHttpServer())
      .post('/api/blogs')
      .set(basicAuthorization)
      .send(blog)
      .expect(HttpStatus.CREATED);

    const post: CreatePostInputDto = {
      title: 'Post for comments',
      shortDescription: 'Short description for comments post',
      content: 'Content for comments post',
      blogId: blogResponse.body.id,
    };

    const postResponse = await request(app.getHttpServer())
      .post('/api/posts')
      .set(basicAuthorization)
      .send(post)
      .expect(HttpStatus.CREATED);

    return postResponse.body;
  };

  it('gets all comments for requested post id', async () => {
    const post = await createPost();
    const firstUser = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'u',
    });
    const secondUser = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'u',
    });

    await request(app.getHttpServer())
      .post(`/api/posts/${post.id}/comments`)
      .set({ Authorization: `Bearer ${firstUser.token}` })
      .send({ content: 'This is the first comment with enough valid symbols.' })
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .post(`/api/posts/${post.id}/comments`)
      .set({ Authorization: `Bearer ${secondUser.token}` })
      .send({
        content: 'This is the second comment with enough valid symbols.',
      })
      .expect(HttpStatus.CREATED);

    const { body } = await request(app.getHttpServer())
      .get(`/api/posts/${post.id}/comments`)
      .expect(HttpStatus.OK);

    expect(body.pagesCount).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
    expect(body.totalCount).toBe(2);
    expect(body.items).toHaveLength(2);
  });

  it('returns paginated comments for requested post id', async () => {
    const post = await createPost();
    const firstUser = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'u',
    });
    const secondUser = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'u',
    });

    await request(app.getHttpServer())
      .post(`/api/posts/${post.id}/comments`)
      .set({ Authorization: `Bearer ${firstUser.token}` })
      .send({ content: 'First paginated comment with enough valid symbols.' })
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .post(`/api/posts/${post.id}/comments`)
      .set({ Authorization: `Bearer ${secondUser.token}` })
      .send({ content: 'Second paginated comment with enough valid symbols.' })
      .expect(HttpStatus.CREATED);

    const { body } = await request(app.getHttpServer())
      .get(`/api/posts/${post.id}/comments`)
      .query({
        pageNumber: 2,
        pageSize: 1,
        sortBy: 'createdAt',
        sortDirection: 'asc',
      })
      .expect(HttpStatus.OK);

    expect(body.pagesCount).toBe(2);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(1);
    expect(body.totalCount).toBe(2);
    expect(body.items).toHaveLength(1);
  });

  it('returns 400 for invalid post id format when getting comments', async () => {
    await request(app.getHttpServer())
      .get('/api/posts/invalid-id/comments')
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('returns 400 for invalid query params when getting comments', async () => {
    const post = await createPost();

    const { body } = await request(app.getHttpServer())
      .get(`/api/posts/${post.id}/comments`)
      .query({ sortBy: 'invalid', pageSize: 0 })
      .expect(HttpStatus.BAD_REQUEST);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'sortBy' }),
        expect.objectContaining({ field: 'pageSize' }),
      ]),
    );
  });

  it('returns 404 if post does not exist when getting comments', async () => {
    await request(app.getHttpServer())
      .get('/api/posts/507f1f77bcf86cd799439011/comments')
      .expect(HttpStatus.NOT_FOUND);
  });

  it('creates comment for requested post id', async () => {
    const post = await createPost();
    const { user, token } = await createUserAndGetToken(
      app,
      basicAuthorization,
      { prefix: 'u' },
    );
    const payload = {
      content:
        'This comment is created through post comments endpoint successfully.',
    };

    const { body } = await request(app.getHttpServer())
      .post(`/api/posts/${post.id}/comments`)
      .set({ Authorization: `Bearer ${token}` })
      .send(payload)
      .expect(HttpStatus.CREATED);

    expect(body).toEqual({
      id: expect.any(String),
      content: payload.content,
      commentatorInfo: {
        userId: user.id,
        userLogin: user.login,
      },
      likesInfo: {
        dislikesCount: 0,
        likesCount: 0,
        myStatus: 'None',
      },
      createdAt: expect.any(String),
    });

    await request(app.getHttpServer())
      .get(`/api/comments/${body.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(HttpStatus.OK);
  });

  it('returns 401 when creating comment without auth', async () => {
    const post = await createPost();

    await request(app.getHttpServer())
      .post(`/api/posts/${post.id}/comments`)
      .send({
        content: 'This request should fail because there is no auth token.',
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 400 when creating comment with invalid payload', async () => {
    const post = await createPost();
    const { token } = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'u',
    });

    const { body } = await request(app.getHttpServer())
      .post(`/api/posts/${post.id}/comments`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ content: 'too short' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'content' })]),
    );
  });

  it('returns 400 when creating comment with invalid post id format', async () => {
    const { token } = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'u',
    });

    await request(app.getHttpServer())
      .post('/api/posts/invalid-id/comments')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        content: 'This request has valid content but invalid post id format.',
      })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('returns 404 when creating comment for non-existent post', async () => {
    const { token } = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'u',
    });

    await request(app.getHttpServer())
      .post('/api/posts/507f1f77bcf86cd799439011/comments')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        content: 'This request has valid content but the post does not exist.',
      })
      .expect(HttpStatus.NOT_FOUND);
  });
});
