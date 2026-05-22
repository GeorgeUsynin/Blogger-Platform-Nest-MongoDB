import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { CreatePostInputDto } from '../../src/modules/bloggers-platform/posts/api/dto';
import { runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('PostsController (e2e) - GET /api/posts', () => {
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

  const createBlog = async (name: string, websiteUrl: string) => {
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

  const createPost = async (
    blogId: string,
    title: string,
    blogNameHint: string,
  ) => {
    const newPost: CreatePostInputDto = {
      title,
      shortDescription: `${blogNameHint} short description`,
      content: `${blogNameHint} full content`,
      blogId,
    };

    const { body } = await request(app.getHttpServer())
      .post('/api/posts')
      .set(basicAuthorization)
      .send(newPost)
      .expect(HttpStatus.CREATED);

    return body;
  };

  it('gets all available posts', async () => {
    const { body: emptyBody } = await request(app.getHttpServer())
      .get('/api/posts')
      .expect(HttpStatus.OK);

    expect(emptyBody).toEqual({
      pagesCount: 0,
      page: 1,
      pageSize: 10,
      totalCount: 0,
      items: [],
    });

    const blog = await createBlog('Blog A', 'https://bloga.com');
    const firstPost = await createPost(blog.id, 'Post A', 'Blog A');
    const secondPost = await createPost(blog.id, 'Post B', 'Blog A');

    const { body } = await request(app.getHttpServer())
      .get('/api/posts')
      .expect(HttpStatus.OK);

    expect(body).toEqual({
      pagesCount: 1,
      page: 1,
      pageSize: 10,
      totalCount: 2,
      items: [secondPost, firstPost],
    });
  });

  it('returns paginated and sorted posts for query params', async () => {
    const blog = await createBlog('Blog A', 'https://bloga.com');
    await createPost(blog.id, 'Zulu', 'Blog A');
    await createPost(blog.id, 'Echo', 'Blog A');
    await createPost(blog.id, 'Bravo', 'Blog A');
    await createPost(blog.id, 'Alpha', 'Blog A');

    const { body } = await request(app.getHttpServer())
      .get('/api/posts')
      .query({
        sortBy: 'title',
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
    expect(body.items[0].title).toBe('Echo');
    expect(body.items[1].title).toBe('Zulu');
  });

  it('sorts posts by blogName in descending order', async () => {
    const alphaBlog = await createBlog('Alpha Blog', 'https://alpha-blog.com');
    const zuluBlog = await createBlog('Zulu Blog', 'https://zulu-blog.com');

    await createPost(alphaBlog.id, 'Post from alpha', 'Alpha');
    await createPost(zuluBlog.id, 'Post from zulu', 'Zulu');

    const { body } = await request(app.getHttpServer())
      .get('/api/posts')
      .query({ sortBy: 'blogName', sortDirection: 'desc' })
      .expect(HttpStatus.OK);

    expect(body.totalCount).toBe(2);
    expect(body.items[0].blogName).toBe('Zulu Blog');
    expect(body.items[1].blogName).toBe('Alpha Blog');
  });

  it('returns 400 for invalid query params', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/posts')
      .query({ pageSize: 0, sortBy: 'invalid' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'sortBy' }),
        expect.objectContaining({ field: 'pageSize' }),
      ]),
    );
  });
});
