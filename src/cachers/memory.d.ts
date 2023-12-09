import BaseCacher = require("./base");
import type { CacherOptions } from "./base";

declare namespace MemoryCacher {

	type CloneFunction = (data: any) => any;
	export interface MemoryCacherOptions extends CacherOptions {
		clone?: boolean | CloneFunction;
	}
}

declare class MemoryCacher extends BaseCacher<MemoryCacher.MemoryCacherOptions> {
	clone: MemoryCacher.CloneFunction;
	close(): Promise<void>;
	get(key: string): Promise<Record<string, unknown> | null>;
	getWithTTL(key: string): Promise<Record<string, unknown> | null>;
	set(key: string, data: any, ttl?: number): Promise<void>;
	del(key: string | string[]): Promise<void>;
	clean(match?: string | string[]): Promise<void>;
	tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
	lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}

export = MemoryCacher;
