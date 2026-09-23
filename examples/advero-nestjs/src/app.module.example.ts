import { Module } from '@nestjs/common';
import { AdveroModule } from './advero';

/**
 * Example of wiring AdveroModule into an existing NestJS app's root module.
 * Not a runnable standalone app on its own — drop this pattern into your own
 * AppModule (this file is named *.example.ts so it isn't mistaken for the
 * project's real app.module.ts).
 */
@Module({
  imports: [
    AdveroModule.forRoot({
      baseUrl: process.env.ADVERO_BASE_URL ?? '',
      apiKey: process.env.ADVERO_API_KEY ?? '',
      apiSecret: process.env.ADVERO_API_SECRET ?? '',
      cacheBucketMinutes: 30,
    }),
  ],
})
export class AppModuleExample {}

/**
 * forRootAsync() variant — e.g. when credentials come from @nestjs/config's
 * ConfigService instead of raw process.env:
 *
 * import { ConfigModule, ConfigService } from '@nestjs/config';
 *
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot(),
 *     AdveroModule.forRootAsync({
 *       imports: [ConfigModule],
 *       inject: [ConfigService],
 *       useFactory: (config: ConfigService) => ({
 *         baseUrl: config.get<string>('ADVERO_BASE_URL')!,
 *         apiKey: config.get<string>('ADVERO_API_KEY')!,
 *         apiSecret: config.get<string>('ADVERO_API_SECRET')!,
 *       }),
 *     }),
 *   ],
 * })
 * export class AppModuleExample {}
 */
