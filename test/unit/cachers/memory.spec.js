const ServiceBroker = require("../../../src/service-broker");
const MemoryCacher = require("../../../src/cachers/memory");


describe("Test MemoryMapCacher constructor", () => {

	it("should create an empty options", () => {
		const cacher = new MemoryCacher();
		expect(cacher).toBeDefined();
		expect(cacher.opts).toBeDefined();
		expect(cacher.opts.ttl).toBeNull();
	});

	it("should create a timer if set ttl option", () => {
		const opts = { ttl: 500 };
		const cacher = new MemoryCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(cacher.opts.ttl).toBe(500);
		expect(cacher.timer).toBeDefined();
	});

});

describe("Test MemoryCacher init", () => {

	it("check init", () => {
		const broker = new ServiceBroker();
		broker.localBus.on = jest.fn();
		const cacher = new MemoryCacher();

		cacher.init(broker);

		expect(broker.localBus.on).toHaveBeenCalledTimes(1);
		expect(broker.localBus.on).toHaveBeenCalledWith("$transporter.connected", jasmine.any(Function));
	});

	it("should call cache clean after transporter connected", () => {
		const broker = new ServiceBroker();
		const cacher = new MemoryCacher();
		cacher.clean = jest.fn();

		cacher.init(broker);

		broker.localBus.emit("$transporter.connected");

		expect(cacher.clean).toHaveBeenCalledTimes(1);
	});
});

describe("Test MemoryCacher set & get", () => {

	let broker = new ServiceBroker();
	let cacher = new MemoryCacher();
	cacher.init(broker);

	let key = "tst123";
	let data1 = {
		a: 1,
		b: false,
		c: "Test",
		d: {
			e: 55
		}
	};

	it("should save the data with key", () => {
		cacher.set(key, data1);
		expect(cacher.cache.get(key)).toBeDefined();
		expect(cacher.cache.get(key).data).toBe(data1);
		expect(cacher.cache.get(key).expire).toBeNull();
	});

	it("should give back the data by key", () => {
		return cacher.get(key).then(obj => {
			expect(obj).toBeDefined();
			expect(obj).toEqual(data1);
		});
	});

	it("should give null if key not exist", () => {
		return cacher.get("123123").then(obj => {
			expect(obj).toBeNull();
		});
	});

});

describe("Test MemoryCacher delete", () => {

	let broker = new ServiceBroker();
	let cacher = new MemoryCacher();
	cacher.init(broker);

	let key = "tst123";
	let data1 = {
		a: 1,
		b: false,
		c: "Test",
		d: {
			e: 55
		}
	};

	it("should save the data with key", () => {
		return cacher.set(key, data1);
	});

	it("should delete the key", () => {
		expect(cacher.cache.get(key)).toBeDefined();
		cacher.del(key);
		expect(cacher.cache.get(key)).toBeUndefined();
	});

	it("should give null", () => {
		return cacher.get(key).then(obj => {
			expect(obj).toBeNull();
		});
	});

});

describe("Test MemoryCacher clean", () => {

	let broker = new ServiceBroker();
	let cacher = new MemoryCacher({});
	cacher.init(broker);

	let key1 = "tst123";
	let key2 = "posts123";
	let data1 = {
		a: 1,
		b: false,
		c: "Test",
		d: {
			e: 55
		}
	};
	let data2 = "Data2";

	it("should save the data with key", () => {
		cacher.set(key1, data1);
		cacher.set(key2, data2);
	});

	it("should give item in cache for keys", () => {
		expect(cacher.cache.get(key1)).toBeDefined();
		expect(cacher.cache.get(key2)).toBeDefined();
	});

	it("should clean test* keys", () => {
		cacher.clean("tst*");
	});

	it("should give null for key1", () => {
		return cacher.get(key1).then(obj => {
			expect(obj).toBeNull();
		});
	});

	it("should give back data 2 for key2", () => {
		return cacher.get(key2).then(obj => {
			expect(obj).toEqual(data2);
		});
	});

	it("should clean all keys", () => {
		cacher.clean();
		expect(Object.keys(cacher.cache).length).toBe(0);
	});

	it("should give null for key2 too", () => {
		return cacher.get(key1).then(obj => {
			expect(obj).toBeNull();
		});
	});

});

describe("Test MemoryCacher expired method", () => {

	let broker = new ServiceBroker();
	let cacher = new MemoryCacher({
		ttl: 60
	});
	cacher.init(broker); // for empty logger

	let key1 = "tst123";
	let key2 = "posts123";
	let data1 = {
		a: 1,
		b: false,
		c: "Test",
		d: {
			e: 55
		}
	};
	let data2 = "Data2";

	it("should save the data with key", () => {
		cacher.set(key1, data1);
		cacher.set(key2, data2);
	});

	it("should set expire to item", () => {
		expect(cacher.cache.get(key1).expire).toBeDefined();
		expect(cacher.cache.get(key1).expire).toBeGreaterThan(Date.now());

		cacher.cache.get(key1).expire = Date.now() - 10 * 1000; // Hack the expire time
		cacher.checkTTL();
	});

	it("should give null for key1", () => {
		return cacher.get(key1).then(obj => {
			expect(obj).toBeNull();
		});
	});

	it("should give back data 2 for key2", () => {
		return cacher.get(key2).then(obj => {
			expect(obj).toEqual(data2);
		});
	});

});
