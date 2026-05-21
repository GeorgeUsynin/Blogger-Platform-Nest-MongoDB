import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import mongoose, { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ENV_VARIABLE_NAMES } from '../../src/constants';
import { appSetup } from '../../src/setup';
import { CoreConfig } from '../../src/core/config';
import { INestApplication } from '@nestjs/common';

export const getBasicAuthorization = (login: string, password: string) => {
  const buff = Buffer.from(`${login}:${password}`, 'utf8');
  const codedAuth = buff.toString('base64');

  return { Authorization: `Basic ${codedAuth}` };
};

export const runBeforeAllSetup = async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();

  const coreConfig = app.get<CoreConfig>(CoreConfig);

  appSetup(app, coreConfig);

  await app.init();

  // Connection to DB
  const connection: Connection =
    moduleFixture.get<Connection>(getConnectionToken());

  // Config service
  const configService: ConfigService =
    moduleFixture.get<ConfigService>(ConfigService);

  const adminLogin = configService.get<string>(
    ENV_VARIABLE_NAMES.ADMIN_USERNAME,
  );
  const adminPassword = configService.get<string>(
    ENV_VARIABLE_NAMES.ADMIN_PASSWORD,
  );

  const basicAuthorization = getBasicAuthorization(adminLogin!, adminPassword!);

  // Cleaning all collections
  const collections = await connection.db!.listCollections().toArray();
  for (const collection of collections) {
    await connection.db!.collection(collection.name).deleteMany({});
  }

  return { app, connection, basicAuthorization };
};

export const runAfterAllSetup = async (app: INestApplication) => {
  await app.close();
  await mongoose.connection.close();
};

const websiteUrlPattern =
  /^https:\/\/([a-zA-Z0-9_-]+\.)+[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\/?$/;

export const createErrorMessages = (values: TValues) => {
  const {
    name,
    description,
    websiteUrl,
    title,
    shortDescription,
    content,
    blogId,
  } = values;

  const errorsMessages: CreateUpdateErrorViewModel['errorsMessages'] = [];

  if (name) {
    name.forEach((value) => {
      switch (value) {
        case 'isRequired':
          errorsMessages.push(errorMessagesConfig.isRequired('name'));
          break;
        case 'isString':
          errorsMessages.push(errorMessagesConfig.isString('name'));
          break;
        case 'maxLength':
          errorsMessages.push(errorMessagesConfig.maxLength('name', 15));
          break;
      }
    });
  }

  if (description) {
    description.forEach((value) => {
      switch (value) {
        case 'isRequired':
          errorsMessages.push(errorMessagesConfig.isRequired('description'));
          break;
        case 'isString':
          errorsMessages.push(errorMessagesConfig.isString('description'));
          break;
        case 'maxLength':
          errorsMessages.push(
            errorMessagesConfig.maxLength('description', 500),
          );
          break;
      }
    });
  }

  if (websiteUrl) {
    websiteUrl.forEach((value) => {
      switch (value) {
        case 'isRequired':
          errorsMessages.push(errorMessagesConfig.isRequired('websiteUrl'));
          break;
        case 'isString':
          errorsMessages.push(errorMessagesConfig.isString('websiteUrl'));
          break;
        case 'maxLength':
          errorsMessages.push(errorMessagesConfig.maxLength('websiteUrl', 100));
          break;
        case 'isPattern':
          errorsMessages.push(errorMessagesConfig.isPattern('websiteUrl'));
          break;
      }
    });
  }

  if (title) {
    title.forEach((value) => {
      switch (value) {
        case 'isRequired':
          errorsMessages.push(errorMessagesConfig.isRequired('title'));
          break;
        case 'isString':
          errorsMessages.push(errorMessagesConfig.isString('title'));
          break;
        case 'maxLength':
          errorsMessages.push(errorMessagesConfig.maxLength('title', 30));
          break;
      }
    });
  }

  if (shortDescription) {
    shortDescription.forEach((value) => {
      switch (value) {
        case 'isRequired':
          errorsMessages.push(
            errorMessagesConfig.isRequired('shortDescription'),
          );
          break;
        case 'isString':
          errorsMessages.push(errorMessagesConfig.isString('shortDescription'));
          break;
        case 'maxLength':
          errorsMessages.push(
            errorMessagesConfig.maxLength('shortDescription', 100),
          );
          break;
      }
    });
  }

  if (content) {
    content.forEach((value) => {
      switch (value) {
        case 'isRequired':
          errorsMessages.push(errorMessagesConfig.isRequired('content'));
          break;
        case 'isString':
          errorsMessages.push(errorMessagesConfig.isString('content'));
          break;
        case 'maxLength':
          errorsMessages.push(errorMessagesConfig.maxLength('content', 1000));
          break;
      }
    });
  }

  if (blogId) {
    blogId.forEach((value) => {
      switch (value) {
        case 'isRequired':
          errorsMessages.push(errorMessagesConfig.isRequired('blogId'));
          break;
        case 'isString':
          errorsMessages.push(errorMessagesConfig.isString('blogId'));
          break;
        case 'blogIdNotExist':
          errorsMessages.push(errorMessagesConfig.blogIdNotExist('blogId'));
          break;
      }
    });
  }

  return errorsMessages;
};

const errorMessagesConfig = {
  isRequired: (field: string) => ({
    message: `${field} should not be null or undefined`,
    field,
  }),
  isString: (field: string) => ({
    message: `${field} must be a string`,
    field,
  }),
  maxLength: (field: string, length: number) => ({
    message: `${field} must be shorter than or equal to ${length} characters`,
    field,
  }),
  isPattern: (field: string) => ({
    message: `${field} must match ${websiteUrlPattern} regular expression`,
    field,
  }),
  blogIdNotExist: (field: string) => ({
    message: `Blog doesn't exist`,
    code: 'BLOG_NOT_FOUND',
  }),
} as const;

type TValues = {
  name?: TProperties[];
  description?: TProperties[];
  websiteUrl?: (TProperties | 'isPattern')[];
  title?: TProperties[];
  shortDescription?: TProperties[];
  content?: TProperties[];
  blogId?: (Exclude<TProperties, 'maxLength'> | 'blogIdNotExist')[];
};

type TProperties = 'isRequired' | 'isString' | 'maxLength';

type CreateUpdateErrorViewModel = {
  errorsMessages: {
    message: string;
    field?: string;
  }[];
};
