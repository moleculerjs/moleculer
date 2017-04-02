const ServiceBroker = require("../../../src/service-broker");
const Cacher = require("../../../src/cachers/base");
const Context = require("../../../src/context");

// Unit: OK!
describe("Test BaseCacher", () => {

	it("check constructor", () => {
		let cacher = new Cacher();
		expect(cacher).toBeDefined();
		expect(cacher.opts).toBeDefined();
		expect(cacher.prefix).toBe("");
		expect(cacher.opts.ttl).toBeNull();
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
		expect(cacher.prefix).toBe("");
		expect(cacher.opts.ttl).toBeNull();
	});

	it("check constructor with options", () => {
		let opts = { prefix: "TEST", ttl: 500 };
		let cacher = new Cacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(cacher.prefix).toBe("TEST");
		expect(cacher.opts.ttl).toBe(500);
	});

	it("check init", () => {
		let broker = new ServiceBroker();
		broker.on = jest.fn();
		broker.use = jest.fn();
		let cacher = new Cacher();

		cacher.init(broker);
		expect(cacher.broker).toBe(broker);
		expect(cacher.logger).toBeDefined();

		expect(broker.use).toHaveBeenCalledTimes(1);

		expect(broker.on).toHaveBeenCalledTimes(2);
		expect(broker.on).toHaveBeenCalledWith("cache.clean", jasmine.any(Function));
		expect(broker.on).toHaveBeenCalledWith("cache.del", jasmine.any(Function));
	});


	it("check getCacheKey", () => {
		let broker = new ServiceBroker();
		let cacher = new Cacher();

		cacher.init(broker);
		// Check result
		let res = cacher.getCacheKey("posts.find.model", { id: 1, name: "Bob" });
		expect(res).toBe("posts.find.model:db2f5d71b3715e65c4f31a1cc510a90ed93b4f99abc4579da7f34cd4976ab79e");

		// Same result, with same params
		let res2 = cacher.getCacheKey("posts.find.model", { id: 1, name: "Bob" });
		expect(res2).toEqual(res); 

		// Different result, with different params
		let res3 = cacher.getCacheKey("posts.find.model", { id: 2, name: "Bob" });
		expect(res3).not.toEqual(res); 
		expect(res3).toBe("posts.find.model:f67b30a6ce5a28452217cb3b63a28d9db412e70de5ec1938ad373b36fa98073f");

		res = cacher.getCacheKey();
		expect(res).toBe("");
		
		res = cacher.getCacheKey("posts.find");
		expect(res).toBe("posts.find");
		
		res = cacher.getCacheKey(null, {});
		expect(res).toBe("");
		
		res = cacher.getCacheKey(null, {a: 5});
		expect(res).toBe("b0a7093990109d1355dc833dcddecae4de9624d2226b9499d459b8ef94353942");

		res = cacher.getCacheKey(null, {a: 5}, ["a"]);
		expect(res).toBe("5");
		
		res = cacher.getCacheKey(null, {a: 5, b: 3, c: 5}, ["a"]);
		expect(res).toBe("5");
		
		res = cacher.getCacheKey(null, {a: 5, b: { id: 3 }}, ["a", "c", "b"]);
		// FIXME
		//expect(res).toBe("5--<hashed object>");

		res = cacher.getCacheKey(null, {a: 5, b: { id: 3 }}, ["a", "c", "b.id"]);
		// FIXME
		//expect(res).toBe("5--3");
		
		res = cacher.getCacheKey(null, {a: 5, b: 3}, []);
		expect(res).toBe("");
		
	});	
});

describe("Test middleware", () => {
	let cachedData = { num: 5 };

	let cacher = new Cacher();
	let broker = new ServiceBroker({
		cacher
	});

	cacher.get = jest.fn(() => Promise.resolve(cachedData)),
	cacher.set = jest.fn();

	let mockAction = {
		name: "posts.find",
		cache: true,
		handler: jest.fn()
	};
	let params = { id: 3, name: "Antsa" };

	it("should give back the cached data and not called the handler", () => {
		let ctx = new Context({ params, service: { broker } });
		let cachedHandler = cacher.middleware()(mockAction.handler, mockAction);
		expect(typeof cachedHandler).toBe("function");

		return cachedHandler(ctx).then(response => {
			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith("posts.find:60b51087180be386e8a4917dd118a422b72faf4bc5bb58c0628c8382356595b2");
			expect(mockAction.handler).toHaveBeenCalledTimes(0);
			expect(broker.cacher.set).toHaveBeenCalledTimes(0);
			expect(response).toBe(cachedData);
		});

	});

	it("should not give back cached data and should call the handler and call the 'cache.set' action with promise", () => {
		let resData = [1,3,5];
		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		mockAction.handler = jest.fn(() => Promise.resolve(resData));

		let ctx = new Context({ params, service: { broker } });
		let cachedHandler = cacher.middleware()(mockAction.handler, mockAction);

		return cachedHandler(ctx).then(response => {
			expect(response).toBe(resData);
			expect(mockAction.handler).toHaveBeenCalledTimes(1);

			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);

			expect(broker.cacher.set).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledWith(cacheKey, resData);
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

		let ctx = new Context({ params, service: { broker } });
		let cachedHandler = cacher.middleware()(action.handler, action);
		expect(typeof cachedHandler).toBe("function");

		return cachedHandler(ctx).then(() => {
			expect(cachedHandler).toBe(action.handler);
			expect(broker.cacher.get).toHaveBeenCalledTimes(0);
			expect(action.handler).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledTimes(0);
		});

	});	

});

describe("Test cache.clean & cache.del events", () => {
	let cacher = new Cacher();
	let broker = new ServiceBroker({
		cacher
	});

	cacher.clean = jest.fn(),
	cacher.del = jest.fn();

	it("should call clean method", () => {
		broker.emit("cache.clean", "users.*");
		expect(cacher.clean).toHaveBeenCalledTimes(1);
		expect(cacher.clean).toHaveBeenCalledWith("users.*");
	});

	it("should call del method", () => {
		broker.emit("cache.del", "users.model.123");
		expect(cacher.del).toHaveBeenCalledTimes(1);
		expect(cacher.del).toHaveBeenCalledWith("users.model.123");
	});

	it("should call clean method multiple times", () => {
		cacher.clean.mockClear();
		broker.emit("cache.clean", ["users.*", "posts.*"]);
		expect(cacher.clean).toHaveBeenCalledTimes(2);
		expect(cacher.clean).toHaveBeenCalledWith("users.*");
		expect(cacher.clean).toHaveBeenCalledWith("posts.*");
	});

	it("should call del method multiple times", () => {
		cacher.del.mockClear();
		broker.emit("cache.del", ["users.model.123", "users.model.222"]);
		expect(cacher.del).toHaveBeenCalledTimes(2);
		expect(cacher.del).toHaveBeenCalledWith("users.model.123");
		expect(cacher.del).toHaveBeenCalledWith("users.model.222");
	});
});