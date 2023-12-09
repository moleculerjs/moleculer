import BaseCacher = require("./base");
import type { MemoryCacherOptions } from "./memory";

declare namespace MemoryLRUCacher {
	export interface MemoryLRUCacherOptions extends MemoryCacherOptions {
		max?: number;
		ttl?: number;
	}
}

declare class MemoryLRUCacher extends BaseCacher<MemoryLRUCacher.MemoryLRUCacherOptions> {
	close(): Promise<void>;
	get(key: string): Promise<Record<string, unknown> | null>;
	getWithTTL(key: string): Promise<Record<string, unknown> | null>;
	set(key: string, data: any, ttl?: number): Promise<void>;
	del(key: string | string[]): Promise<void>;
	clean(match?: string | string[]): Promise<void>;
	tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
	lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}

export = MemoryLRUCacher;
