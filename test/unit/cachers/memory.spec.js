const ServiceBroker = require("../../../src/service-broker");
const MemoryCacher = require("../../../src/cachers/memory");


describe("Test MemoryCacher constructor", () => {

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
		const broker = new ServiceBroker({ logger: false });
		broker.localBus.on = jest.fn();
		const cacher = new MemoryCacher();

		cacher.init(broker);

		expect(broker.localBus.on).toHaveBeenCalledTimes(1);
		expect(broker.localBus.on).toHaveBeenCalledWith("$transporter.connected", jasmine.any(Function));
	});

	it("should call cache clean after transporter connected", () => {
		const broker = new ServiceBroker({ logger: false });
		const cacher = new MemoryCacher();
		cacher.clean = jest.fn();

		cacher.init(broker);

		broker.localBus.emit("$transporter.connected");

		expect(cacher.clean).toHaveBeenCalledTimes(1);
	});
});

describe("Test MemoryCacher set & get", () => {

	let broker = new ServiceBroker({ logger: false });
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

describe("Test MemoryCacher set & get with default cloning", () => {

	let broker = new ServiceBroker({ logger: false });
	let cacher = new MemoryCacher({ clone: true });
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

	cacher.set(key, data1);

	it("should give back the data by key", () => {
		return cacher.get(key).then(obj => {
			expect(obj).toBeDefined();
			expect(obj).not.toBe(data1);
			expect(obj).toEqual(data1);
		});
	});

});

describe("Test MemoryCacher set & get with custom cloning", () => {
	const clone = jest.fn(data => JSON.parse(JSON.stringify(data)));
	let broker = new ServiceBroker({ logger: false });
	let cacher = new MemoryCacher({ clone });
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

	cacher.set(key, data1);

	it("should give back the data by key", () => {
		return cacher.get(key).then(obj => {
			expect(obj).toBeDefined();
			expect(obj).not.toBe(data1);
			expect(obj).toEqual(data1);

			expect(clone).toHaveBeenCalledTimes(1);
			expect(clone).toHaveBeenCalledWith(data1);
		});
	});

});

describe("Test MemoryCacher delete", () => {

	let broker = new ServiceBroker({ logger: false });
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

	it("should delete multiple keys", () => {
		cacher.set("key1", "value1");
		cacher.set("key2", "value2");
		cacher.set("key3", "value3");

		cacher.del(["key1", "key3"]);

		expect(cacher.cache.get("key1")).toBeUndefined();
		expect(cacher.cache.get("key2")).toEqual({ data: "value2", expire: null });
		expect(cacher.cache.get("key3")).toBeUndefined();
	});

});

describe("Test MemoryCacher clean", () => {

	let broker = new ServiceBroker({ logger: false });
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

	it("should clean by multiple patterns", () => {
		cacher.set("key.1", "value1");
		cacher.set("key.2", "value2");
		cacher.set("key.3", "value3");

		cacher.set("other.1", "value1");
		cacher.set("other.2", "value2");
		cacher.set("other.3", "value3");

		cacher.clean(["key.*", "*.2"]);

		expect(cacher.cache.get("key.1")).toBeUndefined();
		expect(cacher.cache.get("key.2")).toBeUndefined();
		expect(cacher.cache.get("key.3")).toBeUndefined();
		expect(cacher.cache.get("other.1")).toBeDefined();
		expect(cacher.cache.get("other.2")).toBeUndefined();
		expect(cacher.cache.get("other.3")).toBeDefined();
	});

});

describe("Test MemoryCacher expired method", () => {

	let broker = new ServiceBroker({ logger: false });
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

describe("Test MemoryCacher dogpile method", ()=>{
	const cacher = new MemoryCacher({
		ttl: 30,
		lock: true
	});
	const broker = new ServiceBroker({
		logger: false,
		cacher
	});
	const get = jest.spyOn(cacher, 'get');
	const dogpile = jest.spyOn(cacher, 'dogpile');
	const lock = jest.spyOn(cacher, 'lock');
	const key1 = 'abcd1234';
	it("should return data and ttl", () => {
		return cacher.set(key1, 'hello', 30).then(() => {
			return cacher.dogpile(key1).then(res => {
				expect(res.data).toEqual('hello')
				expect(res.ttl).toBeLessThanOrEqual(30)
			})
		})

	})
})
