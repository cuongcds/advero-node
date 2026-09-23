import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AdveroClient } from 'advero-node';
import { ADVERO_CLIENT, ADVERO_MODULE_OPTIONS } from './advero.constants';
import type { AdveroModuleAsyncOptions, AdveroModuleOptions, AdveroOptionsFactory } from './advero.interface';
import { AdveroService } from './advero.service';
import { AdveroController } from './advero.controller';

/**
 * NestJS module wrapping AdveroClient, following the ConfigModule/
 * TypeOrmModule forRoot()/forRootAsync() convention so credentials can come
 * from static values or from an async source (ConfigService, a secrets
 * manager, etc.) without AdveroService/AdveroController caring which.
 *
 * Usage (synchronous):
 *   AdveroModule.forRoot({ baseUrl, apiKey, apiSecret })
 *
 * Usage (async, e.g. reading from ConfigService):
 *   AdveroModule.forRootAsync({
 *     inject: [ConfigService],
 *     useFactory: (config: ConfigService) => ({
 *       baseUrl: config.get('ADVERO_BASE_URL'),
 *       apiKey: config.get('ADVERO_API_KEY'),
 *       apiSecret: config.get('ADVERO_API_SECRET'),
 *     }),
 *   })
 */
@Module({})
export class AdveroModule {
  static forRoot(options: AdveroModuleOptions): DynamicModule {
    return {
      module: AdveroModule,
      providers: [
        { provide: ADVERO_MODULE_OPTIONS, useValue: options },
        adveroClientProvider(),
        AdveroService,
      ],
      controllers: [AdveroController],
      exports: [AdveroService, ADVERO_CLIENT],
    };
  }

  static forRootAsync(options: AdveroModuleAsyncOptions): DynamicModule {
    return {
      module: AdveroModule,
      imports: options.imports || [],
      providers: [...createAsyncOptionsProviders(options), adveroClientProvider(), AdveroService],
      controllers: [AdveroController],
      exports: [AdveroService, ADVERO_CLIENT],
    };
  }
}

function adveroClientProvider(): Provider {
  return {
    provide: ADVERO_CLIENT,
    useFactory: (options: AdveroModuleOptions) =>
      new AdveroClient(options.baseUrl, options.apiKey, options.apiSecret, { timeoutMs: options.timeoutMs }),
    inject: [ADVERO_MODULE_OPTIONS],
  };
}

function createAsyncOptionsProviders(options: AdveroModuleAsyncOptions): Provider[] {
  if (options.useFactory) {
    return [
      {
        provide: ADVERO_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
    ];
  }

  const inject = [(options.useClass || options.useExisting) as any];
  const providers: Provider[] = [
    {
      provide: ADVERO_MODULE_OPTIONS,
      useFactory: async (factory: AdveroOptionsFactory) => factory.createAdveroOptions(),
      inject,
    },
  ];
  if (options.useClass) {
    providers.push({ provide: options.useClass, useClass: options.useClass });
  }
  return providers;
}
