import BaseCacher = require("./base");
import type { CacherOptions } from "./base";

declare namespace MemoryCacher {
	export interface MemoryCacherOptions extends CacherOptions {
		clone?: boolean;
	}
}

declare class MemoryCacher extends BaseCacher {
	opts: MemoryCacher.MemoryCacherOptions;

	constructor(opts?: MemoryCacher.MemoryCacherOptions);

	tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;

	lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}

export = MemoryCacher;
