import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtCookiesAuthGuard } from '../../users/guards/bearer';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserContextWithDeviceIdDto } from '../../users/guards/dto';
import { ExtractUserFromRequest } from '../../users/guards/decorators';
import { DevicesQueryRepository } from '../infrastructure';
import { DeviceViewDto } from './dto';
import {
  GetAllAuthSessionDevicesApi,
  TerminateAuthDeviceSessionByIdApi,
  TerminateAuthDeviceSessionExceptCurrentApi,
} from './swagger';
import {
  TerminateAllDevicesExceptCurrentCommand,
  TerminateDeviceByDeviceIdCommand,
} from '../application/use-cases';
import { UUIDValidationPipe } from '../../../../core/pipes';

@Controller('security/devices')
@ApiBearerAuth()
@UseGuards(JwtCookiesAuthGuard)
export class DevicesController {
  constructor(
    private devicesQueryRepository: DevicesQueryRepository,
    private commandBus: CommandBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @GetAllAuthSessionDevicesApi()
  async getAllDevices(
    @ExtractUserFromRequest() user: UserContextWithDeviceIdDto,
  ): Promise<DeviceViewDto[]> {
    const devices = await this.devicesQueryRepository.getAllByUserId(
      user.userId,
    );

    return devices.map(DeviceViewDto.mapToView);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @TerminateAuthDeviceSessionExceptCurrentApi()
  async deleteAllDevicesExceptCurrent(
    @ExtractUserFromRequest() user: UserContextWithDeviceIdDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new TerminateAllDevicesExceptCurrentCommand(user.deviceId, user.userId),
    );
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @TerminateAuthDeviceSessionByIdApi()
  async deleteDeviceById(
    @Param('deviceId', UUIDValidationPipe) deviceId: string,
    @ExtractUserFromRequest() user: UserContextWithDeviceIdDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new TerminateDeviceByDeviceIdCommand(deviceId, user.userId),
    );
  }
}
