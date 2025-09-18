import 'reflect-metadata';
import { Container } from 'inversify';
import { Config } from '@/shared/domain/definition/config';
import { loadConfig } from '@/shared/infrastructure/config/config';

const container = new Container();

// Config centralizado
container
  .bind<Config>('Config')
  .toDynamicValue(() => loadConfig())
  .inSingletonScope();

export { container };
