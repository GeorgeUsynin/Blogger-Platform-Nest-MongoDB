import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { CreatePostWithoutBlogIdInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import {
  createErrorMessages,
  runAfterAllSetup,
  runBeforeAllSetup,
} from '../helpers';

describe('BlogsController (e2e) - POST /api/blogs/:blogId/posts', () => {
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

  it('creates a new post for specified blog by blogId', async () => {
    const blog = await createBlog();
    const newPost: CreatePostWithoutBlogIdInputDto = {
      title: 'Sustainable habits',
      shortDescription: 'Simple tips for greener daily routines',
      content: 'Start with small steps: reduce waste, reuse items, and recycle.',
    };

    const { body } = await request(app.getHttpServer())
      .post(`/api/blogs/${blog.id}/posts`)
      .set(basicAuthorization)
      .send(newPost)
      .expect(HttpStatus.CREATED);

    expect(body).toEqual({
      id: expect.any(String),
      ...newPost,
      blogId: blog.id,
      blogName: blog.name,
      createdAt: expect.any(String),
      extendedLikesInfo: {
        likesCount: 0,
        dislikesCount: 0,
        myStatus: 'None',
        newestLikes: [],
      },
    });

    const getResponse = await request(app.getHttpServer())
      .get(`/api/blogs/${blog.id}/posts`)
      .expect(HttpStatus.OK);

    expect(getResponse.body).toEqual({
      pagesCount: 1,
      page: 1,
      pageSize: 10,
      totalCount: 1,
      items: [body],
    });
  });

  it('returns 404 status code if blog is not found by requested ID', async () => {
    const fakeRequestedId = '507f1f77bcf86cd799439011';
    const newPost: CreatePostWithoutBlogIdInputDto = {
      title: 'Sustainable habits',
      shortDescription: 'Simple tips for greener daily routines',
      content: 'Start with small steps: reduce waste, reuse items, and recycle.',
    };

    await request(app.getHttpServer())
      .post(`/api/blogs/${fakeRequestedId}/posts`)
      .set(basicAuthorization)
      .send(newPost)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('returns 401 Unauthorized status code if there is no proper Authorization header', async () => {
    const blog = await createBlog();
    const newPost: CreatePostWithoutBlogIdInputDto = {
      title: 'Sustainable habits',
      shortDescription: 'Simple tips for greener daily routines',
      content: 'Start with small steps: reduce waste, reuse items, and recycle.',
    };

    await request(app.getHttpServer())
      .post(`/api/blogs/${blog.id}/posts`)
      .send(newPost)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  describe('post payload validation', () => {
    const existingBlogId = async () => {
      const blog = await createBlog();
      return blog.id as string;
    };

    describe('title', () => {
      it('returns 400 status code and proper error object if `title` is missing', async () => {
        const blogId = await existingBlogId();

        // @ts-expect-error bad request (title is missing)
        const newPost: CreatePostWithoutBlogIdInputDto = {
          shortDescription: 'Simple tips for greener daily routines',
          content: 'Start with small steps: reduce waste, reuse items, and recycle.',
        };

        const { body } = await request(app.getHttpServer())
          .post(`/api/blogs/${blogId}/posts`)
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ title: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `title` type', async () => {
        const blogId = await existingBlogId();

        const newPost: CreatePostWithoutBlogIdInputDto = {
          // @ts-expect-error bad request (title type is invalid)
          title: [],
          shortDescription: 'Simple tips for greener daily routines',
          content: 'Start with small steps: reduce waste, reuse items, and recycle.',
        };

        const { body } = await request(app.getHttpServer())
          .post(`/api/blogs/${blogId}/posts`)
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ title: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `title` max length', async () => {
        const blogId = await existingBlogId();

        const newPost: CreatePostWithoutBlogIdInputDto = {
          title: 'a'.repeat(31),
          shortDescription: 'Simple tips for greener daily routines',
          content: 'Start with small steps: reduce waste, reuse items, and recycle.',
        };

        const { body } = await request(app.getHttpServer())
          .post(`/api/blogs/${blogId}/posts`)
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
        const blogId = await existingBlogId();

        // @ts-expect-error bad request (shortDescription is missing)
        const newPost: CreatePostWithoutBlogIdInputDto = {
          title: 'Sustainable habits',
          content: 'Start with small steps: reduce waste, reuse items, and recycle.',
        };

        const { body } = await request(app.getHttpServer())
          .post(`/api/blogs/${blogId}/posts`)
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ shortDescription: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `shortDescription` type', async () => {
        const blogId = await existingBlogId();

        const newPost: CreatePostWithoutBlogIdInputDto = {
          title: 'Sustainable habits',
          // @ts-expect-error bad request (shortDescription type is invalid)
          shortDescription: [],
          content: 'Start with small steps: reduce waste, reuse items, and recycle.',
        };

        const { body } = await request(app.getHttpServer())
          .post(`/api/blogs/${blogId}/posts`)
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ shortDescription: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `shortDescription` max length', async () => {
        const blogId = await existingBlogId();

        const newPost: CreatePostWithoutBlogIdInputDto = {
          title: 'Sustainable habits',
          shortDescription: 'a'.repeat(101),
          content: 'Start with small steps: reduce waste, reuse items, and recycle.',
        };

        const { body } = await request(app.getHttpServer())
          .post(`/api/blogs/${blogId}/posts`)
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ shortDescription: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });

    describe('content', () => {
      it('returns 400 status code and proper error object if `content` is missing', async () => {
        const blogId = await existingBlogId();

        // @ts-expect-error bad request (content is missing)
        const newPost: CreatePostWithoutBlogIdInputDto = {
          title: 'Sustainable habits',
          shortDescription: 'Simple tips for greener daily routines',
        };

        const { body } = await request(app.getHttpServer())
          .post(`/api/blogs/${blogId}/posts`)
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ content: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `content` type', async () => {
        const blogId = await existingBlogId();

        const newPost: CreatePostWithoutBlogIdInputDto = {
          title: 'Sustainable habits',
          shortDescription: 'Simple tips for greener daily routines',
          // @ts-expect-error bad request (content type is invalid)
          content: [],
        };

        const { body } = await request(app.getHttpServer())
          .post(`/api/blogs/${blogId}/posts`)
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ content: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `content` max length', async () => {
        const blogId = await existingBlogId();

        const newPost: CreatePostWithoutBlogIdInputDto = {
          title: 'Sustainable habits',
          shortDescription: 'Simple tips for greener daily routines',
          content: 'a'.repeat(1001),
        };

        const { body } = await request(app.getHttpServer())
          .post(`/api/blogs/${blogId}/posts`)
          .set(basicAuthorization)
          .send(newPost)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ content: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });
  });
});
