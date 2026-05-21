import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { ENV_VARIABLE_NAMES, ENVIRONMENTS } from '../../constants';
import { configValidationUtility } from './config-validation.utility';

@Injectable()
export class CoreConfig {
  @IsNumber(
    {},
    {
      message: 'Set Env variable PORT, example: 3000',
    },
  )
  @IsNotEmpty({
    message: 'Set Env variable PORT, example: 3000',
  })
  [ENV_VARIABLE_NAMES.PORT]: number = Number(
    this.configService.get(ENV_VARIABLE_NAMES.PORT),
  );

  @IsEnum(ENVIRONMENTS, {
    message:
      'Ser correct NODE_ENV value, available values: ' +
      configValidationUtility.getEnumValues(ENVIRONMENTS).join(', '),
  })
  [ENV_VARIABLE_NAMES.NODE_ENV]: string = this.configService.get(
    ENV_VARIABLE_NAMES.NODE_ENV,
  ) as string;

  @IsNotEmpty({
    message: 'Set Env variable MONGO_URL, example: mongodb://localhost/',
  })
  [ENV_VARIABLE_NAMES.MONGO_URL]: string = this.configService.get(
    ENV_VARIABLE_NAMES.MONGO_URL,
  ) as string;

  @IsNotEmpty({
    message: 'Set Env variable DB_NAME, example: database-name',
  })
  [ENV_VARIABLE_NAMES.DB_NAME]: string = this.configService.get(
    ENV_VARIABLE_NAMES.DB_NAME,
  ) as string;

  @IsEmail()
  @IsNotEmpty({
    message:
      'Set Env variable EMAIL_BLOG_PLATFORM, example: example@example.com',
  })
  [ENV_VARIABLE_NAMES.EMAIL_BLOG_PLATFORM]: string = this.configService.get(
    ENV_VARIABLE_NAMES.EMAIL_BLOG_PLATFORM,
  ) as string;

  @IsNotEmpty({
    message: 'Set Env variable EMAIL_BLOG_PLATFORM_PASSWORD',
  })
  [ENV_VARIABLE_NAMES.EMAIL_BLOG_PLATFORM_PASSWORD]: string =
    this.configService.get(
      ENV_VARIABLE_NAMES.EMAIL_BLOG_PLATFORM_PASSWORD,
    ) as string;

  @IsBoolean({
    message:
      'Set Env variable IS_SWAGGER_ENABLED to enable/disable Swagger, example: true, available values: true, false',
  })
  [ENV_VARIABLE_NAMES.IS_SWAGGER_ENABLED]: boolean =
    configValidationUtility.convertToBoolean(
      this.configService.get(ENV_VARIABLE_NAMES.IS_SWAGGER_ENABLED) as string,
    ) as boolean;

  @IsBoolean({
    message:
      'Set Env variable INCLUDE_TESTING_MODULE to enable/disable Dangerous for production TestingModule, example: true, available values: true, false, 0, 1',
  })
  [ENV_VARIABLE_NAMES.INCLUDE_TESTING_MODULE]: boolean =
    configValidationUtility.convertToBoolean(
      this.configService.get(
        ENV_VARIABLE_NAMES.INCLUDE_TESTING_MODULE,
      ) as string,
    ) as boolean;

  @IsNumber(
    {},
    {
      message: 'Set Env variable API_REQUEST_MAXIMUM_LIMIT, example: 5',
    },
  )
  @IsNotEmpty({
    message: 'Set Env variable API_REQUEST_MAXIMUM_LIMIT, example: 5',
  })
  [ENV_VARIABLE_NAMES.API_REQUEST_MAXIMUM_LIMIT]: number = Number(
    this.configService.get(ENV_VARIABLE_NAMES.API_REQUEST_MAXIMUM_LIMIT),
  );

  @IsNumber(
    {},
    {
      message:
        'Set Env variable API_REQUEST_TIME_TO_LIVE, example: 10000 (milliseconds)',
    },
  )
  @IsNotEmpty({
    message:
      'Set Env variable API_REQUEST_TIME_TO_LIVE, example: 10000 (milliseconds)',
  })
  [ENV_VARIABLE_NAMES.API_REQUEST_TIME_TO_LIVE]: number = Number(
    this.configService.get(ENV_VARIABLE_NAMES.API_REQUEST_TIME_TO_LIVE),
  );

  constructor(private configService: ConfigService) {
    configValidationUtility.validateConfig(this);
  }
}
