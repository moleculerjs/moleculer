import BaseCacher = require("./base");
import type { CacherOptions } from "./base";

declare namespace MemoryCacher {
	export interface MemoryCacherOptions extends CacherOptions {
		clone?: boolean | unknown;
	}
}

declare class MemoryCacher extends BaseCacher {
	opts: MemoryCacher.MemoryCacherOptions;

	constructor(opts?: MemoryCacher.MemoryCacherOptions);

	close(): Promise<unknown>;
	get(key: string): Promise<Record<string, unknown> | null>;
	getWithTTL(key: string): Promise<Record<string, unknown> | null>;
	set(key: string, data: any, ttl?: number): Promise<unknown>;
	del(key: string | string[]): Promise<unknown>;
	clean(match?: string | string[]): Promise<unknown>;
	tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
	lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}

export = MemoryCacher;
