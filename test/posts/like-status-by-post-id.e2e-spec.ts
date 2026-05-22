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

describe('PostsController (e2e) - PUT /api/posts/:id/like-status', () => {
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
      description: 'Likes blog description',
      name: 'Likes Blog',
      websiteUrl: 'https://likes-blog.com',
    };

    const blogResponse = await request(app.getHttpServer())
      .post('/api/blogs')
      .set(basicAuthorization)
      .send(blog)
      .expect(HttpStatus.CREATED);

    const post: CreatePostInputDto = {
      title: 'Likes post',
      shortDescription: 'Likes post short description',
      content: 'Likes post content',
      blogId: blogResponse.body.id,
    };

    const postResponse = await request(app.getHttpServer())
      .post('/api/posts')
      .set(basicAuthorization)
      .send(post)
      .expect(HttpStatus.CREATED);

    return postResponse.body;
  };

  it('creates and updates like status for post by id', async () => {
    const liker = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });
    const anotherUser = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });
    const post = await createPost();

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    const likerViewAfterLike = await request(app.getHttpServer())
      .get(`/api/posts/${post.id}`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .expect(HttpStatus.OK);

    expect(likerViewAfterLike.body.extendedLikesInfo).toEqual({
      likesCount: 1,
      dislikesCount: 0,
      myStatus: 'Like',
      newestLikes: [
        {
          addedAt: expect.any(String),
          userId: liker.user.id,
          login: liker.user.login,
        },
      ],
    });

    const anotherUserViewAfterLike = await request(app.getHttpServer())
      .get(`/api/posts/${post.id}`)
      .set({ Authorization: `Bearer ${anotherUser.token}` })
      .expect(HttpStatus.OK);

    expect(anotherUserViewAfterLike.body.extendedLikesInfo.myStatus).toBe(
      'None',
    );

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Dislike' })
      .expect(HttpStatus.NO_CONTENT);

    const likerViewAfterDislike = await request(app.getHttpServer())
      .get(`/api/posts/${post.id}`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .expect(HttpStatus.OK);

    expect(likerViewAfterDislike.body.extendedLikesInfo).toEqual({
      likesCount: 0,
      dislikesCount: 1,
      myStatus: 'Dislike',
      newestLikes: [],
    });

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'None' })
      .expect(HttpStatus.NO_CONTENT);

    const likerViewAfterReset = await request(app.getHttpServer())
      .get(`/api/posts/${post.id}`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .expect(HttpStatus.OK);

    expect(likerViewAfterReset.body.extendedLikesInfo).toEqual({
      likesCount: 0,
      dislikesCount: 0,
      myStatus: 'None',
      newestLikes: [],
    });
  });

  it('returns 401 when updating like status without auth', async () => {
    const post = await createPost();

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 400 when updating like status with invalid payload', async () => {
    const liker = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });
    const post = await createPost();

    const { body } = await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'invalid-status' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'likeStatus' }),
      ]),
    );
  });

  it('returns 404 when updating like status for non-existent post', async () => {
    const liker = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });

    await request(app.getHttpServer())
      .put('/api/posts/507f1f77bcf86cd799439011/like-status')
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NOT_FOUND);
  });

  it('returns 400 when updating like status with invalid post id format', async () => {
    const liker = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });

    await request(app.getHttpServer())
      .put('/api/posts/invalid-id/like-status')
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('is idempotent when setting the same like status repeatedly', async () => {
    const liker = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });
    const post = await createPost();

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    const { body } = await request(app.getHttpServer())
      .get(`/api/posts/${post.id}`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .expect(HttpStatus.OK);

    expect(body.extendedLikesInfo.likesCount).toBe(1);
    expect(body.extendedLikesInfo.dislikesCount).toBe(0);
    expect(body.extendedLikesInfo.myStatus).toBe('Like');
    expect(body.extendedLikesInfo.newestLikes).toHaveLength(1);
  });

  it('returns only 3 newest likes when 4 users like the same post', async () => {
    const liker1 = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });
    const liker2 = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });
    const liker3 = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });
    const liker4 = await createUserAndGetToken(app, basicAuthorization, {
      prefix: 'pl',
      domain: 'example.com',
    });
    const post = await createPost();

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker1.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker2.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker3.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .put(`/api/posts/${post.id}/like-status`)
      .set({ Authorization: `Bearer ${liker4.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    const { body } = await request(app.getHttpServer())
      .get(`/api/posts/${post.id}`)
      .set({ Authorization: `Bearer ${liker4.token}` })
      .expect(HttpStatus.OK);

    expect(body.extendedLikesInfo.likesCount).toBe(4);
    expect(body.extendedLikesInfo.dislikesCount).toBe(0);
    expect(body.extendedLikesInfo.myStatus).toBe('Like');
    expect(body.extendedLikesInfo.newestLikes).toHaveLength(3);

    const newestLikeUserIds = body.extendedLikesInfo.newestLikes.map(
      (like: { userId: string }) => like.userId,
    );

    expect(newestLikeUserIds).toContain(liker2.user.id);
    expect(newestLikeUserIds).toContain(liker3.user.id);
    expect(newestLikeUserIds).toContain(liker4.user.id);
    expect(newestLikeUserIds).not.toContain(liker1.user.id);
  });
});
