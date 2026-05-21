import { configModule } from './config.module';
import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import {
  BloggersPlatformModule,
  UserAccountsModule,
  NotificationsModule,
  TestingModule,
} from './modules';
import { AppController } from './app.controller';
import { CoreModule } from './core';
import { CoreConfig } from './core/config';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    configModule,
    CoreModule,
    MongooseModule.forRootAsync({
      useFactory: async (coreConfig: CoreConfig) => {
        return {
          uri: coreConfig.MONGO_URL,
          dbName: coreConfig.DB_NAME,
        };
      },
      inject: [CoreConfig],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: (coreConfig: CoreConfig) => [
        {
          ttl: coreConfig.API_REQUEST_TIME_TO_LIVE,
          limit: coreConfig.API_REQUEST_MAXIMUM_LIMIT,
        },
      ],
      inject: [CoreConfig],
    }),
    CqrsModule.forRoot(),
    BloggersPlatformModule,
    UserAccountsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {
  static async forRoot(coreConfig: CoreConfig): Promise<DynamicModule> {
    /**
     * We use this sophisticated approach to add an optional module to the main modules.
     * We avoid accessing environment variables through process.env in the decorator because
     * decorators are executed during the compilation of all modules before the NestJS lifecycle starts
     */

    return {
      module: AppModule,
      imports: [...(coreConfig.INCLUDE_TESTING_MODULE ? [TestingModule] : [])], // Add dynamic modules here
    };
  }
}
