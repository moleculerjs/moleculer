const ServiceBroker = require("../../../src/service-broker");
const MemoryCacher = require("../../../src/cachers/memory");

describe("Test MemoryCacher constructor", () => {
	let cacher;
	afterEach(async () => {
		await cacher.close();
	});

	it("should create an empty options", () => {
		cacher = new MemoryCacher();
		expect(cacher).toBeDefined();
		expect(cacher.opts).toBeDefined();
		expect(cacher.opts.ttl).toBeNull();
		expect(cacher.connected).toBe(null);
	});

	it("should create a timer if set ttl option", () => {
		const opts = { ttl: 500 };
		cacher = new MemoryCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(cacher.opts.ttl).toBe(500);
		expect(cacher.timer).toBeDefined();
	});
});

describe("Test MemoryCacher init", () => {
	let broker;
	let cacher;
	afterEach(async () => {
		await cacher.close();
		broker.localBus.emit("$transporter.disconnected");
		await broker.stop();
	});

	it("check init", () => {
		broker = new ServiceBroker({ logger: false });
		broker.localBus.on = jest.fn();
		cacher = new MemoryCacher();

		expect(cacher.connected).toBe(null);

		cacher.init(broker);

		expect(cacher.connected).toBe(true);

		expect(broker.localBus.on).toHaveBeenCalledTimes(1);
		expect(broker.localBus.on).toHaveBeenCalledWith(
			"$transporter.connected",
			expect.any(Function)
		);
	});

	it("should call cache clean after transporter connected", () => {
		broker = new ServiceBroker({ logger: false });
		cacher = new MemoryCacher();
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

	afterAll(async () => {
		await cacher.close();
		await broker.stop();
	});

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

	it("should give undefined if key not exist", () => {
		return cacher.get("123123").then(obj => {
			expect(obj).toBeUndefined();
		});
	});
});

describe("Test MemoryCacher set & get with missingResponse", () => {
	let broker = new ServiceBroker({ logger: false });
	const MISSING = Symbol("MISSING");
	let cacher = new MemoryCacher({ missingResponse: MISSING });
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

	afterAll(async () => {
		await cacher.close();
		await broker.stop();
	});

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

	it("should give 'missingResponse' value if key not exist", () => {
		return cacher.get("123123").then(obj => {
			expect(obj).toBe(MISSING);
		});
	});
});

describe("Test MemoryCacher get() with expire", () => {
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

	const ttlValue = 15;
	const currentTime = 1487076708000;

	// Solution from: https://stackoverflow.com/a/47781245/11798560
	let dateNowSpy;
	beforeAll(() => {
		// Lock Time
		dateNowSpy = jest.spyOn(Date, "now");
	});

	afterAll(async () => {
		// Unlock Time
		dateNowSpy.mockRestore();
		await cacher.close();
		await broker.stop();
	});

	it("should save the data with key and a TTL value", () => {
		// setting expire date -> will be called by cacher.set()
		dateNowSpy.mockImplementationOnce(() => currentTime);

		cacher.set(key, data1, ttlValue);
		const entry = cacher.cache.get(key);
		expect(entry).toBeDefined();
		expect(entry.data).toBe(data1);
		expect(entry.expire).toBe(currentTime + ttlValue * 1000);
	});

	it("should give back the data after 14 secs", () => {
		// date.now() in cacher.get() will advance by 14 secs
		dateNowSpy.mockImplementationOnce(() => currentTime + 14 * 1000);

		return cacher.get(key).then(obj => {
			expect(obj).toBeDefined();
			expect(obj).toEqual(data1);
		});
	});

	it("should remove the entry after 15 secs", () => {
		// date.now() in cacher.get() will advance by 16 secs
		dateNowSpy.mockImplementationOnce(() => currentTime + 16 * 1000);

		return cacher.get(key).then(obj => {
			expect(obj).toBeUndefined();
		});
	});
});

describe("Test MemoryCacher set & get with default cloning enabled", () => {
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

	afterAll(async () => {
		await cacher.close();
		await broker.stop();
	});

	it("should give back the data by key", async () => {
		let cached_response = await cacher.set(key, data1);

		// Cloned object. References different object
		expect(cached_response).not.toBe(data1);
		expect(cached_response).toEqual(data1);

		let obj = await cacher.get(key);
		expect(obj).toBeDefined();
		// Cloned object. References different object
		expect(obj).not.toBe(data1);
		expect(obj).toEqual(data1);

		let obj2 = await cacher.get(key);
		expect(obj2).toBeDefined();

		// Cloned object. References different objects
		expect(obj2).not.toBe(obj);
		expect(obj).not.toBe(data1);

		expect(obj2).toEqual(data1);
	});
});

describe("Test MemoryCacher set & get with default cloning disabled", () => {
	let broker = new ServiceBroker({ logger: false });
	let cacher = new MemoryCacher({ clone: false });
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

	afterAll(async () => {
		await cacher.close();
		await broker.stop();
	});

	it("should give back the data by key", async () => {
		let cached_response = await cacher.set(key, data1);

		// Not a clone. References the same entry
		expect(cached_response).toBe(data1);
		expect(cached_response).toEqual(data1);

		let obj = await cacher.get(key);
		expect(obj).toBeDefined();
		// Not a clone. References the same entry
		expect(obj).toBe(data1);
		expect(obj).toEqual(data1);

		let obj2 = await cacher.get(key);
		expect(obj2).toBeDefined();

		// Not a clone. Reference the same entry
		expect(obj2).toBe(obj);
		expect(obj).toBe(data1);
		expect(obj2).toEqual(data1);
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

	afterAll(async () => {
		await cacher.close();
		await broker.stop();
	});

	it("should give back the data by key", async () => {
		await cacher.set(key, data1);

		let obj = await cacher.get(key);
		expect(obj).toBeDefined();
		expect(obj).not.toBe(data1);
		expect(obj).toEqual(data1);

		// 1 with set + 1 with  get
		expect(clone).toHaveBeenCalledTimes(2);
		expect(clone).toHaveBeenCalledWith(data1);
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

	afterAll(async () => {
		await cacher.close();
		await broker.stop();
	});

	it("should save the data with key", () => {
		return cacher.set(key, data1);
	});

	it("should delete the key", () => {
		expect(cacher.cache.get(key)).toBeDefined();
		cacher.del(key);
		expect(cacher.cache.get(key)).toBeUndefined();
	});

	it("should give undefined", () => {
		return cacher.get(key).then(obj => {
			expect(obj).toBeUndefined();
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

	afterAll(async () => {
		await cacher.close();
		await broker.stop();
	});

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

	it("should give undefined for key1", () => {
		return cacher.get(key1).then(obj => {
			expect(obj).toBeUndefined();
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

	it("should give undefined for key2 too", () => {
		return cacher.get(key1).then(obj => {
			expect(obj).toBeUndefined();
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

	afterAll(async () => {
		await cacher.close();
		await broker.stop();
	});

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

	it("should give undefined for key1", () => {
		return cacher.get(key1).then(obj => {
			expect(obj).toBeUndefined();
		});
	});

	it("should give back data 2 for key2", () => {
		return cacher.get(key2).then(obj => {
			expect(obj).toEqual(data2);
		});
	});
});

describe("Test MemoryCacher getWithTTL method", () => {
	const cacher = new MemoryCacher({
		ttl: 30,
		lock: true
	});
	const broker = new ServiceBroker({
		logger: false,
		cacher
	});
	const get = jest.spyOn(cacher, "get");
	const getWithTTL = jest.spyOn(cacher, "getWithTTL");
	const lock = jest.spyOn(cacher, "lock");
	const key1 = "abcd1234";

	afterAll(async () => {
		await cacher.close();
		await broker.stop();
	});

	it("should return data and ttl", () => {
		return cacher.set(key1, "hello", 30).then(() => {
			return cacher.getWithTTL(key1).then(res => {
				expect(res.data).toEqual("hello");
				expect(res.ttl).toBeLessThanOrEqual(30);
			});
		});
	});
});

describe("Test MemoryCacher getCacheKeys method", () => {
	const cacher = new MemoryCacher({
		ttl: 30,
		lock: true
	});
	const broker = new ServiceBroker({
		logger: false,
		cacher
	});
	it("should return data and ttl", () => {
		return Promise.all([
			cacher.set("hello", "test"),
			cacher.set("hello2", "test"),
			cacher.set("hello3:test", "test")
		])
			.then(() => {
				return cacher.getCacheKeys();
			})
			.then(res => {
				expect(res).toEqual([
					{ key: "hello", expiresAt: expect.any(Number) },
					{ key: "hello2", expiresAt: expect.any(Number) },
					{ key: "hello3:test", expiresAt: expect.any(Number) }
				]);
			});
	});
});
