import cookieParser from 'cookie-parser';
import { pipesSetup } from './pipes.setup';
import { INestApplication } from '@nestjs/common';
import { globalPrefixSetup } from './global-prefix.setup';
import { swaggerSetup } from './swagger.setup';
import { exceptionFilterSetup } from './exception-filter.setup';
import { CoreConfig } from '../core/config';

export function appSetup(app: INestApplication, coreConfig: CoreConfig) {
  // Enable CORS
  app.enableCors();
  // Setup global pipes
  pipesSetup(app);
  // Setup global prefix
  globalPrefixSetup(app);
  // Setup swagger
  swaggerSetup(app, coreConfig);
  // Setup exception filters
  exceptionFilterSetup(app, coreConfig);
  // Add cookie parser
  app.use(cookieParser());
  // Allows to get correct IP address from req.ip
  // @ts-expect-error need proper type
  app.set('trust proxy', true);
}
