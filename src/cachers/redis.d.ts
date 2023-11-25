import BaseCacher = require("./base");
import type { CacherOptions } from "./base";

declare namespace RedisCacher {
	export interface RedisCacherOptions extends CacherOptions {
		prefix?: string;
		redis?: Record<string, any>;
		redlock?: Record<string, any>;
		monitor?: boolean;
		pingInterval?: number;
	}
}

declare class RedisCacher<TClient = any> extends BaseCacher {
	opts: RedisCacher.RedisCacherOptions;

	client: TClient;

	constructor(opts?: string | RedisCacher.RedisCacherOptions);

	close(): Promise<unknown>;
	get(key: string): Promise<Record<string, unknown> | null>;
	getWithTTL(key: string): Promise<Record<string, unknown> | null>;
	set(key: string, data: any, ttl?: number): Promise<unknown>;
	del(key: string | string[]): Promise<unknown>;
	clean(match?: string | string[]): Promise<unknown>;
	tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
	lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;

}

export = RedisCacher;
