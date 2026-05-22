import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { CreatePostInputDto } from '../../src/modules/bloggers-platform/posts/api/dto';
import {
  createErrorMessages,
  runAfterAllSetup,
  runBeforeAllSetup,
} from '../helpers';

describe('PostsController (e2e) - POST /api/posts', () => {
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

  it('creates a new post', async () => {
    const blog = await createBlog();

    const newPost: CreatePostInputDto = {
      title: 'New title',
      blogId: blog.id,
      content: 'New content',
      shortDescription: 'New short description',
    };

    const { body } = await request(app.getHttpServer())
      .post('/api/posts')
      .set(basicAuthorization)
      .send(newPost)
      .expect(HttpStatus.CREATED);

    expect(body).toEqual({
      id: expect.any(String),
      ...newPost,
      blogName: blog.name,
      createdAt: expect.any(String),
      extendedLikesInfo: {
        likesCount: 0,
        dislikesCount: 0,
        myStatus: 'None',
        newestLikes: [],
      },
    });

    const { body: allPostsResponse } = await request(app.getHttpServer())
      .get('/api/posts')
      .expect(HttpStatus.OK);

    expect(allPostsResponse).toEqual({
      pagesCount: 1,
      page: 1,
      pageSize: 10,
      totalCount: 1,
      items: [body],
    });
  });

  describe('post payload validation', () => {
    let blogId: string;

    beforeEach(async () => {
      const blog = await createBlog();
      blogId = blog.id;
    });

    describe('title', () => {
      it('returns 400 status code and proper error object if `title` is missing', async () => {
        // @ts-expect-error bad request (title is missing)
        const newPost: CreatePostInputDto = {
          blogId,
          content: 'New content',
          shortDescription: 'New short description',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ title: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `title` type', async () => {
        const newPost: CreatePostInputDto = {
          // @ts-expect-error bad request (title type is invalid)
          title: [],
          blogId,
          content: 'New content',
          shortDescription: 'New short description',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ title: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `title` max length', async () => {
        const newPost: CreatePostInputDto = {
          title: 'a'.repeat(31),
          blogId,
          content: 'New content',
          shortDescription: 'New short description',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ title: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });

    describe('shortDescription', () => {
      it('returns 400 status code and proper error object if `shortDescription` is missing', async () => {
        // @ts-expect-error bad request (shortDescription is missing)
        const newPost: CreatePostInputDto = {
          title: 'New title',
          blogId,
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(
          createErrorMessages({ shortDescription: ['isRequired'] }),
        ).toEqual(body.errorsMessages);
      });

      it('returns 400 status code and proper error object for bad `shortDescription` type', async () => {
        const newPost: CreatePostInputDto = {
          title: 'New title',
          // @ts-expect-error bad request (shortDescription type is invalid)
          shortDescription: [],
          blogId,
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ shortDescription: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `shortDescription` max length', async () => {
        const newPost: CreatePostInputDto = {
          title: 'New title',
          shortDescription: 'a'.repeat(101),
          blogId,
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(
          createErrorMessages({ shortDescription: ['maxLength'] }),
        ).toEqual(body.errorsMessages);
      });
    });

    describe('content', () => {
      it('returns 400 status code and proper error object if `content` is missing', async () => {
        // @ts-expect-error bad request (content is missing)
        const newPost: CreatePostInputDto = {
          title: 'New title',
          blogId,
          shortDescription: 'New short description',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ content: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `content` type', async () => {
        const newPost: CreatePostInputDto = {
          title: 'New title',
          blogId,
          shortDescription: 'New short description',
          // @ts-expect-error bad request (content type is invalid)
          content: [],
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ content: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `content` max length', async () => {
        const newPost: CreatePostInputDto = {
          title: 'New title',
          blogId,
          shortDescription: 'New short description',
          content: 'a'.repeat(1001),
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ content: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });

    describe('blogId', () => {
      it('returns 400 status code and proper error object if `blogId` is missing', async () => {
        // @ts-expect-error bad request (blogId is missing)
        const newPost: CreatePostInputDto = {
          title: 'New title',
          shortDescription: 'New short description',
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ blogId: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `blogId` type', async () => {
        const newPost: CreatePostInputDto = {
          title: 'New title',
          // @ts-expect-error bad request (blogId type is invalid)
          blogId: [],
          shortDescription: 'New short description',
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ blogId: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 404 status code and proper error object if `blogId` does not exist', async () => {
        const newPost: CreatePostInputDto = {
          title: 'New title',
          blogId: '507f1f77bcf86cd799439011',
          shortDescription: 'New short description',
          content: 'New content',
        };

        const { body } = await request(app.getHttpServer())
          .post('/api/posts')
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.NOT_FOUND);

        expect(createErrorMessages({ blogId: ['blogIdNotExist'] })).toEqual(
          body.errorsMessages,
        );
      });
    });
  });

  it('returns 401 Unauthorized status code if there is no proper Authorization header', async () => {
    const blog = await createBlog();

    const newPost: CreatePostInputDto = {
      title: 'New title',
      blogId: blog.id,
      content: 'New content',
      shortDescription: 'New short description',
    };

    await request(app.getHttpServer())
      .post('/api/posts')
      .send(newPost)
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
