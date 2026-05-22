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

describe('CommentsController (e2e) - comments by id endpoints', () => {
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

  const createPost = async () => {
    const blog: CreateBlogInputDto = {
      description: 'Comments blog description',
      name: 'Comments Blog',
      websiteUrl: 'https://comments-blog.com',
    };

    const blogResponse = await request(app.getHttpServer())
      .post('/api/blogs')
      .set(basicAuthorization)
      .send(blog)
      .expect(HttpStatus.CREATED);

    const post: CreatePostInputDto = {
      title: 'Comments post',
      shortDescription: 'Comments post short description',
      content: 'Comments post content',
      blogId: blogResponse.body.id,
    };

    const postResponse = await request(app.getHttpServer())
      .post('/api/posts')
      .set(basicAuthorization)
      .send(post)
      .expect(HttpStatus.CREATED);

    return postResponse.body;
  };

  const createAuthorizedUser = async () =>
    createUserAndGetToken(app, basicAuthorization, {
      prefix: 'cu',
      domain: 'example.com',
    });

  const createCommentForPost = async (
    postId: string,
    token: string,
    content: string,
  ) => {
    const { body } = await request(app.getHttpServer())
      .post(`/api/posts/${postId}/comments`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ content })
      .expect(HttpStatus.CREATED);

    return body;
  };

  it('gets comment by id without auth', async () => {
    const post = await createPost();
    const { user, token } = await createAuthorizedUser();

    const createdComment = await createCommentForPost(
      post.id,
      token,
      'This is a valid comment content for get by id endpoint.',
    );

    const { body } = await request(app.getHttpServer())
      .get(`/api/comments/${createdComment.id}`)
      .expect(HttpStatus.OK);

    expect(body).toEqual({
      id: createdComment.id,
      content: createdComment.content,
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
  });

  it('returns 404 when comment is not found', async () => {
    await request(app.getHttpServer())
      .get('/api/comments/507f1f77bcf86cd799439011')
      .expect(HttpStatus.NOT_FOUND);
  });

  it('updates own comment by id', async () => {
    const post = await createPost();
    const { token } = await createAuthorizedUser();

    const comment = await createCommentForPost(
      post.id,
      token,
      'This is the original comment content before update.',
    );

    const updatedContent =
      'This comment has been updated by the owner successfully.';

    await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ content: updatedContent })
      .expect(HttpStatus.NO_CONTENT);

    const { body } = await request(app.getHttpServer())
      .get(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(HttpStatus.OK);

    expect(body.content).toBe(updatedContent);
  });

  it("returns 403 when updating someone else's comment", async () => {
    const post = await createPost();
    const owner = await createAuthorizedUser();
    const intruder = await createAuthorizedUser();

    const comment = await createCommentForPost(
      post.id,
      owner.token,
      'This comment belongs to the owner and cannot be updated by others.',
    );

    await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${intruder.token}` })
      .send({ content: 'This should fail because user is not the owner.' })
      .expect(HttpStatus.FORBIDDEN);
  });

  it('returns 400 when updating comment with invalid payload', async () => {
    const post = await createPost();
    const user = await createAuthorizedUser();

    const comment = await createCommentForPost(
      post.id,
      user.token,
      'This comment will be used to check update payload validation.',
    );

    const { body } = await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${user.token}` })
      .send({ content: 'too short' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'content' })]),
    );
  });

  it('creates and updates like status for comment by id', async () => {
    const post = await createPost();
    const owner = await createAuthorizedUser();
    const liker = await createAuthorizedUser();

    const comment = await createCommentForPost(
      post.id,
      owner.token,
      'Comment for like status updates and read model verification.',
    );

    await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    const likerViewAfterLike = await request(app.getHttpServer())
      .get(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .expect(HttpStatus.OK);

    expect(likerViewAfterLike.body.likesInfo).toEqual({
      likesCount: 1,
      dislikesCount: 0,
      myStatus: 'Like',
    });

    await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Dislike' })
      .expect(HttpStatus.NO_CONTENT);

    const likerViewAfterDislike = await request(app.getHttpServer())
      .get(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .expect(HttpStatus.OK);

    expect(likerViewAfterDislike.body.likesInfo).toEqual({
      likesCount: 0,
      dislikesCount: 1,
      myStatus: 'Dislike',
    });

    const ownerViewAfterDislike = await request(app.getHttpServer())
      .get(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${owner.token}` })
      .expect(HttpStatus.OK);

    expect(ownerViewAfterDislike.body.likesInfo).toEqual({
      likesCount: 0,
      dislikesCount: 1,
      myStatus: 'None',
    });

    await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'None' })
      .expect(HttpStatus.NO_CONTENT);

    const likerViewAfterReset = await request(app.getHttpServer())
      .get(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .expect(HttpStatus.OK);

    expect(likerViewAfterReset.body.likesInfo).toEqual({
      likesCount: 0,
      dislikesCount: 0,
      myStatus: 'None',
    });
  });

  it('returns 401 when updating like status without auth', async () => {
    const post = await createPost();
    const owner = await createAuthorizedUser();

    const comment = await createCommentForPost(
      post.id,
      owner.token,
      'Comment for unauthorized like status endpoint verification.',
    );

    await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}/like-status`)
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 400 when updating like status with invalid payload', async () => {
    const post = await createPost();
    const owner = await createAuthorizedUser();
    const liker = await createAuthorizedUser();

    const comment = await createCommentForPost(
      post.id,
      owner.token,
      'Comment for invalid like status payload validation checks.',
    );

    const { body } = await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'invalid-status' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'likeStatus' }),
      ]),
    );
  });

  it('returns 404 when updating like status for non-existent comment', async () => {
    const liker = await createAuthorizedUser();

    await request(app.getHttpServer())
      .put('/api/comments/507f1f77bcf86cd799439011/like-status')
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NOT_FOUND);
  });

  it('returns 400 when updating like status with invalid comment id format', async () => {
    const liker = await createAuthorizedUser();

    await request(app.getHttpServer())
      .put('/api/comments/invalid-id/like-status')
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('is idempotent when setting the same like status repeatedly', async () => {
    const post = await createPost();
    const owner = await createAuthorizedUser();
    const liker = await createAuthorizedUser();

    const comment = await createCommentForPost(
      post.id,
      owner.token,
      'Comment for idempotent like status update checks in comments endpoint.',
    );

    await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    const { body: afterFirstLike } = await request(app.getHttpServer())
      .get(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .expect(HttpStatus.OK);

    expect(afterFirstLike.likesInfo).toEqual({
      likesCount: 1,
      dislikesCount: 0,
      myStatus: 'Like',
    });

    await request(app.getHttpServer())
      .put(`/api/comments/${comment.id}/like-status`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .send({ likeStatus: 'Like' })
      .expect(HttpStatus.NO_CONTENT);

    const { body: afterSecondLike } = await request(app.getHttpServer())
      .get(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${liker.token}` })
      .expect(HttpStatus.OK);

    expect(afterSecondLike.likesInfo).toEqual({
      likesCount: 1,
      dislikesCount: 0,
      myStatus: 'Like',
    });
  });

  it('deletes own comment by id', async () => {
    const post = await createPost();
    const user = await createAuthorizedUser();

    const comment = await createCommentForPost(
      post.id,
      user.token,
      'This comment will be removed by the owner through delete endpoint.',
    );

    await request(app.getHttpServer())
      .delete(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${user.token}` })
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${user.token}` })
      .expect(HttpStatus.NOT_FOUND);
  });

  it("returns 403 when deleting someone else's comment", async () => {
    const post = await createPost();
    const owner = await createAuthorizedUser();
    const intruder = await createAuthorizedUser();

    const comment = await createCommentForPost(
      post.id,
      owner.token,
      'This comment belongs to owner and intruder should not delete it.',
    );

    await request(app.getHttpServer())
      .delete(`/api/comments/${comment.id}`)
      .set({ Authorization: `Bearer ${intruder.token}` })
      .expect(HttpStatus.FORBIDDEN);
  });
});
