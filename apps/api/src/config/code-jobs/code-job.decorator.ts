import 'reflect-metadata';
import { ScheduleConfig } from 'src/config/db-scripts/schedule-builder';

export const CODE_JOB_META = Symbol('CODE_JOB_META');

export type CodeJobDecoratorOptions = {
  name: string;
  description?: string;
  schedule: ScheduleConfig;
  enabled?: boolean;
  /** ID estável do handler (recomendado); se omitido vira "ClassName.method". */
  handler?: string;
};

export type DecoratedJobEntry = {
  provider: any;      // construtor da classe (token do provider)
  methodName: string; // nome do método
  handler: string;    // id único do job
  name: string;
  description?: string;
  schedule: ScheduleConfig;
  enabled?: boolean;
};

const REGISTRY: DecoratedJobEntry[] = [];

export function getDecoratedJobs(): DecoratedJobEntry[] {
  return REGISTRY.slice();
}

export function CodeJob(options: CodeJobDecoratorOptions) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const provider = target.constructor;
    const methodName = String(propertyKey);
    const defaultHandler = `${provider?.name ?? 'Anonymous'}.${methodName}`;
    const handler = options.handler ?? defaultHandler;

    Reflect.defineMetadata(CODE_JOB_META, { handler }, descriptor.value);

    REGISTRY.push({
      provider,
      methodName,
      handler,
      name: options.name,
      description: options.description,
      schedule: options.schedule,
      enabled: options.enabled ?? true,
    });
  };
}
