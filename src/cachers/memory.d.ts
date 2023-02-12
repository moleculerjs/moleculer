import BaseCacher = require("./base");
import type { CacherOptions } from "./base";

export interface MemoryCacherOptions extends CacherOptions {
	clone?: boolean;
}

declare class MemoryCacher extends BaseCacher {
	opts: MemoryCacherOptions;

	constructor(opts?: MemoryCacherOptions);

	tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;

	lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}

export = MemoryCacher;
