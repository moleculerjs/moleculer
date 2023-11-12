const ServiceBroker = require("../../../src/service-broker");
const { protectReject } = require("../utils");

const C = require("../../../src/constants");

jest.mock("ioredis");
const Redis = require("ioredis");
const BaseLogger = require("../../../src/loggers/base");

Redis.mockImplementation(() => {
	let onCallbacks = {};
	return {
		on: jest.fn((event, cb) => (onCallbacks[event] = cb)),
		disconnect: jest.fn(),
		subscribe: jest.fn(),
		publish: jest.fn(),
		quit: jest.fn(),
		set: jest.fn(),

		onCallbacks
	};
});

const RedisCacher = require("../../../src/cachers/redis");
const Serializers = require("../../../src/serializers");

/**
 * TODO: need rewrite to make more better
 */

describe("Test RedisCacher constructor", () => {
	it("should create an empty options", () => {
		let cacher = new RedisCacher();
		expect(cacher).toBeDefined();
		expect(cacher.opts).toBeDefined();
		expect(cacher.opts.ttl).toBeNull();
		expect(cacher.opts.maxParamsLength).toBeNull();
		expect(cacher.connected).toBe(null);
	});

	it("should create a timer if set ttl option", () => {
		let opts = { ttl: 500, maxParamsLength: 1024, prefix: "custom-" };
		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(cacher.opts.ttl).toBe(500);
		expect(cacher.opts.prefix).toBe("custom-");
		expect(cacher.opts.maxParamsLength).toBe(1024);
	});

	it("should add option for pingInterval", () => {
		let opts = { pingInterval: 5000 };
		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(cacher.opts.pingInterval).toBe(5000);
	});

	it("should create with redis opts from string", () => {
		let opts = "redis://localhost:6379";
		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual({
			keygen: null,
			ttl: null,
			prefix: null,
			pingInterval: null,
			maxParamsLength: null,
			redis: opts
		});
	});
});

describe("Test RedisCacher init", () => {
	const broker = new ServiceBroker({ logger: false });

	it("should create Redis client with default options", () => {
		const cacher = new RedisCacher();

		Redis.mockClear();
		cacher.init(broker);

		// expect(cacher.client).toBeInstanceOf(Redis);
		expect(cacher.serializer).toBeInstanceOf(Serializers.JSON);

		expect(Redis).toHaveBeenCalledTimes(1);
		expect(Redis).toHaveBeenCalledWith(undefined);
	});

	it("should create Redis client with default options", () => {
		const opts = { redis: { host: "1.2.3.4" } };
		const cacher = new RedisCacher(opts);

		jest.spyOn(Serializers.JSON.prototype, "init");
		Redis.mockClear();
		cacher.init(broker);

		// expect(cacher.client).toBeInstanceOf(Redis);
		expect(cacher.serializer).toBeInstanceOf(Serializers.JSON);

		expect(Redis).toHaveBeenCalledTimes(1);
		expect(Redis).toHaveBeenCalledWith(opts.redis);

		expect(Serializers.JSON.prototype.init).toHaveBeenCalledTimes(1);
		expect(Serializers.JSON.prototype.init).toHaveBeenCalledWith(broker);
	});

	it("should broadcast client error", () => {
		broker.broadcastLocal = jest.fn();

		const cacher = new RedisCacher();

		Redis.mockClear();
		cacher.init(broker);

		cacher.client.onCallbacks.error(new Error("Ups!"));

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$cacher.error", {
			error: new Error("Ups!"),
			module: "cacher",
			type: C.CLIENT_ERROR
		});
	});
});

describe("Test RedisCacher cluster", () => {
	it("should create with redis opts", () => {
		let opts = {
			type: "Redis",
			ttl: 30,
			cluster: {
				nodes: [
					{
						host: "localhost",
						port: 6379
					}
				]
			}
		};

		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
	});

	it("should init redis cluster", () => {
		let broker = new ServiceBroker({ logger: false });

		let opts = {
			type: "Redis",
			ttl: 30,
			cluster: {
				nodes: [
					{
						host: "localhost",
						port: 6379
					}
				]
			}
		};

		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		cacher.init(broker);
		expect(cacher.client).toBeInstanceOf(Redis.Cluster);
	});

	it("should fail to init redis cluster without nodes", () => {
		let broker = new ServiceBroker({ logger: false });

		let opts = {
			type: "Redis",
			ttl: 30,
			cluster: {
				nodes: []
			}
		};

		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(() => {
			cacher.init(broker);
		}).toThrowError("No nodes defined for cluster");
	});

	it("should construct serializer based on options", () => {
		let broker = new ServiceBroker({ logger: false });

		let opts = {
			type: "Redis",
			serializer: "Notepack"
		};

		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		cacher.init(broker);
		expect(cacher.serializer).toBeInstanceOf(Serializers.Notepack);
	});

	it("should ping based on numeric interval", () => {
		jest.useFakeTimers();
		let broker = new ServiceBroker({ logger: false });

		let opts = {
			type: "Redis",
			pingInterval: 25
		};

		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		cacher.init(broker);
		cacher.client.ping = jest.fn().mockResolvedValue(undefined);

		jest.advanceTimersByTime(25);
		expect(cacher.client.ping).toHaveBeenCalledTimes(1);
		jest.advanceTimersByTime(25);
		expect(cacher.client.ping).toHaveBeenCalledTimes(2);
		jest.advanceTimersByTime(25);
		expect(cacher.client.ping).toHaveBeenCalledTimes(3);

		jest.clearAllTimers();
		jest.useRealTimers();
	});

	it("should ping based on numeric string interval", () => {
		jest.useFakeTimers();
		let broker = new ServiceBroker({ logger: false });

		let opts = {
			type: "Redis",
			pingInterval: "25"
		};

		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		cacher.init(broker);
		cacher.client.ping = jest.fn().mockResolvedValue(undefined);

		jest.advanceTimersByTime(25);
		expect(cacher.client.ping).toHaveBeenCalledTimes(1);
		jest.advanceTimersByTime(25);
		expect(cacher.client.ping).toHaveBeenCalledTimes(2);
		jest.advanceTimersByTime(25);
		expect(cacher.client.ping).toHaveBeenCalledTimes(3);

		jest.clearAllTimers();
		jest.useRealTimers();
	});

	it("should not ping with malformed pingInterval", () => {
		jest.useFakeTimers();
		let broker = new ServiceBroker({ logger: false });

		let opts = {
			type: "Redis",
			pingInterval: "foo"
		};

		let cacher = new RedisCacher(opts);
		expect(cacher).toBeDefined();
		cacher.init(broker);
		cacher.client.ping = jest.fn().mockResolvedValue(undefined);

		jest.advanceTimersByTime(25);
		expect(cacher.client.ping).toHaveBeenCalledTimes(0);
		jest.advanceTimersByTime(25);
		expect(cacher.client.ping).toHaveBeenCalledTimes(0);
		jest.advanceTimersByTime(25);
		expect(cacher.client.ping).toHaveBeenCalledTimes(0);

		jest.clearAllTimers();
		jest.useRealTimers();
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
	let dataEvent;

	beforeEach(() => {
		dataEvent = jest.fn().mockImplementation((eventType, callback) => {
			if (eventType === "data") {
				callback(["key1", "key2"]);
			}
			if (eventType === "end") {
				callback();
			}
		});
		cacher.client.scanStream = jest.fn(() => ({
			on: dataEvent,
			pause: jest.fn(),
			resume: jest.fn()
		}));
		cacher.client.getBuffer = jest.fn(() =>
			Promise.resolve(cacher.serializer.serialize(data1))
		);
		cacher.client.set = jest.fn(() => Promise.resolve());
		cacher.client.del = jest.fn(() => Promise.resolve());
	});
	it("should call client.set with key & data", () => {
		cacher.set(key, data1);
		expect(cacher.client.set).toHaveBeenCalledTimes(1);
		expect(cacher.client.set).toHaveBeenCalledWith(
			prefix + key,
			cacher.serializer.serialize(data1)
		);
	});

	it("should call client.getBuffer with key & return with data1", () => {
		let p = cacher.get(key);
		expect(cacher.client.getBuffer).toHaveBeenCalledTimes(1);
		expect(cacher.client.getBuffer).toHaveBeenCalledWith(prefix + key);
		return p.catch(protectReject).then(d => {
			expect(d).toEqual(data1);
		});
	});

	it("should give null if response cannot be deserialized", () => {
		cacher.client.getBuffer = jest.fn(() => Promise.resolve("{ 'asd' 5}")); // Invalid JSON

		let p = cacher.get(key);
		expect(cacher.client.getBuffer).toHaveBeenCalledTimes(1);
		expect(cacher.client.getBuffer).toHaveBeenCalledWith(prefix + key);
		return p.catch(protectReject).then(d => {
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
		return cacher
			.clean()
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

	it("should not call del if data returns an empty array", () => {
		dataEvent.mockImplementationOnce((eventType, callback) => {
			if (eventType === "data") {
				callback([]);
			}
			if (eventType === "end") {
				callback();
			}
		});

		return cacher
			.clean()
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.scanStream).toHaveBeenCalledTimes(1);
				expect(cacher.client.scanStream).toHaveBeenCalledWith({
					match: "MOL-*",
					count: 100
				});

				expect(cacher.client.del).not.toBeCalled();
			});
	});
});

describe("Test RedisCacher set & get with namespace & ttl", () => {
	const broker = new ServiceBroker({ logger: false, namespace: "uat" });
	let cacher = new RedisCacher({
		ttl: 60
	});
	cacher.init(broker); // for empty logger

	["fatal", "error", "info", "log", "debug"].forEach(level => (cacher.logger[level] = jest.fn()));

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
		cacher.client.getBuffer = jest.fn(() => Promise.resolve());
		cacher.client.del = jest.fn(() => Promise.resolve());
		["error", "fatal", "info", "log", "debug"].forEach(level =>
			cacher.logger[level].mockClear()
		);

		cacher.client.set = jest.fn(() => Promise.resolve());
	});

	it("should call client.set with key & data", () => {
		cacher.set(key, data1);
		expect(cacher.client.set).toHaveBeenCalledTimes(1);
		expect(cacher.client.set).toHaveBeenCalledWith(
			prefix + key,
			cacher.serializer.serialize(data1),
			"EX",
			60
		);
	});

	it("should give back the data by key", () => {
		cacher.get(key);
		expect(cacher.client.getBuffer).toHaveBeenCalledTimes(1);
		expect(cacher.client.getBuffer).toHaveBeenCalledWith(prefix + key);
	});

	it("should call client.del with key", () => {
		return cacher
			.del(key)
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.del).toHaveBeenCalledTimes(1);
				expect(cacher.client.del).toHaveBeenCalledWith([prefix + key]);
			});
	});

	it("should call client.del with multiple keys", () => {
		return cacher
			.del(["key1", "key2"])
			.catch(protectReject)
			.then(() => {
				expect(cacher.client.del).toHaveBeenCalledTimes(1);
				expect(cacher.client.del).toHaveBeenCalledWith([prefix + "key1", prefix + "key2"]);
			});
	});

	it("should throw error", () => {
		const error = new Error("Redis delete error");
		cacher.client.del = jest.fn(() => Promise.reject(error));
		return cacher
			.del(["key1"])
			.then(protectReject)
			.catch(err => {
				expect(err).toBe(error);
				expect(cacher.client.del).toHaveBeenCalledTimes(1);
				expect(cacher.client.del).toHaveBeenCalledWith([prefix + "key1"]);
				expect(cacher.logger.error).toHaveBeenCalledTimes(1);
				expect(cacher.logger.error).toHaveBeenCalledWith(
					"Redis 'del' error. Key: MOL-uat-key1",
					error
				);
			});
	});

	it("should call client.scanStream", () => {
		return cacher
			.clean()
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
		return cacher
			.clean("service-name.*")
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
		return cacher
			.clean(["service-name.*"])
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
		return cacher
			.clean(["service-name.*", "service2-name.*"])
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
		return cacher
			.clean(["service-name.*", "service2-name.*"])
			.then(protectReject)
			.catch(err => {
				expect(err).toBe(error);
				expect(cacher.client.scanStream).toHaveBeenCalledTimes(1);
				expect(cacher.client.scanStream).toHaveBeenCalledWith({
					count: 100,
					match: "MOL-uat-service-name.*"
				});
				expect(cacher.logger.error).toHaveBeenCalledTimes(1);
				expect(cacher.logger.error).toHaveBeenCalledWith(
					"Redis 'scanDel' error. Pattern: MOL-uat-service-name.*",
					error
				);
			});
	});
});

describe("Test RedisCacher getWithTTL method", () => {
	const cachedData = { name: "tiaod" };
	const key = "abcd134";
	let broker = new ServiceBroker({ logger: false });
	let cacher = new RedisCacher({
		ttl: 30,
		lock: true
	});
	cacher.init(broker); // for empty logger
	let mockPipeline = {};

	beforeEach(() => {
		mockPipeline.getBuffer = jest.fn(() => mockPipeline);
		mockPipeline.ttl = jest.fn(() => mockPipeline);
		mockPipeline.exec = jest.fn(() =>
			Promise.resolve([
				[null, cacher.serializer.serialize(cachedData)],
				[null, 20]
			])
		);
		cacher.client.pipeline = jest.fn(() => mockPipeline);
	});

	it("should call the getBuffer and ttl using pipeline", () => {
		return cacher.getWithTTL(key).then(res => {
			expect(res.data).toEqual(cachedData);
			expect(res.ttl).toBe(20);
			expect(mockPipeline.getBuffer).toHaveBeenCalledTimes(1);
			expect(mockPipeline.ttl).toHaveBeenCalledTimes(1);
			expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
		});
	});

	it("should throw an error when getBuffer method return error", () => {
		const err = new Error("getBuffer error.");
		mockPipeline.exec = jest.fn(() =>
			Promise.resolve([
				[err, null],
				[null, 20]
			])
		);
		return cacher.getWithTTL(key).catch(e => {
			expect(e).toBe(err);
		});
	});

	it("should throw an error when ttl method return error", () => {
		const err = new Error("ttl error.");
		mockPipeline.exec = jest.fn(() =>
			Promise.resolve([
				[null, cachedData],
				[err, null]
			])
		);
		return cacher.getWithTTL(key).catch(e => {
			expect(e).toBe(err);
		});
	});

	it("should return null if data cannot be deserialized", () => {
		mockPipeline.exec = jest.fn(() =>
			Promise.resolve([
				[null, "{'some invalid JSON here."],
				[null, 20]
			])
		);
		return cacher.getWithTTL(key).then(res => {
			expect(res.data).toBeNull();
		});
	});
});

describe("redlock enabled", () => {
	describe("Test RedisCacher lock method", () => {
		const key = "abcd134";
		let broker = new ServiceBroker({ logger: false });
		let cacher = new RedisCacher({
			ttl: 30,
			lock: true
		});
		cacher.init(broker); // for empty logger
		let unlock1, unlock2;
		beforeEach(() => {
			unlock1 = jest.fn(() => Promise.resolve());
			unlock2 = jest.fn(() => Promise.resolve());
			cacher.redlock.lock = jest.fn(() => {
				return Promise.resolve({
					unlock: unlock1
				});
			});
			cacher.redlockNonBlocking.lock = jest.fn(() => {
				return Promise.resolve({
					unlock: unlock2
				});
			});
		});

		it("should call redlock.lock when calling cacher.lock", () => {
			return cacher.lock(key, 20).then(() => {
				expect(cacher.redlock.lock).toHaveBeenCalledTimes(1);
				expect(cacher.redlock.lock).toHaveBeenCalledWith(cacher.prefix + key + "-lock", 20);
			});
		});

		it("should call redlock.unlock when calling unlock callback", () => {
			return cacher.lock(key, 20).then(unlock => {
				return unlock().then(() => {
					expect(unlock1).toBeCalled();
				});
			});
		});

		it("should call redlock.lock when calling cacher.tryLock", () => {
			return cacher.tryLock(key, 20).then(() => {
				expect(cacher.redlockNonBlocking.lock).toHaveBeenCalledTimes(1);
				expect(cacher.redlockNonBlocking.lock).toHaveBeenCalledWith(
					cacher.prefix + key + "-lock",
					20
				);
			});
		});

		it("should call redlock.unlock when calling unlock callback", () => {
			const err = new Error("Already locked.");
			cacher.redlockNonBlocking.lock = jest.fn(() => {
				return Promise.reject(err);
			});
			return cacher.tryLock(key, 20).catch(e => {
				expect(e).toBe(err);
			});
		});

		it("should failed to acquire a lock when redlock client throw an error", () => {
			return cacher.tryLock(key, 20);
		});
	});

	describe("Test RedisCacher with opts.lock", () => {
		it("should create redlock clients", () => {
			let broker = new ServiceBroker({ logger: false });
			let cacher = new RedisCacher({
				ttl: 30
			});
			cacher.init(broker);
			expect(cacher.redlock).toBeDefined();
			expect(cacher.redlockNonBlocking).toBeDefined();
		});
	});
});

describe("redlock disabled", () => {
	const errorMock = jest.fn();
	class TestLogger extends BaseLogger {
		getLogHandler() {
			return (type, args) => {
				if (type === "error") {
					return errorMock(...args);
				}
			};
		}
	}
	const logger = new TestLogger();

	const broker = new ServiceBroker({ logger });
	const cacher = new RedisCacher({ redlock: false });
	cacher.init(broker);

	afterEach(() => {
		errorMock.mockClear();
	});

	it("should not add a redlock instance", () => {
		expect(cacher.redlock).toBeNull();
		expect(cacher.redlockNonBlocking).toBeNull();
	});

	it("should resolve but emit error on lock call", async () => {
		await expect(cacher.lock()).resolves.toBeUndefined();
		expect(errorMock).toHaveBeenCalledTimes(1);
	});

	it("should resolve but emit error on tryLock call", async () => {
		await expect(cacher.tryLock()).resolves.toBeUndefined();
		expect(errorMock).toHaveBeenCalledTimes(1);
	});
});

describe("Test RedisCacher close", () => {
	it("should call client.quit", () => {
		let broker = new ServiceBroker({ logger: false });
		let cacher = new RedisCacher();
		cacher.init(broker); // for empty logger
		cacher.close();
	});

	it("should clear interval", () => {
		jest.useFakeTimers();
		let broker = new ServiceBroker({ logger: false });

		let opts = {
			type: "Redis",
			pingInterval: 25
		};

		let cacher = new RedisCacher(opts);
		cacher.init(broker); // for empty logger
		cacher.client.ping = jest.fn().mockResolvedValue(undefined);

		expect(jest.getTimerCount()).toBe(1);

		cacher.close();
		expect(jest.getTimerCount()).toBe(0);

		jest.clearAllTimers();
		jest.useRealTimers();
	});
});

describe("Test MemoryCacher getCacheKeys method", () => {
	const cacher = new RedisCacher();
	const broker = new ServiceBroker({ logger: false });
	cacher.init(broker); // for empty logger

	let dataEvent;

	beforeEach(() => {
		dataEvent = jest.fn().mockImplementation((eventType, callback) => {
			if (eventType === "data") {
				callback(["MOL-hello", "MOL-hello2", "hello3:test"]);
			}
			if (eventType === "end") {
				callback();
			}
		});
		cacher.client.scanStream = jest.fn(() => ({
			on: dataEvent
		}));
	});

	it("should return data and ttl", () => {
		return cacher.getCacheKeys().then(res => {
			expect(res).toEqual([{ key: "hello" }, { key: "hello2" }, { key: "hello3:test" }]);
		});
	});
});
