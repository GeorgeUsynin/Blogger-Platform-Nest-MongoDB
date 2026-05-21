export { BlogsController } from './api';
export { Blog, BlogSchema } from './domain';
import {
  CreateBlogUseCase,
  UpdateBlogUseCase,
  DeleteBlogUseCase,
} from './application/use-cases';
import { BlogsRepository, BlogsQueryRepository } from './infrastructure';

const blogsUseCases = [CreateBlogUseCase, UpdateBlogUseCase, DeleteBlogUseCase];

export const blogsProviders = [
  BlogsRepository,
  BlogsQueryRepository,
  ...blogsUseCases,
];
