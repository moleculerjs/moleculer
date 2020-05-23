import { Redis } from 'ioredis';
import { expectAssignable, expectType } from "tsd";
import { Cachers, Cacher, ServiceBroker } from "../../../index";


// base cacher tests
expectType<Cacher>(new Cachers.Base());
expectType<Cachers.Base>(new Cachers.Base());

// memory cacher tests
expectAssignable<Cacher>(new Cachers.Memory());
expectType<Cacher<Cachers.Memory>>(new Cachers.Memory());
expectType<Cachers.Memory>(new Cachers.Memory());
expectAssignable<Cachers.Base>(new Cachers.Memory());
const memoryBroker = new ServiceBroker({ cacher: new Cachers.Memory() });
expectType<Cachers.Memory>(memoryBroker.cacher as Cachers.Memory);

// memory lru cacher tests
expectAssignable<Cacher>(new Cachers.MemoryLRU());
expectType<Cacher<Cachers.MemoryLRU>>(new Cachers.MemoryLRU());
expectType<Cachers.MemoryLRU>(new Cachers.MemoryLRU());
expectAssignable<Cachers.Base>(new Cachers.MemoryLRU());
const memoryLRUBroker = new ServiceBroker({ cacher: new Cachers.MemoryLRU() });
expectType<Cachers.MemoryLRU>(memoryLRUBroker.cacher as Cachers.MemoryLRU);

// redis cacher tests
expectAssignable<Cacher>(new Cachers.Redis());
expectType<Cacher<Cachers.Redis>>(new Cachers.Redis());
expectType<Cachers.Redis>(new Cachers.Redis());
expectAssignable<Cachers.Base>(new Cachers.Redis());
expectType<string|null>(new Cachers.Redis().prefix);
expectType<string|null>(new Cachers.Redis({ prefix: "foo" }).prefix);
const redisBroker = new ServiceBroker({ cacher: new Cachers.Redis() });
expectType<Cachers.Redis>(redisBroker.cacher as Cachers.Redis);

// redis cacher with client tests
expectType<Cachers.Redis<Redis>>(new Cachers.Redis<Redis>());
expectType<Redis>(new Cachers.Redis<Redis>().client)
expectType<any>(new Cachers.Redis().client);

// custom cacher tests
class CustomCacher extends Cachers.Base {
	private foo = 'bar';
}
expectAssignable<Cacher>(new CustomCacher());
expectType<Cacher<CustomCacher>>(new CustomCacher());
expectAssignable<Cachers.Base>(new CustomCacher());
const customCacherBroker = new ServiceBroker({ cacher: new CustomCacher() });
expectType<CustomCacher>(customCacherBroker.cacher as CustomCacher);
