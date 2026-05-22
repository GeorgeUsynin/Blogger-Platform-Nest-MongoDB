import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { UpdateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import {
  createErrorMessages,
  runAfterAllSetup,
  runBeforeAllSetup,
} from '../helpers';

describe('BlogsController (e2e) - PUT /api/blogs/:id', () => {
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

  it('updates blog by id', async () => {
    const createdBlog = await createBlog();

    const updatedBlog: UpdateBlogInputDto = {
      description: 'New description',
      name: 'New name',
      websiteUrl: 'https://website.com',
    };

    await request(app.getHttpServer())
      .put(`/api/blogs/${createdBlog.id}`)
      .set(basicAuthorization)
      .send(updatedBlog)
      .expect(HttpStatus.NO_CONTENT);

    const { body } = await request(app.getHttpServer())
      .get(`/api/blogs/${createdBlog.id}`)
      .expect(HttpStatus.OK);

    expect(body).toEqual({
      ...createdBlog,
      ...updatedBlog,
    });
  });

  describe('blog payload validation', () => {
    let requestedId: string;

    beforeEach(async () => {
      const blog = await createBlog();
      requestedId = blog.id;
    });

    describe('name', () => {
      it('returns 400 status code and proper error object if `name` is missing', async () => {
        // @ts-expect-error bad request (name is missing)
        const updatedBlog: UpdateBlogInputDto = {
          description: 'New description',
          websiteUrl: 'https://website.com',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ name: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `name` type', async () => {
        const updatedBlog: UpdateBlogInputDto = {
          // @ts-expect-error bad request (name type is invalid)
          name: [],
          description: 'New description',
          websiteUrl: 'https://website.com',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ name: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `name` max length', async () => {
        const updatedBlog: UpdateBlogInputDto = {
          name: 'More than fifteen characters',
          description: 'New description',
          websiteUrl: 'https://website.com',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ name: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });

    describe('description', () => {
      it('returns 400 status code and proper error object if `description` is missing', async () => {
        // @ts-expect-error bad request (description is missing)
        const updatedBlog: UpdateBlogInputDto = {
          name: 'New name',
          websiteUrl: 'https://website.com',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ description: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `description` type', async () => {
        const updatedBlog: UpdateBlogInputDto = {
          name: 'New name',
          // @ts-expect-error bad request (description type is invalid)
          description: [],
          websiteUrl: 'https://website.com',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ description: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `description` max length', async () => {
        const updatedBlog: UpdateBlogInputDto = {
          name: 'New name',
          description: 'a'.repeat(501),
          websiteUrl: 'https://website.com',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ description: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });

    describe('websiteUrl', () => {
      it('returns 400 status code and proper error object if `websiteUrl` is missing', async () => {
        // @ts-expect-error bad request (websiteUrl is missing)
        const updatedBlog: UpdateBlogInputDto = {
          name: 'New name',
          description: 'New description',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ websiteUrl: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `websiteUrl` type', async () => {
        const updatedBlog: UpdateBlogInputDto = {
          name: 'New name',
          description: 'New description',
          // @ts-expect-error bad request (websiteUrl type is invalid)
          websiteUrl: [],
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ websiteUrl: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `websiteUrl` max length', async () => {
        const updatedBlog: UpdateBlogInputDto = {
          name: 'New name',
          description: 'New description',
          websiteUrl: `https://${'a'.repeat(95)}.com`,
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ websiteUrl: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for invalid `websiteUrl` format', async () => {
        const updatedBlog: UpdateBlogInputDto = {
          name: 'Eco Lifestyle',
          description: 'Eco lifestyle description',
          websiteUrl: 'invalid-url',
        };

        const { body } = await request(app.getHttpServer())
          .put(`/api/blogs/${requestedId}`)
          .set(basicAuthorization)
          .send(updatedBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ websiteUrl: ['isPattern'] })).toEqual(
          body.errorsMessages,
        );
      });
    });
  });

  it('returns 401 Unauthorized status code if there is no proper Authorization header', async () => {
    const blog = await createBlog();

    const updatedBlog: UpdateBlogInputDto = {
      description: 'Eco lifestyle description',
      name: 'Eco Lifestyle',
      websiteUrl: 'https://ecolifestyle.com',
    };

    await request(app.getHttpServer())
      .put(`/api/blogs/${blog.id}`)
      .send(updatedBlog)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 404 status code if blog was not found by requested ID', async () => {
    const fakeRequestedId = '507f1f77bcf86cd799439011';

    const updatedBlog: UpdateBlogInputDto = {
      description: 'New description',
      name: 'New name',
      websiteUrl: 'https://ecolifestyle.com',
    };

    await request(app.getHttpServer())
      .put(`/api/blogs/${fakeRequestedId}`)
      .set(basicAuthorization)
      .send(updatedBlog)
      .expect(HttpStatus.NOT_FOUND);
  });
});
