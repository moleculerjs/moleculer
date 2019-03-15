const ServiceBroker = require("../../../src/service-broker");
const MemoryLRUCacher = require("../../../src/cachers/memory-lru");
const MemoryCacher = require("../../../src/cachers/memory");
describe("Test lock method", () => {
	let cachers = [MemoryCacher, MemoryLRUCacher]

	it("should reject the promise when failed to unlock", ()=>{
		return Promise.all(cachers.map(Cacher => {
			const cacher = new Cacher({
				ttl:30,
				lock: true
			})
			let err = new Error('Can not acquire a lock.')
			let unlockFn
			cacher._lock = jest.fn((key, callback)=>{
				let done = (cb)=>{
					unlockFn = jest.fn(()=>{
						cb(err)
					})
					return unlockFn
				}
				callback(done)
			})

			return cacher.lock('key').then(unlock => {
				unlock().catch(e=>{
					expect(unlockFn).toHaveBeenCalledTimes(1);
					expect(e).toBe(err);
				})
			})
		}))
	})
	it("should lock the concurrency call", () => {
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
	});

})

describe("Test tryLock method", () => {
	let cachers = [MemoryCacher, MemoryLRUCacher]

	it("should throw an error when already locked.", ()=>{
		return Promise.all(cachers.map(Cacher => {
			const cacher = new Cacher({
				ttl: 30,
				lock: true
			});
			const broker = new ServiceBroker({
        logger: false,
        cacher
      });
			const key = '123fff'
			const tryLock = jest.spyOn(cacher, 'tryLock')
			return cacher.tryLock(key).then(unlock => {
				return cacher.tryLock().catch(e => {
					expect(e.message).toEqual('Locked.')
				})
			})
		}))
	})

})
