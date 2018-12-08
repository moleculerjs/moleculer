const ServiceBroker = require("../../../src/service-broker");
const { protectReject } = require("../utils");

jest.mock("ioredis");

const RedisCacher = require("../../../src/cachers/redis");


describe("Test RedisCacher constructor", () => {

	it("should create an empty options", () => {
		let cacher = new RedisCacher();
		expect(cacher).toBeDefined();
		expect(cacher.opts).toBeDefined();
		expect(cacher.opts.ttl).toBeNull();
		expect(cacher.opts.maxParamsLength).toBeNull();
	});

	it("should create a timer if set ttl option", () => {
		let opts = { ttl: 500, maxParamsLength: 1024 };
		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(cacher.opts.ttl).toBe(500);
		expect(cacher.opts.maxParamsLength).toBe(1024);
	});

	it("should create with redis opts from string", () => {
		let opts = "redis://localhost:6379";
		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual({
			keygen: null,
			ttl: null,
			maxParamsLength: null,
			redis: opts
		});
	});

});

describe("Test RedisCacher set & get without prefix", () => {

	let broker = new ServiceBroker({ logger: false });
	let cacher = new RedisCacher();
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

	let prefix = "MOL-";


	beforeEach(() => {
		const dataEvent = (eventType, callback) => {
			if (eventType === "data") {
				callback(["key1", "key2"]);
			}
			if (eventType === "end") {
				callback();
			}
		};
		cacher.client.scanStream = jest.fn(() => ({
			on: dataEvent,
			pause: jest.fn(),
			resume: jest.fn()
		}));
		cacher.client.get = jest.fn(() => Promise.resolve(JSON.stringify(data1)));
		cacher.client.set = jest.fn(() => Promise.resolve());
		cacher.client.del = jest.fn(() => Promise.resolve());
	});
	it("should call client.set with key & data", () => {
		cacher.set(key, data1);
		expect(cacher.client.set).toHaveBeenCalledTimes(1);
		expect(cacher.client.set).toHaveBeenCalledWith(prefix + key, JSON.stringify(data1));
		expect(cacher.client.setex).toHaveBeenCalledTimes(0);
	});

	it("should call client.get with key & return with data1", () => {
		let p = cacher.get(key);
		expect(cacher.client.get).toHaveBeenCalledTimes(1);
		expect(cacher.client.get).toHaveBeenCalledWith(prefix + key);
		return p.catch(protectReject).then((d) => {
			expect(d).toEqual(data1);
		});
	});

	it("should give null if response is not a valid JSON", () => {
		cacher.client.get = jest.fn(() => Promise.resolve("{ 'asd' 5}")); // Invalid JSON

		let p = cacher.get(key);
		expect(cacher.client.get).toHaveBeenCalledTimes(1);
		expect(cacher.client.get).toHaveBeenCalledWith(prefix + key);
		return p.catch(protectReject).then((d) => {
			expect(d).toBeNull();
		});
	});

	it("should call client.del with key", () => {
		cacher.del(key);
		expect(cacher.client.del).toHaveBeenCalledTimes(1);
		expect(cacher.client.del).toHaveBeenCalledWith([prefix + key]);
	});

	it("should delete an array of keys", () => {
		cacher.del(["key1", "key2"]);
		expect(cacher.client.del).toHaveBeenCalledTimes(1);
		expect(cacher.client.del).toHaveBeenCalledWith([prefix + "key1", prefix + "key2"]);
	});

	it("should call client.scanStream & del", () => {
		return cacher.clean()
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.scanStream).toHaveBeenCalledTimes(1);
				expect(cacher.client.scanStream).toHaveBeenCalledWith({
					match: "MOL-*",
					count: 100
				});

				expect(cacher.client.del).toHaveBeenCalledTimes(1);
				expect(cacher.client.del).toHaveBeenCalledWith(["key1", "key2"]);
			});
	});

});

describe("Test RedisCacher set & get with namespace & ttl", () => {

	const logger = {};
	["fatal", "error", "info", "debug"].forEach((level) => logger[level] = jest.fn());
	const broker = new ServiceBroker({ logger: () => logger, namespace: "uat" });
	let cacher = new RedisCacher({
		ttl: 60
	});
	cacher.init(broker); // for empty logger

	let key = "tst123";
	let data1 = {
		a: 1,
		b: false,
		c: "Test",
		d: {
			e: 55
		}
	};

	let prefix = "MOL-uat-";

	beforeEach(() => {
		const dataEvent = (eventType, callback) => {
			if (eventType === "data") {
				callback(["key1", "key2"]);
			}
			if (eventType === "end") {
				setTimeout(() => {
					callback();
				}, 500);
			}
		};
		cacher.client.scanStream = jest.fn(() => ({
			on: dataEvent,
			pause: jest.fn(),
			resume: jest.fn()
		}));
		cacher.client.get = jest.fn(() => Promise.resolve());
		cacher.client.del = jest.fn(() => Promise.resolve());
		["error", "fatal", "debug"].forEach((level) => logger[level].mockClear());

	});


	it("should call client.setex with key & data", () => {
		cacher.set(key, data1);
		expect(cacher.client.setex).toHaveBeenCalledTimes(1);
		expect(cacher.client.setex).toHaveBeenCalledWith(prefix + key, 60, JSON.stringify(data1));
	});

	it("should give back the data by key", () => {
		cacher.get(key);
		expect(cacher.client.get).toHaveBeenCalledTimes(1);
		expect(cacher.client.get).toHaveBeenCalledWith(prefix + key);
	});

	it("should call client.del with key", () => {
		return cacher.del(key)
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.del).toHaveBeenCalledTimes(1);
				expect(cacher.client.del).toHaveBeenCalledWith([prefix + key]);
			});
	});

	it("should call client.del with multiple keys", () => {
		return cacher.del(["key1", "key2"])
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.del).toHaveBeenCalledTimes(1);
				expect(cacher.client.del).toHaveBeenCalledWith([prefix + "key1", prefix + "key2"]);
			});
	});

	it("should throw error", () => {
		const error = new Error("Redis delete error");
		cacher.client.del = jest.fn(() => Promise.reject(error));
		return cacher.del(["key1"])
			.then(protectReject)
			.catch(err => {
				expect(err).toBe(error);
				expect(cacher.client.del).toHaveBeenCalledTimes(1);
				expect(cacher.client.del).toHaveBeenCalledWith([prefix + "key1"]);
				expect(logger.error).toHaveBeenCalledTimes(1);
				expect(logger.error).toHaveBeenCalledWith("Redis 'del' error. Key: MOL-uat-key1", error);
			});
	});

	it("should call client.scanStream", () => {
		return cacher.clean()
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.scanStream).toHaveBeenCalledTimes(1);
				expect(cacher.client.scanStream).toHaveBeenCalledWith({
					match: "MOL-uat-*",
					count: 100
				});
			});

	});

	it("should call client.scanStream with service key", () => {
		return cacher.clean("service-name.*")
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.scanStream).toHaveBeenCalledTimes(1);
				expect(cacher.client.scanStream).toHaveBeenCalledWith({
					match: "MOL-uat-service-name.*",
					count: 100
				});
			});

	});

	it("should call client.scanStream if provided as array service key in array", () => {
		return cacher.clean(["service-name.*"])
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.scanStream).toHaveBeenCalledTimes(1);
				expect(cacher.client.scanStream).toHaveBeenCalledWith({
					match: "MOL-uat-service-name.*",
					count: 100
				});
			});

	});

	it("should call client.scanStream for each array element", () => {
		return cacher.clean(["service-name.*", "service2-name.*"])
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.scanStream).toHaveBeenCalledTimes(2);
				expect(cacher.client.scanStream).toHaveBeenCalledWith({
					match: "MOL-uat-service-name.*",
					count: 100
				});
				expect(cacher.client.scanStream).toHaveBeenCalledWith({
					match: "MOL-uat-service2-name.*",
					count: 100
				});
			});

	});

	it("should not call second pattern if failed on first", () => {
		const error = new Error("Redis delete error");
		cacher.client.del = jest.fn().mockRejectedValueOnce(error);
		return cacher.clean(["service-name.*", "service2-name.*"])
			.then(protectReject)
			.catch(err => {
				expect(err).toBe(error);
				expect(cacher.client.scanStream).toHaveBeenCalledTimes(1);
				expect(cacher.client.scanStream).toHaveBeenCalledWith({ count: 100, match: "MOL-uat-service-name.*" });
				expect(logger.error).toHaveBeenCalledTimes(1);
				expect(logger.error).toHaveBeenCalledWith("Redis 'scanDel' error. Pattern: MOL-uat-service-name.*", error);
			});
	});
});


describe("Test RedisCacher close", () => {
	let broker = new ServiceBroker({ logger: false });
	let cacher = new RedisCacher();
	cacher.init(broker); // for empty logger

	it("should call client.quit", () => {
		cacher.close();
		expect(cacher.client.quit).toHaveBeenCalledTimes(1);
	});
});
