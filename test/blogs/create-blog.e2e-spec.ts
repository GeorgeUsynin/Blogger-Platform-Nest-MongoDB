import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { HttpStatus } from '@nestjs/common';
import {
  runBeforeAllSetup,
  runAfterAllSetup,
  createErrorMessages,
} from '../helpers';

describe('BlogsController (e2e)', () => {
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

  it('creates a new blog', async () => {
    const newBlog: CreateBlogInputDto = {
      description: 'Eco lifestyle description',
      name: 'Eco Lifestyle',
      websiteUrl: 'https://ecolifestyle.com',
    };

    //creating new blog
    const response = await request(app.getHttpServer())
      .post('/api/blogs')
      .set(basicAuthorization)
      .send(newBlog)
      .expect(HttpStatus.CREATED);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toEqual({
      id: expect.any(String),
      ...newBlog,
      isMembership: false,
      createdAt: expect.any(String),
    });

    //checking that the blog was created
    const get_response = await request(app.getHttpServer())
      .get('/api/blogs')
      .expect(HttpStatus.OK);

    expect(get_response.body).toEqual({
      pagesCount: 1,
      page: 1,
      pageSize: 10,
      totalCount: 1,
      items: [response.body],
    });
  });

  describe('blog payload validation', () => {
    describe('name', () => {
      it('returns 400 status code and proper error object if `name` is missing', async () => {
        //@ts-expect-error bad request (name is missing)
        const newBlog: CreateBlogInputDto = {
          description: 'Eco lifestyle description',
          websiteUrl: 'https://ecolifestyle.com',
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ name: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `name` type', async () => {
        const newBlog: CreateBlogInputDto = {
          //@ts-expect-error bad request (name type is invalid)
          name: [],
          description: 'Eco lifestyle description',
          websiteUrl: 'https://ecolifestyle.com',
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ name: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `name` max length', async () => {
        const newBlog: CreateBlogInputDto = {
          name: 'More than fifteen characters',
          description: 'Eco lifestyle description',
          websiteUrl: 'https://ecolifestyle.com',
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ name: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });

    describe('description', () => {
      it('returns 400 status code and proper error object if `description` is missing', async () => {
        //@ts-expect-error bad request (description is missing)
        const newBlog: CreateBlogInputDto = {
          name: 'Eco Lifestyle',
          websiteUrl: 'https://ecolifestyle.com',
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ description: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `description` type', async () => {
        const newBlog: CreateBlogInputDto = {
          name: 'Eco Lifestyle',
          //@ts-expect-error bad request (description type is invalid)
          description: [],
          websiteUrl: 'https://ecolifestyle.com',
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ description: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `description` max length', async () => {
        const newBlog: CreateBlogInputDto = {
          name: 'Eco Lifestyle',
          description: 'a'.repeat(501),
          websiteUrl: 'https://ecolifestyle.com',
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ description: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });
    });

    describe('websiteUrl', () => {
      it('returns 400 status code and proper error object if `websiteUrl` is missing', async () => {
        //@ts-expect-error bad request (websiteUrl is missing)
        const newBlog: CreateBlogInputDto = {
          name: 'Eco Lifestyle',
          description: 'Eco lifestyle description',
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ websiteUrl: ['isRequired'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `websiteUrl` type', async () => {
        const newBlog: CreateBlogInputDto = {
          name: 'Eco Lifestyle',
          description: 'Eco lifestyle description',
          //@ts-expect-error bad request (websiteUrl type is invalid)
          websiteUrl: [],
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ websiteUrl: ['isString'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for bad `websiteUrl` max length', async () => {
        const newBlog: CreateBlogInputDto = {
          name: 'Eco Lifestyle',
          description: 'Eco lifestyle description',
          websiteUrl: `https://${'a'.repeat(95)}.com`,
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ websiteUrl: ['maxLength'] })).toEqual(
          body.errorsMessages,
        );
      });

      it('returns 400 status code and proper error object for invalid `websiteUrl` format', async () => {
        const newBlog: CreateBlogInputDto = {
          name: 'Eco Lifestyle',
          description: 'Eco lifestyle description',
          websiteUrl: 'invalid-url',
        };
        const { body } = await request(app.getHttpServer())
          .post('/api/blogs')
          .set(basicAuthorization)
          .send(newBlog)
          .expect(HttpStatus.BAD_REQUEST);

        expect(createErrorMessages({ websiteUrl: ['isPattern'] })).toEqual(
          body.errorsMessages,
        );
      });
    });
  });

  it('return 401 Unauthorized status code if there is no proper Authorization header', async () => {
    const newBlog: CreateBlogInputDto = {
      description: 'Eco lifestyle description',
      name: 'Eco Lifestyle',
      websiteUrl: 'https://ecolifestyle.com',
    };

    await request(app.getHttpServer())
      .post('/api/blogs')
      .send(newBlog)
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
