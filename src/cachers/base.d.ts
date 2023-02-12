import type ServiceBroker = require("../service-broker");

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
	[key: string]: any;
}

declare abstract class Cacher {
	opts: CacherOptions;

	connected: boolean | null;

	constructor(opts?: CacherOptions);

	init(broker: ServiceBroker): void;

	close(): Promise<unknown>;

	get(key: string): Promise<Record<string, unknown> | null>;

	getWithTTL(key: string): Promise<Record<string, unknown> | null>;

	set(key: string, data: any, ttl?: number): Promise<unknown>;

	del(key: string | string[]): Promise<unknown>;

	clean(match?: string | string[]): Promise<unknown>;

	getCacheKey(actionName: string, params: object, meta: object, keys: string[] | null): string;

	defaultKeygen(
		actionName: string,
		params: object | null,
		meta: object | null,
		keys: string[] | null
	): string;

	abstract tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;

	abstract lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}

export = Cacher;
