import { INestApplication } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CreateBlogInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { CreatePostWithoutBlogIdInputDto } from '../../src/modules/bloggers-platform/blogs/api/dto';
import { runAfterAllSetup, runBeforeAllSetup } from '../helpers';

describe('BlogsController (e2e) - GET /api/blogs/:blogId/posts', () => {
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

  const createPostForBlog = async (
    blogId: string,
    title: string,
    shortDescription: string,
  ) => {
    const newPost: CreatePostWithoutBlogIdInputDto = {
      title,
      shortDescription,
      content: `${title} content`,
    };

    const { body } = await request(app.getHttpServer())
      .post(`/api/blogs/${blogId}/posts`)
      .set(basicAuthorization)
      .send(newPost)
      .expect(HttpStatus.CREATED);

    return body;
  };

  it('returns posts for requested blog id with pagination and sorting', async () => {
    const blog = await createBlog('Tech World');

    await createPostForBlog(blog.id, 'Gamma Post', 'About gamma');
    await createPostForBlog(blog.id, 'Alpha Post', 'About alpha');

    const { body } = await request(app.getHttpServer())
      .get(`/api/blogs/${blog.id}/posts`)
      .query({
        sortBy: 'title',
        sortDirection: 'asc',
        pageNumber: 2,
        pageSize: 1,
      })
      .expect(HttpStatus.OK);

    expect(body.pagesCount).toBe(2);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(1);
    expect(body.totalCount).toBe(2);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe('Gamma Post');
  });

  it('returns 400 for invalid blog id format', async () => {
    await request(app.getHttpServer())
      .get('/api/blogs/invalid-id/posts')
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('returns 400 for invalid query params', async () => {
    const blog = await createBlog('Eco Life');

    const { body } = await request(app.getHttpServer())
      .get(`/api/blogs/${blog.id}/posts`)
      .query({ sortBy: 'invalid', pageSize: 0 })
      .expect(HttpStatus.BAD_REQUEST);

    expect(body.errorsMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'sortBy' }),
        expect.objectContaining({ field: 'pageSize' }),
      ]),
    );
  });

  it('returns 404 if blog does not exist', async () => {
    await request(app.getHttpServer())
      .get('/api/blogs/507f1f77bcf86cd799439011/posts')
      .expect(HttpStatus.NOT_FOUND);
  });
});
