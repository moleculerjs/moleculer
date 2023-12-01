import type Context = require("../context");
import type { Logger } from "../logger-factory";
import type ServiceBroker = require("../service-broker");

declare namespace Cacher {
	export type CacherKeygen<TParams = unknown, TMeta extends object = object> = (
		actionName: string,
		params: TParams,
		meta: TMeta,
		keys?: string[]
	) => string;

	export interface CacherOptions {
		ttl?: number;
		keygen?: CacherKeygen;
		maxParamsLength?: number;
		missingResponse?: any;
		// [key: string]: any;
	}
}

declare abstract class Cacher {
	opts: Cacher.CacherOptions;

	connected: boolean | null;
	broker: ServiceBroker;
	metrics: any;
	logger: Logger;
	prefix?: string;

	constructor(opts?: Cacher.CacherOptions);

	init(broker: ServiceBroker): void;

	abstract close(): Promise<unknown>;

	abstract get(key: string): Promise<Record<string, unknown> | null>;

	abstract getWithTTL(key: string): Promise<Record<string, unknown> | null>;

	abstract set(key: string, data: any, ttl?: number): Promise<unknown>;

	abstract del(key: string | string[]): Promise<unknown>;

	abstract clean(match?: string | string[]): Promise<unknown>;

	getCacheKey(action: string, opts: object, ctx: Context): string;

	defaultKeygen(action: string, opts: object, ctx: Context): string;

	middleware();

	middlewareWithLock(ctx: Context, cacheKey: string, handler: Function, opts: any): Promise<any>;

	middlewareWithoutLock(ctx: Context, cacheKey: string, handler: Function, opts: any): Promise<any>;

	getCacheKeys(): Promise<Array<any>>;

	abstract tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;

	abstract lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}

export = Cacher;
