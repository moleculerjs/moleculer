const ServiceBroker = require("../../src/service-broker");
const Cacher = require("../../src/cachers/base");
const Context = require("../../src/context");
const utils = require("../../src/utils");

describe("Test BaseCacher", () => {

	it("check constructor", () => {
		let cacher = new Cacher();
		expect(cacher).toBeDefined();
		expect(cacher.opts).toBeDefined();
		expect(cacher.prefix).toBe("");
		expect(cacher.opts.ttl).toBeNull();
		expect(cacher.init).toBeDefined();
		expect(cacher.get).toBeDefined();
		expect(cacher.set).toBeDefined();
		expect(cacher.del).toBeDefined();
		expect(cacher.clean).toBeDefined();
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
		let cacher = new Cacher();

		cacher.init(broker);
		expect(cacher.broker).toBe(broker);
		expect(cacher.logger).toBeDefined();
	});


	it("check getCacheKey", () => {
		let broker = new ServiceBroker();
		let cacher = new Cacher();

		cacher.init(broker);
		// Check result
		let res = cacher.getCacheKey("posts.find.model", { id: 1, name: "Bob" });
		expect(res).toBe("posts.find.model:bab3f6e5c7672d1d642523157711b8b745b1bc9b");

		// Same result, with same params
		let res2 = cacher.getCacheKey("posts.find.model", { id: 1, name: "Bob" });
		expect(res2).toEqual(res); 

		// Different result, with different params
		let res3 = cacher.getCacheKey("posts.find.model", { id: 2, name: "Bob" });
		expect(res3).not.toEqual(res); 
		expect(res3).toBe("posts.find.model:01738894945c7c885d275a0ec2ced133e2d9d6ed");

		res = cacher.getCacheKey();
		expect(res).toBe("");
		
		res = cacher.getCacheKey("posts.find");
		expect(res).toBe("posts.find:");
		
		res = cacher.getCacheKey(null, {});
		expect(res).toBe("323217f643c3e3f1fe7532e72ac01bb0748c97be");
		
		res = cacher.getCacheKey(null, {a: 5});
		expect(res).toBe("4a811383176bf8c7bf15a2cec8f91d4e9636383f");
		
	});	
});

describe("Test utils.wrapHandler", () => {
	let cachedData = { num: 5 };

	let cacher = new Cacher();
	let broker = new ServiceBroker({
		cacher
	});

	cacher.get = jest.fn(() => Promise.resolve(cachedData)),
	cacher.set = jest.fn();

	let mockAction = {
		name: "posts.find",
		handler: jest.fn()
	};
	let params = { id: 3, name: "Antsa" };

	it("should give back the cached data and not called the handler", () => {
		let cachedHandler = cacher.wrapHandler(mockAction);
		expect(typeof cachedHandler).toBe("function");

		let ctx = new Context({ params, service: { broker } });
		let p = cachedHandler(ctx);

		expect(utils.isPromise(p)).toBeTruthy();
		return p.then((response) => {
			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith("posts.find:e263ebd5ec9c63793ee3316efb8bfbe9f761f7ba");
			expect(mockAction.handler).toHaveBeenCalledTimes(0);
			expect(response).toBe(cachedData);
		});
	});

	it("should not give back cached data and should call the handler and call the 'cache.put' action with promise", () => {
		let resData = [1,3,5];
		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		mockAction.handler = jest.fn(() => Promise.resolve(resData));

		let cachedHandler = cacher.wrapHandler(mockAction);

		let ctx = new Context({ params, service: { broker } });
		let p = cachedHandler(ctx);

		expect(utils.isPromise(p)).toBeTruthy();
		return p.then((response) => {
			expect(response).toBe(resData);
			expect(mockAction.handler).toHaveBeenCalledTimes(1);

			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);

			expect(broker.cacher.set).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledWith(cacheKey, resData);
		});
	});

	it("should not give back cached data and should call the handler and call the 'cache.put' action with sync res", () => {
		let resData = [1,3,5];
		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		broker.cacher.set.mockClear();
		mockAction.handler = jest.fn(() => resData); // no Promise

		let cachedHandler = cacher.wrapHandler(mockAction);

		let ctx = new Context({ params, service: { broker } });
		let p = cachedHandler(ctx);

		expect(utils.isPromise(p)).toBeTruthy();
		return p.then((response) => {
			expect(response).toBe(resData);
			expect(mockAction.handler).toHaveBeenCalledTimes(1);

			expect(broker.cacher.get).toHaveBeenCalledTimes(1);
			expect(broker.cacher.get).toHaveBeenCalledWith(cacheKey);

			expect(broker.cacher.set).toHaveBeenCalledTimes(1);
			expect(broker.cacher.set).toHaveBeenCalledWith(cacheKey, resData);
		});
	});

});
