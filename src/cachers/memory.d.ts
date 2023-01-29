import BaseCacher, { CacherOptions } from "./base";

export interface MemoryCacherOptions extends CacherOptions {
	clone?: boolean;
}

declare class Memory extends BaseCacher {
	opts: MemoryCacherOptions;

	constructor(opts?: MemoryCacherOptions);

	tryLock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;

	lock(key: string | string[], ttl?: number): Promise<() => Promise<void>>;
}
export default Memory;
