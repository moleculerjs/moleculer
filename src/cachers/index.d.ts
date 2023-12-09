import BaseCacher = require("./base");
import MemoryCacher = require("./memory");
import MemoryLRUCacher = require("./memory-lru");
import RedisCacher = require("./redis");

export {
	BaseCacher as Base,
	MemoryCacher as Memory,
	MemoryLRUCacher as MemoryLRU,
	RedisCacher as Redis
};

export declare function resolve(opt: Record<string, any> | string | boolean): BaseCacher<any>;
export declare function register(name: string, value: BaseCacher<any>): void;
