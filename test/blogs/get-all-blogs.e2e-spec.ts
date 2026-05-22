import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('BlogsController (e2e) - GET /api/blogs', () => {
  let app: INestApplication;
  let connection: Connection;
  let basicAuthorization: {
    Authorization: string;
  };

  beforeAll(async () => {
    ({ app, connection, basicAuthorization } = await runBeforeAllSetup());
  });

  beforeEach(async () => {
    const collections = await connection.db!.listCollections().toArray();
    for (const collection of collections) {
      await connection.db!.collection(collection.name).deleteMany({});
    }
  });

  afterAll(async () => {
    if (app) {
      await runAfterAllSetup(app);
    }
  });

  const createBlog = async (name: string) => {
    const newBlog: CreateBlogInputDto = {
      description: `${name} description`,
      name,
      websiteUrl: `https://${name.toLowerCase().replace(/\s+/g, '-')}.com`,
    };

    const { body } = await request(app.getHttpServer())
      .post('/api/blogs')
      .set(basicAuthorization)
      .send(newBlog)
      .expect(HttpStatus.CREATED);

    return body;
  };

  it('gets all available blogs', async () => {
    const firstBlog = await createBlog('Alpha Blog');
    const secondBlog = await createBlog('Tech World');

    const { body } = await request(app.getHttpServer())
      .get('/api/blogs')
      .expect(HttpStatus.OK);

    expect(body).toEqual({
      pagesCount: 1,
      page: 1,
      pageSize: 10,
      totalCount: 2,
      items: [secondBlog, firstBlog],
    });
  });

  it('returns paginated and sorted blogs for query params', async () => {
    await createBlog('Delta Blog');
    await createBlog('Beta Blog');
    await createBlog('Gamma Blog');
    await createBlog('Alpha Blog');

    const { body } = await request(app.getHttpServer())
      .get('/api/blogs')
      .query({
        sortBy: 'name',
        sortDirection: 'asc',
        pageNumber: 2,
        pageSize: 2,
      })
      .expect(HttpStatus.OK);

    expect(body.pagesCount).toBe(2);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(2);
    expect(body.totalCount).toBe(4);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].name).toBe('Delta Blog');
    expect(body.items[1].name).toBe('Gamma Blog');
  });

  it('filters blogs by searchNameTerm', async () => {
    const techBlog = await createBlog('Tech World');
    await createBlog('Eco Life');

    const { body } = await request(app.getHttpServer())
      .get('/api/blogs')
      .query({ searchNameTerm: 'tech' })
      .expect(HttpStatus.OK);

    expect(body).toEqual({
      pagesCount: 1,
      page: 1,
      pageSize: 10,
      totalCount: 1,
      items: [techBlog],
    });
  });

  it('returns 400 for invalid query params', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/blogs')
      .query({ pageNumber: 0, sortDirection: 'invalid' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'sortDirection' }),
        expect.objectContaining({ field: 'pageNumber' }),
      ]),
    );
  });
});
