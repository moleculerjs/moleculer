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

	tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;

	lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}

export = MemoryLRUCacher;
