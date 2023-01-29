import { Redis } from "ioredis";
import { expectAssignable, expectType } from "tsd";
import { Cachers, ServiceBroker } from "../../../index";

expectType<Cachers.Memory>(new Cachers.Memory());
expectAssignable<Cachers.Base>(new Cachers.Memory());
const memoryBroker = new ServiceBroker({ cacher: new Cachers.Memory() });
expectType<Cachers.Memory>(memoryBroker.cacher as Cachers.Memory);

// memory lru cacher tests
expectType<Cachers.MemoryLRU>(new Cachers.MemoryLRU());
expectAssignable<Cachers.Base>(new Cachers.MemoryLRU());
const memoryLRUBroker = new ServiceBroker({ cacher: new Cachers.MemoryLRU() });
expectType<Cachers.MemoryLRU>(memoryLRUBroker.cacher as Cachers.MemoryLRU);

// redis cacher tests
expectType<Cachers.Redis>(new Cachers.Redis());
expectAssignable<Cachers.Base>(new Cachers.Redis());
expectType<string | null>(new Cachers.Redis().prefix);
expectType<string | null>(new Cachers.Redis({ prefix: "foo" }).prefix);
const redisBroker = new ServiceBroker({ cacher: new Cachers.Redis() });
expectType<Cachers.Redis>(redisBroker.cacher as Cachers.Redis);

// redis cacher with client tests
expectType<Cachers.Redis<Redis>>(new Cachers.Redis<Redis>());
expectType<Redis>(new Cachers.Redis<Redis>().client);
expectType<any>(new Cachers.Redis().client);

// custom cacher tests
class CustomCacher extends Cachers.Base {
	async lock() {
		return async () => {};
	}
	async tryLock() {
		return async () => {};
	}
}
expectAssignable<Cachers.Base>(new CustomCacher());
const customCacherBroker = new ServiceBroker({ cacher: new CustomCacher() });
expectType<CustomCacher>(customCacherBroker.cacher as CustomCacher);
