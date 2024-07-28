const ServiceBroker = require("../../../src/service-broker");
const Cacher = require("../../../src/cachers/base");
const Context = require("../../../src/context");

describe("Test BaseCacher", () => {
	it("check constructor", () => {
		let cacher = new Cacher();
		expect(cacher).toBeDefined();
		expect(cacher.opts).toBeDefined();
		expect(cacher.opts.ttl).toBeNull();
		expect(cacher.connected).toBe(null);
		expect(cacher.init).toBeDefined();
		expect(cacher.close).toBeDefined();
		expect(cacher.get).toBeDefined();
		expect(cacher.set).toBeDefined();
		expect(cacher.del).toBeDefined();
		expect(cacher.clean).toBeDefined();
		expect(cacher.getCacheKey).toBeDefined();
		expect(cacher.middleware).toBeDefined();
	});

	it("check constructor with empty opts", () => {
		let opts = {};
		let cacher = new Cacher(opts);
		expect(cacher.opts).toBeDefined();
		expect(cacher.opts.ttl).toBeNull();
		expect(cacher.opts.maxParamsLength).toBeNull();
	});

	it("check constructor with options", () => {
		let opts = { ttl: 500, maxParamsLength: 128 };
		let cacher = new Cacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(cacher.opts.ttl).toBe(500);
		expect(cacher.opts.maxParamsLength).toBe(128);
	});

	it("check init", () => {
		let broker = new ServiceBroker({ logger: false });
		broker.on = jest.fn();
		let cacher = new Cacher();

		jest.spyOn(cacher, "registerMoleculerMetrics");

		cacher.init(broker);
		expect(cacher.broker).toBe(broker);
		expect(cacher.logger).toBeDefined();
		expect(cacher.prefix).toBe("MOL-");

		expect(cacher.registerMoleculerMetrics).toHaveBeenCalledTimes(1);
	});

	it("check registerMoleculerMetrics", () => {
		let broker = new ServiceBroker({ logger: false });
		let cacher = new Cacher();
		cacher.init(broker);

		broker.metrics.register = jest.fn();

		cacher.registerMoleculerMetrics();
		expect(broker.metrics.register).toHaveBeenCalledTimes(10);
	});

	it("check init with namespace", () => {
		let broker = new ServiceBroker({ logger: false, namespace: "uat-test" });
		let cacher = new Cacher();
		cacher.init(broker);

		expect(cacher.prefix).toBe("MOL-uat-test-");
	});

	it("check init with prefix", () => {
		let broker = new ServiceBroker({ logger: false, namespace: "uat-test" });
		let cacher = new Cacher({ prefix: "other" });
		cacher.init(broker);

		expect(cacher.prefix).toBe("other-");
	});

	it("check getCacheKey with keys", () => {
		let broker = new ServiceBroker({ logger: false });
		let cacher = new Cacher();

		cacher.init(broker);
		// Check result
		let res = cacher.getCacheKey("posts.find.model", { id: 1, name: "Bob" });
		expect(res).toBe("posts.find.model:id|1|name|Bob");

		// Same result, with same params
		let res2 = cacher.getCacheKey("posts.find.model", { id: 1, name: "Bob" });
		expect(res2).toEqual(res);

		// Different result, with different params
		let res3 = cacher.getCacheKey("posts.find.model", { id: 2, name: "Bob" });
		expect(res3).not.toEqual(res);
		expect(res3).toBe("posts.find.model:id|2|name|Bob");

		res = cacher.getCacheKey();
		expect(res).toBe(undefined);

		res = cacher.getCacheKey("posts.find");
		expect(res).toBe("posts.find");

		res = cacher.getCacheKey("user", {});
		expect(res).toBe("user:");

		res = cacher.getCacheKey("user", { a: 5 });
		expect(res).toBe("user:a|5");

		res = cacher.getCacheKey("user", { a: [] });
		expect(res).toBe("user:a|[]");

		res = cacher.getCacheKey("user", { a: null });
		expect(res).toBe("user:a|null");

		res = cacher.getCacheKey("user", { a: 5 }, null, ["a"]);
		expect(res).toBe("user:5");

		res = cacher.getCacheKey("user", { a: { id: 5 } }, null, ["a"]);
		expect(res).toBe("user:id|5");

		res = cacher.getCacheKey("user", { a: [1, 3, 5] }, null, ["a"]);
		expect(res).toBe("user:[1|3|5]");

		res = cacher.getCacheKey("user", { a: 5, b: 3, c: 5 }, null, ["a"]);
		expect(res).toBe("user:5");

		res = cacher.getCacheKey("user", { a: { b: "John" } }, null, ["a.b"]);
		expect(res).toBe("user:John");

		res = cacher.getCacheKey("user", { a: 5, b: 3, c: 5 }, null, ["a", "b", "c"]);
		expect(res).toBe("user:5|3|5");

		res = cacher.getCacheKey("user", { a: 5, c: 5 }, null, ["a", "b", "c"]);
		expect(res).toBe("user:5|undefined|5");

		res = cacher.getCacheKey("user", { a: "12345" });
		expect(res).toBe("user:a|12345");

		res = cacher.getCacheKey("user", { a: ["12345"] });
		expect(res).toBe("user:a|[12345]");

		const d = new Date(1614529868608);
		res = cacher.getCacheKey("user", { a: d });
		expect(res).toBe("user:a|1614529868608");

		res = cacher.getCacheKey("user", { a: Symbol("something") });
		expect(res).toBe("user:a|Symbol(something)");

		res = cacher.getCacheKey("user", { a: 5, b: { id: 3 } }, null, ["a", "c", "b"]);
		expect(res).toBe("user:5|undefined|id|3");

		res = cacher.getCacheKey("user", { a: 5, b: { id: 3, other: { status: true } } }, null, [
			"a",
			"c",
			"b.id"
		]);
		expect(res).toBe("user:5|undefined|3");

		res = cacher.getCacheKey("user", { a: 5, b: { id: 3, other: { status: true } } }, null, [
			"a",
			"b.id",
			"b.other.status"
		]);
		expect(res).toBe("user:5|3|true");

		res = cacher.getCacheKey("user", { a: 5, b: { id: 3, other: { status: true } } });
		expect(res).toBe("user:a|5|b|id|3|other|status|true");

		res = cacher.getCacheKey("user", { a: 5, b: 3 }, null, []);
		expect(res).toBe("user");

		res = cacher.getCacheKey("user", { a: Object.create(null) }, null, ["a"]);
		expect(res).toBe("user:");

		// Test with meta
		res = cacher.getCacheKey("user", { a: 5 }, { user: "bob" });
		expect(res).toBe("user:a|5");

		res = cacher.getCacheKey("user", { a: 5 }, { user: "bob" }, ["a"]);
		expect(res).toBe("user:5");

		res = cacher.getCacheKey("user", { a: 5 }, { user: "bob" }, ["user"]);
		expect(res).toBe("user:undefined");

		res = cacher.getCacheKey("user", { a: 5 }, { user: "bob" }, ["#user"]);
		expect(res).toBe("user:bob");

		res = cacher.getCacheKey("user", { a: 5 }, { user: "bob" }, ["a", "#user"]);
		expect(res).toBe("user:5|bob");

		res = cacher.getCacheKey("user", { a: 5 }, { user: "bob" }, ["#user", "a"]);
		expect(res).toBe("user:bob|5");

		res = cacher.getCacheKey("user", { a: 5, user: "adam" }, { user: "bob" }, ["#user"]);
		expect(res).toBe("user:bob");

		res = cacher.getCacheKey("user", { a: 5 }, null, ["#user"]);
		expect(res).toBe("user:undefined");

		res = cacher.getCacheKey("user", null, { a: { b: { c: "nested" } } }, ["#a.b.c"]);
		expect(res).toBe("user:nested");
	});

	it("check getCacheKey with hashing", () => {
		let broker = new ServiceBroker({ logger: false });
		let cacher = new Cacher();
		let res;

		cacher.init(broker);

		const bigObj = {
			A: { C0: false, C1: true, C2: true, C3: "495f761d77d6294f", C4: true },
			B: { C0: true, C1: false, C2: true, C3: "5721c26bfddb7927", C4: false },
			C: { C0: "5d9e85c124d5d09e", C1: true, C2: 5366, C3: false, C4: false },
			D: { C0: false, C1: true, C2: "704473bca1242604", C3: false, C4: "6fc56107e69be769" },
			E: { C0: true, C1: true, C2: 4881, C3: true, C4: 1418 },
			F: { C0: true, C1: false, C2: false, C3: false, C4: true },
			G: { C0: false, C1: true, C2: false, C3: 6547, C4: 9565 },
			H: { C0: true, C1: 1848, C2: "232e6552d0b8aa98", C3: "1d50627abe5c0463", C4: 5251 },
			I: { C0: "ecd0e4eae08e4f", C1: "197bcb312fc17f60", C2: 4755, C3: true, C4: 9552 },
			J: {
				C0: false,
				C1: "1cc45cadbbf240f",
				C2: "4dbb352b21c3c2f3",
				C3: 5065,
				C4: "792b19631c78d4f6"
			},
			K: { C0: "13c23a525adf9e1f", C1: true, C2: true, C3: "589d3499abbf6765", C4: true },
			L: { C0: false, C1: true, C2: 4350, C3: "72f6c4f0e9beb03c", C4: "434b74b5ff500609" },
			M: { C0: 9228, C1: "5254b36ec238c266", C2: true, C3: "27b040089b057684", C4: true },
			N: { C0: "35d3c608ef8aac5e", C1: "23fbdbd520d5ae7d", C2: false, C3: 9061, C4: true },
			O: { C0: true, C1: true, C2: "2382f9fe7834e0cc", C3: true, C4: false },
			P: { C0: true, C1: false, C2: "38c0d40b91a9d1f6", C3: false, C4: 5512 },
			Q: { C0: true, C1: true, C2: true, C3: true, C4: true },
			R: { C0: "70bd27c06b067734", C1: true, C2: "5213493253b98636", C3: 8272, C4: 1264 },
			S: { C0: "61044125008e634c", C1: 9175, C2: true, C3: "225e3d912bfbc338", C4: false },
			T: { C0: "38edc77387da030a", C1: false, C2: "38d8b9e2525413fc", C3: true, C4: false },
			U: { C0: false, C1: "4b3962c3d26bddd0", C2: "1e66b069bad46643", C3: 3642, C4: 9225 },
			V: {
				C0: "1c40e44b54486080",
				C1: "5a560d81078bab02",
				C2: "1c131259e1e9aa61",
				C3: true,
				C4: 9335
			},
			W: { C0: false, C1: "7089b0ad438df2cb", C2: "216aec98f513ac08", C3: true, C4: false },
			X: { C0: "3b749354aac19f24", C1: 9626, C2: true, C3: false, C4: false },
			Y: { C0: 298, C1: "224075dadd108ef9", C2: 3450, C3: 2548, C4: true }
		};

		cacher.opts.maxParamsLength = 44;
		res = cacher.getCacheKey("abc.def", bigObj);
		expect(res).toBe("abc.def:/18CtAt7Z+barI7S7Ef+WTFQ23yVQ4VM8o+riN95sjo=");

		cacher.opts.maxParamsLength = 94;
		res = cacher.getCacheKey("abc.def", bigObj);
		expect(res).toBe(
			"abc.def:A|C0|false|C1|true|C2|true|C3|495f761d77d6294f|C4|/18CtAt7Z+barI7S7Ef+WTFQ23yVQ4VM8o+riN95sjo="
		);

		cacher.opts.maxParamsLength = 485;
		res = cacher.getCacheKey("abc.def", bigObj);
		expect(res).toBe(
			"abc.def:A|C0|false|C1|true|C2|true|C3|495f761d77d6294f|C4|true|B|C0|true|C1|false|C2|true|C3|5721c26bfddb7927|C4|false|C|C0|5d9e85c124d5d09e|C1|true|C2|5366|C3|false|C4|false|D|C0|false|C1|true|C2|704473bca1242604|C3|false|C4|6fc56107e69be769|E|C0|true|C1|true|C2|4881|C3|true|C4|1418|F|C0|true|C1|false|C2|false|C3|false|C4|true|G|C0|false|C1|true|C2|false|C3|6547|C4|9565|H|C0|true|C1|1848|C2|232e6552d0b8aa98|C3|1d50627abe5c0463|C4|5251|I|C0|ecd0/18CtAt7Z+barI7S7Ef+WTFQ23yVQ4VM8o+riN95sjo="
		);

		cacher.opts.maxParamsLength = null;
		res = cacher.getCacheKey("abc.def", bigObj);
		expect(res).toBe(
			"abc.def:A|C0|false|C1|true|C2|true|C3|495f761d77d6294f|C4|true|B|C0|true|C1|false|C2|true|C3|5721c26bfddb7927|C4|false|C|C0|5d9e85c124d5d09e|C1|true|C2|5366|C3|false|C4|false|D|C0|false|C1|true|C2|704473bca1242604|C3|false|C4|6fc56107e69be769|E|C0|true|C1|true|C2|4881|C3|true|C4|1418|F|C0|true|C1|false|C2|false|C3|false|C4|true|G|C0|false|C1|true|C2|false|C3|6547|C4|9565|H|C0|true|C1|1848|C2|232e6552d0b8aa98|C3|1d50627abe5c0463|C4|5251|I|C0|ecd0e4eae08e4f|C1|197bcb312fc17f60|C2|4755|C3|true|C4|9552|J|C0|false|C1|1cc45cadbbf240f|C2|4dbb352b21c3c2f3|C3|5065|C4|792b19631c78d4f6|K|C0|13c23a525adf9e1f|C1|true|C2|true|C3|589d3499abbf6765|C4|true|L|C0|false|C1|true|C2|4350|C3|72f6c4f0e9beb03c|C4|434b74b5ff500609|M|C0|9228|C1|5254b36ec238c266|C2|true|C3|27b040089b057684|C4|true|N|C0|35d3c608ef8aac5e|C1|23fbdbd520d5ae7d|C2|false|C3|9061|C4|true|O|C0|true|C1|true|C2|2382f9fe7834e0cc|C3|true|C4|false|P|C0|true|C1|false|C2|38c0d40b91a9d1f6|C3|false|C4|5512|Q|C0|true|C1|true|C2|true|C3|true|C4|true|R|C0|70bd27c06b067734|C1|true|C2|5213493253b98636|C3|8272|C4|1264|S|C0|61044125008e634c|C1|9175|C2|true|C3|225e3d912bfbc338|C4|false|T|C0|38edc77387da030a|C1|false|C2|38d8b9e2525413fc|C3|true|C4|false|U|C0|false|C1|4b3962c3d26bddd0|C2|1e66b069bad46643|C3|3642|C4|9225|V|C0|1c40e44b54486080|C1|5a560d81078bab02|C2|1c131259e1e9aa61|C3|true|C4|9335|W|C0|false|C1|7089b0ad438df2cb|C2|216aec98f513ac08|C3|true|C4|false|X|C0|3b749354aac19f24|C1|9626|C2|true|C3|false|C4|false|Y|C0|298|C1|224075dadd108ef9|C2|3450|C3|2548|C4|true"
		);

		cacher.opts.maxParamsLength = 44;
		res = cacher.getCacheKey(
			"users.list",
			{
				token: "eyJpZCI6Im9SMU1sS1hCdVVjSGlnM3QiLCJ1c2VybmFtZSI6ImljZWJvYiIsImV4cCI6MTUzNDYyMTk1MCwiaWF0IjoxNTI5NDM3OTUwfQ"
			},
			{},
			["token"]
		);
		expect(res).toBe("users.list:YUgoMlSXRyzkAI98NgGKRqakaZdCSJiITaRJWHyaJlU=");

		cacher.opts.maxParamsLength = 44;
		res = cacher.getCacheKey(
			"users.list",
			{
				id: 123,
				token: "eyJpZCI6Im9SMU1sS1hCdVVjSGlnM3QiLCJ1c2VybmFtZSI6ImljZWJvYiIsImV4cCI6MTUzNDYyMTk1MCwiaWF0IjoxNTI5NDM3OTUwfQ"
			},
			{},
			["id", "token"]
		);
		expect(res).toBe("users.list:jVksjHDWP+LfXPCxdnQC9Sa10+12yis9AhWmSOwCWfY=");

		cacher.opts.maxParamsLength = 100;
		res = cacher.getCacheKey(
			"users.list",
			{
				id: 123,
				token: "eyJpZCI6Im9SMU1sS1hCdVVjSGlnM3QiLCJ1c2VybmFtZSI6ImljZWJvYiIsImV4cCI6MTUzNDYyMTk1MCwiaWF0IjoxNTI5NDM3OTUwfQ"
			},
			{},
			["id"]
		);
		expect(res).toBe("users.list:123");
	});

	it("check getCacheKey with custom keygen", () => {
		let broker = new ServiceBroker({ logger: false });
		let keygen = jest.fn(() => "custom");
		let actionKeygen = jest.fn(() => "actionKeygen");
		let cacher = new Cacher({ keygen });

		cacher.init(broker);

		const actionName = "posts.find.model";
		const params = { limit: 5 };
		const meta = { user: "bob" };
		const keys = ["limit", "#user"];

		expect(cacher.getCacheKey(actionName, params, meta, keys)).toBe("custom");
		expect(keygen).toHaveBeenCalledTimes(1);
		expect(keygen).toHaveBeenCalledWith(actionName, params, meta, keys);

		expect(cacher.getCacheKey(actionName, params, meta, keys, actionKeygen)).toBe(
			"actionKeygen"
		);
		expect(actionKeygen).toHaveBeenCalledTimes(1);
		expect(actionKeygen).toHaveBeenCalledWith(actionName, params, meta, keys);
	});
});

describe("Test middleware", () => {
	let cachedData = { num: 5 };

	let cacher = new Cacher();
	// Fake connection
	cacher.connected = true;
	let broker = new ServiceBroker({
		logger: false,
		cacher
	});

	(cacher.get = jest.fn(() => Promise.resolve(cachedData))), (cacher.set = jest.fn());

	let mockAction = {
		name: "posts.find",
		cache: true,
		handler: jest.fn()
	};
	let params = { id: 3, name: "Antsa" };

	it("should give back the cached data and not called the handler", () => {
		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);
		expect(typeof cachedHandler).toBe("function");

		return cachedHandler(ctx).then(response => {
			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith("posts.find:id|3|name|Antsa");
			expect(mockAction.handler).toHaveBeenCalledTimes(0);
			expect(broker.cacher.set).toHaveBeenCalledTimes(0);
			expect(response).toBe(cachedData);
		});
	});

	it("should not give back cached data and should call the handler and call the 'cache.set' action with promise", () => {
		let resData = [1, 3, 5];
		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		mockAction.handler = jest.fn(() => Promise.resolve(resData));

		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);

		return cachedHandler(ctx).then(response => {
			expect(response).toBe(resData);
			expect(mockAction.handler).toHaveBeenCalledTimes(1);

			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);

			expect(broker.cacher.set).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledWith(cacheKey, resData, undefined);
		});
	});

	it("should call the 'cache.set' action with custom TTL", () => {
		let resData = [1];
		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		broker.cacher.set.mockClear();
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		mockAction.handler = jest.fn(() => Promise.resolve(resData));
		mockAction.cache = { ttl: 8 };

		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);

		return cachedHandler(ctx).then(response => {
			expect(response).toBe(resData);
			expect(mockAction.handler).toHaveBeenCalledTimes(1);

			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);

			expect(broker.cacher.set).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledWith(cacheKey, resData, 8);
		});
	});

	it("should not call cacher.get & set if cache = false", () => {
		let action = {
			name: "posts.get",
			cache: false,
			handler: jest.fn(() => Promise.resolve(cachedData))
		};
		cacher.get.mockClear();
		cacher.set.mockClear();

		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(action.handler, action);
		expect(typeof cachedHandler).toBe("function");

		return cachedHandler(ctx).then(() => {
			expect(cachedHandler).toBe(action.handler);
			expect(broker.cacher.get).toHaveBeenCalledTimes(0);
			expect(action.handler).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledTimes(0);
		});
	});

	it("should not call cacher.get & set if cache = { enabled: false }", () => {
		let action = {
			name: "posts.get",
			cache: {
				enabled: false
			},
			handler: jest.fn(() => Promise.resolve(cachedData))
		};
		cacher.get.mockClear();
		cacher.set.mockClear();

		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(action.handler, action);
		expect(typeof cachedHandler).toBe("function");

		return cachedHandler(ctx).then(() => {
			expect(cachedHandler).toBe(action.handler);
			expect(broker.cacher.get).toHaveBeenCalledTimes(0);
			expect(action.handler).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledTimes(0);
		});
	});

	it("should call custom enabled function", () => {
		let action = {
			name: "posts.get",
			cache: {
				enabled: ctx => ctx.params.cache !== false
			},
			handler: jest.fn(() => Promise.resolve(cachedData))
		};
		cacher.get.mockClear();
		cacher.set.mockClear();

		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(action.handler, action);
		expect(typeof cachedHandler).toBe("function");

		return cachedHandler(ctx).then(() => {
			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(action.handler).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledTimes(1);

			ctx.setParams({ cache: false });
			cacher.get.mockClear();
			cacher.set.mockClear();
			action.handler.mockClear();

			return cachedHandler(ctx).then(() => {
				expect(broker.cacher.get).toHaveBeenCalledTimes(0);
				expect(action.handler).toHaveBeenCalledTimes(1);
				expect(broker.cacher.set).toHaveBeenCalledTimes(0);
			});
		});
	});

	it("should not use cache if ctx.meta.$cache === false", () => {
		let action = {
			name: "posts.get",
			cache: {
				enabled: true
			},
			handler: jest.fn(() => Promise.resolve(cachedData))
		};
		cacher.get.mockClear();
		cacher.set.mockClear();

		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(action.handler, action);
		expect(typeof cachedHandler).toBe("function");

		return cachedHandler(ctx).then(() => {
			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(action.handler).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledTimes(1);

			ctx.meta.$cache = false;
			cacher.get.mockClear();
			cacher.set.mockClear();
			action.handler.mockClear();

			return cachedHandler(ctx).then(() => {
				expect(broker.cacher.get).toHaveBeenCalledTimes(0);
				expect(action.handler).toHaveBeenCalledTimes(1);
				expect(broker.cacher.set).toHaveBeenCalledTimes(0);
			});
		});
	});

	it("should call the handler if the connection to cacher is lost", () => {
		cacher.connected = false; // <- cacher lost connection

		let action = {
			name: "posts.get",
			cache: {
				enabled: true
			},
			// Return what you receive
			handler: jest.fn(() => Promise.resolve(params))
		};

		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(action.handler, action);
		expect(typeof cachedHandler).toBe("function");

		return cachedHandler(ctx).then(response => {
			expect(broker.cacher.get).toHaveBeenCalledTimes(0);
			expect(action.handler).toHaveBeenCalledTimes(1);
			expect(response).toBe(params);
		});
	});
});

describe("Test middleware with lock enabled", () => {
	let cachedData = { num: 5 };

	let cacher = new Cacher();
	// Fake connection
	cacher.connected = true;

	let broker = new ServiceBroker({
		logger: false,
		cacher
	});

	cacher.get = jest.fn(() => Promise.resolve(cachedData));
	cacher.set = jest.fn(() => Promise.resolve());
	cacher.getWithTTL = jest.fn(() => Promise.resolve({ data: cachedData, ttl: 15 }));

	let mockAction = {
		name: "posts.find",
		cache: {
			ttl: 60,
			lock: true
		},
		handler: jest.fn()
	};
	let params = { id: 6, name: "tiaod" };

	it("should give back the cached data and not called the handler", () => {
		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);
		expect(typeof cachedHandler).toBe("function");
		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		return cachedHandler(ctx).then(response => {
			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);

			expect(broker.cacher.getWithTTL).toHaveBeenCalledTimes(0);

			expect(broker.cacher.set).toHaveBeenCalledTimes(0);
			expect(mockAction.handler).toHaveBeenCalledTimes(0);
		});
	});

	it("should not give back cached data and should call the handler and call the 'cache.set' action with promise", () => {
		let resData = [1, 3, 5];
		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		broker.cacher.getWithTTL = jest.fn(() => Promise.resolve({ data: null, ttl: null }));
		const unlockFn = jest.fn(() => Promise.resolve());
		broker.cacher.lock = jest.fn(() => Promise.resolve(unlockFn));
		mockAction.handler = jest.fn(() => Promise.resolve(resData));

		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);
		return cachedHandler(ctx).then(response => {
			expect(broker.cacher.getWithTTL).toHaveBeenCalledTimes(0); //Check the cache key and ttl

			expect(broker.cacher.get).toHaveBeenCalledTimes(2); // Check the cache after acquired the lock
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);

			expect(broker.cacher.set).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledWith(cacheKey, resData, 60);
			expect(response).toBe(resData);
		});
	});

	it("should disable cache lock by defalut", () => {
		let mockAction = {
			name: "post.get",
			cache: {
				ttl: 30
			}
		};
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		broker.cacher.getWithTTL = jest.fn(() => Promise.resolve({ data: null, ttl: null }));
		broker.cacher.lock = jest.fn(() => Promise.resolve());
		mockAction.handler = jest.fn(() => Promise.resolve());

		let ctx = new Context();
		ctx.setParams(params);

		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);
		return cachedHandler(ctx).then(response => {
			expect(broker.cacher.lock).toHaveBeenCalledTimes(0);

			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);
		});
	});

	it("should not call cacher.lock if cache.lock = false", () => {
		let mockAction = {
			name: "post.get",
			cache: {
				ttl: 30,
				lock: false
			}
		};
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		broker.cacher.getWithTTL = jest.fn(() => Promise.resolve({ data: null, ttl: null }));
		const unlockFn = jest.fn(() => Promise.resolve());
		broker.cacher.lock = jest.fn(() => Promise.resolve(unlockFn));
		mockAction.handler = jest.fn(() => Promise.resolve());

		let ctx = new Context();
		ctx.setParams(params);

		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);
		return cachedHandler(ctx).then(response => {
			expect(broker.cacher.getWithTTL).toHaveBeenCalledTimes(0);
			expect(broker.cacher.lock).toHaveBeenCalledTimes(0);
			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);
		});
	});

	it("should not call cacher.lock if cache.lock = { enabled: false }", () => {
		let mockAction = {
			name: "post.get",
			cache: {
				ttl: 30,
				lock: {
					enabled: false
				}
			}
		};
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		const unlockFn = jest.fn(() => Promise.resolve());
		broker.cacher.lock = jest.fn(() => Promise.resolve(unlockFn));
		broker.cacher.getWithTTL = jest.fn(() => Promise.resolve({ data: null, ttl: null }));
		mockAction.handler = jest.fn(() => Promise.resolve());

		let ctx = new Context();
		ctx.setParams(params);

		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);
		return cachedHandler(ctx).then(response => {
			expect(broker.cacher.getWithTTL).toHaveBeenCalledTimes(0);
			expect(broker.cacher.lock).toHaveBeenCalledTimes(0);
			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);
		});
	});

	it("should call the handler only once when concurrency call a cacher with lock", () => {
		let resData = [6, 6, 6];
		const MemoryCacher = require("../../../src/cachers/memory");
		const cacher = new MemoryCacher();
		const broker = new ServiceBroker({
			logger: false,
			cacher
		});
		let mockAction = {
			name: "post.get",
			cache: {
				ttl: 30,
				lock: true
			}
		};
		const get = jest.spyOn(cacher, "get");
		const getWithTTL = jest.spyOn(cacher, "getWithTTL");
		const lock = jest.spyOn(cacher, "lock");
		mockAction.handler = jest.fn(() => {
			return new Promise(function (resolve, reject) {
				setTimeout(() => resolve(resData), 1000);
			});
		});

		let ctx = new Context();
		ctx.setParams(params);

		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);

		function call() {
			let ctx = new Context();
			ctx.setParams(params);
			return cachedHandler(ctx);
		}
		// Concurrency 3
		return Promise.all([call(), call(), call()])
			.then(responses => {
				for (let response of responses) {
					expect(response).toEqual(resData);
				}
				expect(mockAction.handler).toHaveBeenCalledTimes(1);
				expect(get).toHaveBeenCalledTimes(6);
				expect(getWithTTL).toHaveBeenCalledTimes(0);
				expect(lock).toHaveBeenCalledTimes(3);
			})
			.then(() => {
				return cacher.close();
			});
	});

	it("should realse the lock when an error throw", () => {
		const err = new Error("wrong");
		let mockAction = {
			name: "posts.find",
			cache: {
				ttl: 30,
				lock: true
			},
			handler: jest.fn(function (ctx) {
				return Promise.reject(err);
			})
		};
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		broker.cacher.getWithTTL = jest.fn(() => Promise.resolve({ data: null, ttl: null }));
		const unlockFn = jest.fn(() => Promise.resolve());
		broker.cacher.lock = jest.fn(() => Promise.resolve(unlockFn));
		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);
		return cachedHandler(new Context()).catch(e => {
			expect(e).toBe(err);
			expect(unlockFn).toHaveBeenCalledTimes(1);
		});
	});

	it("should refresh a stale key of cache", () => {
		let resData = [9, 9, 9];
		let mockAction = {
			name: "post.find",
			cache: {
				ttl: 30,
				lock: {
					staleTime: 10
				}
			},
			handler: jest.fn(() => Promise.resolve(resData))
		};
		broker.cacher.get = jest.fn(() => Promise.resolve(cachedData));
		broker.cacher.getWithTTL = jest.fn(() => Promise.resolve({ data: cachedData, ttl: 5 }));
		broker.cacher.set = jest.fn(() => Promise.resolve());
		const unlockFn = jest.fn(() => Promise.resolve());
		broker.cacher.lock = jest.fn(() => Promise.resolve(unlockFn));
		broker.cacher.tryLock = jest.fn(() => Promise.resolve(unlockFn));

		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);
		return new Promise(function (resolve, reject) {
			cachedHandler(new Context()).then(response => {
				expect(response).toBe(cachedData);
				expect(broker.cacher.get).toHaveBeenCalledTimes(0);
				expect(broker.cacher.getWithTTL).toHaveBeenCalledTimes(1);
				expect(broker.cacher.lock).toHaveBeenCalledTimes(0);
				expect(broker.cacher.tryLock).toHaveBeenCalledTimes(1);
				expect(mockAction.handler).toHaveBeenCalledTimes(1);
				setTimeout(resolve, 1000);
			});
		}).then(() => expect(unlockFn).toHaveBeenCalledTimes(1)); //Should finally unlock the lock.
	});

	it("should not call the handler if the cache is refreshed", () => {
		let resData = [8, 6, 4];
		let mockAction = {
			name: "post.find",
			cache: {
				ttl: 30,
				lock: {
					staleTime: 10
				}
			},
			handler: jest.fn(() => Promise.resolve(resData))
		};
		broker.cacher.get = jest.fn(() => Promise.resolve(cachedData));
		broker.cacher.getWithTTL = jest.fn(() => Promise.resolve({ data: cachedData, ttl: 25 }));
		broker.cacher.set = jest.fn(() => Promise.resolve());
		const unlockFn = jest.fn(() => Promise.resolve());
		broker.cacher.lock = jest.fn(() => Promise.resolve(unlockFn));
		broker.cacher.tryLock = jest.fn(() => Promise.resolve(unlockFn));

		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);
		return cachedHandler(new Context()).then(response => {
			expect(response).toBe(cachedData);
			expect(broker.cacher.get).toHaveBeenCalledTimes(0);
			expect(broker.cacher.getWithTTL).toHaveBeenCalledTimes(1);
			expect(broker.cacher.lock).toHaveBeenCalledTimes(0);
			expect(broker.cacher.tryLock).toHaveBeenCalledTimes(0);
			expect(unlockFn).toHaveBeenCalledTimes(0);
			expect(mockAction.handler).toHaveBeenCalledTimes(0);
		});
	});

	it("should realse the lock when refreshing a key and an error throw", () => {
		const err = new Error("wrong");
		let mockAction = {
			name: "posts.find",
			cache: {
				ttl: 30,
				lock: {
					staleTime: 10
				}
			},
			handler: jest.fn(ctx => Promise.reject(err))
		};

		broker.cacher.get = jest.fn(() => Promise.resolve(cachedData));
		broker.cacher.del = jest.fn(() => Promise.resolve());
		broker.cacher.getWithTTL = jest.fn(() => Promise.resolve({ data: cachedData, ttl: 5 }));
		broker.cacher.set = jest.fn(() => Promise.resolve());
		const unlockFn = jest.fn(() => Promise.resolve());
		broker.cacher.lock = jest.fn(() => Promise.resolve(unlockFn));
		broker.cacher.tryLock = jest.fn(() => Promise.resolve(unlockFn));
		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		let cachedHandler = cacher.middleware().localAction(mockAction.handler, mockAction);

		const ctx = new Context();
		ctx.setParams(params);

		return new Promise(function (resolve, reject) {
			cachedHandler(ctx).then(response => {
				expect(response).toBe(cachedData);
				expect(broker.cacher.get).toHaveBeenCalledTimes(0);
				expect(broker.cacher.getWithTTL).toHaveBeenCalledTimes(1);
				expect(broker.cacher.lock).toHaveBeenCalledTimes(0);
				expect(broker.cacher.tryLock).toHaveBeenCalledTimes(1);
				expect(mockAction.handler).toHaveBeenCalledTimes(1);
				setTimeout(resolve, 1000);
			});
		}).then(() => {
			expect(unlockFn).toHaveBeenCalledTimes(1); //Should finally unlock the lock.
			expect(broker.cacher.del).toHaveBeenCalledTimes(1);
			expect(broker.cacher.del).toHaveBeenCalledWith(cacheKey);
		});
	});
});
