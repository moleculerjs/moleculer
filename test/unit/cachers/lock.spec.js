const ServiceBroker = require("../../../src/service-broker");
const MemoryLRUCacher = require("../../../src/cachers/memory-lru");
const MemoryCacher = require("../../../src/cachers/memory");
describe("Test lock method", () => {

	it("should lock the concurrency call", () => {
		let cachers = [MemoryCacher, MemoryLRUCacher]
		return Promise.all(cachers.map(Cacher => {
      const cacher = new Cacher({
        ttl: 30,
        lock: true
      });
      const broker = new ServiceBroker({
        logger: false,
        cacher
      });

      const lock = jest.spyOn(cacher, 'lock');
      const key1 = 'abcd1234';
      let taskes = [1, 2, 3, 4];
      let globalValue = 0;
      return Promise.all(taskes.map(task => {
        return cacher.lock(key1).then(unlock => {
          globalValue = task;
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              expect(globalValue).toEqual(task);
              unlock().then(() => {
                resolve();
              });
            }, Math.random() * 500);
          });
        });
      })).then(() => {
        expect(lock).toHaveBeenCalledTimes(4);
      });
    }));
	})

})
