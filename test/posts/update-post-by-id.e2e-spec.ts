import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import {
  CreatePostInputDto,
  UpdatePostInputDto,
} from '../../src/modules/bloggers-platform/posts/api/dto';
import {
  createErrorMessages,
  runAfterAllSetup,
  runBeforeAllSetup,
} from '../helpers';

describe('PostsController (e2e) - PUT /api/posts/:id', () => {
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

  const createBlog = async (
    name = 'Eco Lifestyle',
    websiteUrl = 'https://ecolifestyle.com',
  ) => {
    const newBlog: CreateBlogInputDto = {
      description: `${name} description`,
      name,
      websiteUrl,
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
      title: 'Original title',
      blogId: blog.id,
      content: 'Original content',
      shortDescription: 'Original short description',
    };

    const { body } = await request(app.getHttpServer())
      .post('/api/posts')
      .set(basicAuthorization)
      .send(newPost)
      .expect(HttpStatus.CREATED);

    return body;
  };

  it('updates post by id', async () => {
    const createdPost = await createPost();

    const updatedPost: UpdatePostInputDto = {
      title: 'New title',
      blogId: createdPost.blogId,
      content: 'New content',
      shortDescription: 'New short description',
    };

    await request(app.getHttpServer())
      .put(`/api/posts/${createdPost.id}`)
      .set(basicAuthorization)
      .send(updatedPost)
      .expect(HttpStatus.NO_CONTENT);

    const { body } = await request(app.getHttpServer())
      .get(`/api/posts/${createdPost.id}`)
      .expect(HttpStatus.OK);

    expect(body).toEqual({
      ...createdPost,
      ...updatedPost,
      blogName: createdPost.blogName,
      extendedLikesInfo: {
        likesCount: 0,
        dislikesCount: 0,
        myStatus: 'None',
        newestLikes: [],
      },
    });
  });

  describe('post payload validation', () => {
    let requestedId: string;
    let blogId: string;

    beforeEach(async () => {
      const post = await createPost();
      const blog = await createBlog(
        'Validation Blog',
        'https://validation-blog.com',
      );
      requestedId = post.id;
      blogId = blog.id;
    });

    describe('title', () => {
      it('returns 400 status code and proper error object if `title` is missing', async () => {
        // @ts-expect-error bad request
        const payload: UpdatePostInputDto = {
          blogId,
          content: 'New content',
          shortDescription: 'New short description',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ title: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `title` type', async () => {
        const payload: UpdatePostInputDto = {
          // @ts-expect-error bad request
          title: [],
          blogId,
          content: 'New content',
          shortDescription: 'New short description',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ title: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `title` max length', async () => {
        const payload: UpdatePostInputDto = {
          title: 'a'.repeat(31),
          blogId,
          content: 'New content',
          shortDescription: 'New short description',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ title: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });

    describe('shortDescription', () => {
      it('returns 400 status code and proper error object if `shortDescription` is missing', async () => {
        // @ts-expect-error bad request
        const payload: UpdatePostInputDto = {
          title: 'New title',
          blogId,
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(
          createErrorMessages({ shortDescription: ['isRequired'] }),
        ).toEqual(body.errorsMessages);
      });

      it('returns 400 status code and proper error object for bad `shortDescription` type', async () => {
        const payload: UpdatePostInputDto = {
          title: 'New title',
          // @ts-expect-error bad request
          shortDescription: [],
          blogId,
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ shortDescription: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `shortDescription` max length', async () => {
        const payload: UpdatePostInputDto = {
          title: 'New title',
          shortDescription: 'a'.repeat(101),
          blogId,
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(
          createErrorMessages({ shortDescription: ['maxLength'] }),
        ).toEqual(body.errorsMessages);
      });
    });

    describe('content', () => {
      it('returns 400 status code and proper error object if `content` is missing', async () => {
        // @ts-expect-error bad request
        const payload: UpdatePostInputDto = {
          title: 'New title',
          blogId,
          shortDescription: 'New short description',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ content: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `content` type', async () => {
        const payload: UpdatePostInputDto = {
          title: 'New title',
          blogId,
          shortDescription: 'New short description',
          // @ts-expect-error bad request
          content: [],
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ content: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `content` max length', async () => {
        const payload: UpdatePostInputDto = {
          title: 'New title',
          blogId,
          shortDescription: 'New short description',
          content: 'a'.repeat(1001),
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ content: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });

    describe('blogId', () => {
      it('returns 400 status code and proper error object if `blogId` is missing', async () => {
        // @ts-expect-error bad request
        const payload: UpdatePostInputDto = {
          title: 'New title',
          shortDescription: 'New short description',
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ blogId: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `blogId` type', async () => {
        const payload: UpdatePostInputDto = {
          title: 'New title',
          // @ts-expect-error bad request
          blogId: [],
          shortDescription: 'New short description',
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ blogId: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 404 status code and proper error object if `blogId` does not exist', async () => {
        const payload: UpdatePostInputDto = {
          title: 'New title',
          blogId: '507f1f77bcf86cd799439011',
          shortDescription: 'New short description',
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/posts/${requestedId}`)
          .set(basicAuthorization)
          .send(payload)
          .expect(HttpStatus.NOT_FOUND);

        expect(createErrorMessages({ blogId: ['blogIdNotExist'] })).toEqual(
          body.errorsMessages,
        );
      });
    });
  });

  it('returns 401 Unauthorized status code if there is no proper Authorization header', async () => {
    const createdPost = await createPost();

    const updatedPost: UpdatePostInputDto = {
      title: 'New title',
      blogId: createdPost.blogId,
      content: 'New content',
      shortDescription: 'New short description',
    };

    await request(app.getHttpServer())
      .put(`/api/posts/${createdPost.id}`)
      .send(updatedPost)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 404 status code if there is no post in database', async () => {
    const blog = await createBlog();

    const updatedPost: UpdatePostInputDto = {
      title: 'New title',
      blogId: blog.id,
      content: 'New content',
      shortDescription: 'New short description',
    };

    await request(app.getHttpServer())
      .put('/api/posts/507f1f77bcf86cd799439011')
      .set(basicAuthorization)
      .send(updatedPost)
      .expect(HttpStatus.NOT_FOUND);
  });
});
