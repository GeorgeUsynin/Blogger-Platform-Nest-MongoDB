import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentNotFoundError } from '../../../../../core/exceptions';
import { CommentsRepository } from '../../infrastructure';
import { CreateUpdateCommentLikeStatusDto } from '../dto';
import { LikesService } from '../../../likes/application';
import { ParentType } from '../../../likes/domain';

export class CreateUpdateCommentLikeStatusCommand {
  constructor(public readonly dto: CreateUpdateCommentLikeStatusDto) {}
}

@CommandHandler(CreateUpdateCommentLikeStatusCommand)
export class CreateUpdateCommentLikeStatusUseCase implements ICommandHandler<CreateUpdateCommentLikeStatusCommand> {
  constructor(
    private likesService: LikesService,
    private commentsRepository: CommentsRepository,
  ) {}

  async execute({ dto }: CreateUpdateCommentLikeStatusCommand): Promise<void> {
    const { commentId, userId, likeStatus } = dto;

    const foundComment = await this.commentsRepository.findById(commentId);
    if (!foundComment) {
      throw new CommentNotFoundError();
    }

    await this.likesService.setLikeStatus({
      authorId: userId,
      parentId: commentId,
      parentType: ParentType.Comment,
      likeStatus,
    });

    // recalculate and update comment likesCount info
    const { likesCount, dislikesCount } =
      await this.likesService.getLikesCounts(commentId, ParentType.Comment);
    foundComment.updateLikesCounts(likesCount, dislikesCount);

    await this.commentsRepository.save(foundComment);
  }
}
