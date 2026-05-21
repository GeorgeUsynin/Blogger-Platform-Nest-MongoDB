import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
  OmitType,
} from '@nestjs/swagger';
import { SwaggerErrorsMessagesViewDto } from '../../../../../core/dto';
import { SwaggerCreatePostInputDto } from '../../../posts/api/swagger';
import { PostViewDto } from '../../../posts/api/dto';

export const CreatePostByBlogIdApi = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Create new post for specific blog',
    }),
    ApiParam({ name: 'blogId', type: String, description: 'Blog id' }),
    ApiBody({
      type: OmitType(SwaggerCreatePostInputDto, ['blogId'] as const),
      description: 'Data for constructing new Post entity',
      required: false,
    }),
    ApiCreatedResponse({
      type: PostViewDto,
      description: 'Returns the newly created blog',
    }),
    ApiBadRequestResponse({
      description: 'If the inputModel has incorrect values',
      type: SwaggerErrorsMessagesViewDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
    ApiNotFoundResponse({
      description: "If specified blog doesn't exists",
    }),
  );
};
