import { expectType } from "tsd";
import { Cachers, Cacher, ServiceBroker } from "../../../index";

// base cacher tests
expectType<Cacher>(new Cachers.Base());
expectType<Cachers.Base>(new Cachers.Base());

// memory cacher tests
expectType<Cacher>(new Cachers.Memory());
expectType<Cacher<Cachers.Memory>>(new Cachers.Memory());
expectType<Cachers.Memory>(new Cachers.Memory());
expectType<Cachers.Base>(new Cachers.Memory());
const memoryBroker = new ServiceBroker({ cacher: new Cachers.Memory() });
expectType<Cachers.Memory>(memoryBroker.cacher as Cachers.Memory);

// redis cacher tests
expectType<Cacher>(new Cachers.Redis());
expectType<Cacher<Cachers.Redis>>(new Cachers.Redis());
expectType<Cachers.Redis>(new Cachers.Redis());
expectType<Cachers.Base>(new Cachers.Redis());
const redisBroker = new ServiceBroker({ cacher: new Cachers.Redis() });
expectType<Cachers.Redis>(redisBroker.cacher as Cachers.Redis);

// custom cacher tests
class CustomCacher extends Cachers.Base {
	private foo = 'bar';
}
expectType<Cacher>(new CustomCacher());
expectType<Cacher<CustomCacher>>(new CustomCacher());
expectType<Cachers.Base>(new CustomCacher());
const customCacherBroker = new ServiceBroker({ cacher: new CustomCacher() });
expectType<CustomCacher>(customCacherBroker.cacher as CustomCacher);
