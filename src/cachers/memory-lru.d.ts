import BaseCacher = require("./base");
import type { MemoryCacherOptions } from "./memory";

declare namespace MemoryLRUCacher {
	export interface MemoryLRUCacherOptions extends MemoryCacherOptions {
		max?: number;
		ttl?: number;
	}
}

declare class MemoryLRUCacher extends BaseCacher {
	opts: MemoryLRUCacher.MemoryLRUCacherOptions;

	constructor(opts?: MemoryLRUCacher.MemoryLRUCacherOptions);

	close(): Promise<unknown>;
	get(key: string): Promise<Record<string, unknown> | null>;
	getWithTTL(key: string): Promise<Record<string, unknown> | null>;
	set(key: string, data: any, ttl?: number): Promise<unknown>;
	del(key: string | string[]): Promise<unknown>;
	clean(match?: string | string[]): Promise<unknown>;
	tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
	lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}

export = MemoryLRUCacher;
