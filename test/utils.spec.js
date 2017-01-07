const utils = require("../src/utils");
const Context = require("../src/context");
let ServiceBroker = require("../src/service-broker");

describe("Test utils", () => {

	it("utils.generateToken", () => {
		let res1 = utils.generateToken();
		expect(res1).toBeDefined();

		let res2 = utils.generateToken();
		expect(res2).toBeDefined();
		expect(res1).not.toEqual(res2);
	});

	it("utils.getCacheKey", () => {
		// Check result
		let res = utils.getCacheKey("posts.find.model", { id: 1, name: "Bob" });
		expect(res).toBe("posts.find.model:bab3f6e5c7672d1d642523157711b8b745b1bc9b");

		// Same result, with same params
		let res2 = utils.getCacheKey("posts.find.model", { id: 1, name: "Bob" });
		expect(res2).toEqual(res); 

		// Different result, with different params
		let res3 = utils.getCacheKey("posts.find.model", { id: 2, name: "Bob" });
		expect(res3).not.toEqual(res); 
		expect(res3).toBe("posts.find.model:01738894945c7c885d275a0ec2ced133e2d9d6ed");

		res = utils.getCacheKey();
		expect(res).toBe("");
		
		res = utils.getCacheKey("posts.find");
		expect(res).toBe("posts.find:");
		
		res = utils.getCacheKey(null, {});
		expect(res).toBe("323217f643c3e3f1fe7532e72ac01bb0748c97be");
		
		res = utils.getCacheKey(null, {a: 5});
		expect(res).toBe("4a811383176bf8c7bf15a2cec8f91d4e9636383f");
		
	});

	it("utils.isPromise", () => {
		expect(utils.isPromise()).toBeFalsy();
		expect(utils.isPromise({})).toBeFalsy();
		expect(utils.isPromise(new Promise(() => {}))).toBeTruthy();
		expect(utils.isPromise(Promise.resolve())).toBeTruthy();
	});
});

describe("Test utils.cachingWrapper", () => {
	let cachedData = { num: 5 };

	let broker = new ServiceBroker();
	broker.cacher = {
		get: jest.fn(() => Promise.resolve(cachedData)),
		set: jest.fn()
	};

	let mockAction = {
		name: "posts.find",
		handler: jest.fn()
	};
	let params = { id: 3, name: "Antsa" };

	it("should give back the cached data and not called the handler", () => {
		let cachedHandler = utils.cachingWrapper(broker, mockAction, mockAction.handler);
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
		let cacheKey = utils.getCacheKey(mockAction.name, params);
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		mockAction.handler = jest.fn(() => Promise.resolve(resData));

		let cachedHandler = utils.cachingWrapper(broker, mockAction, mockAction.handler);

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
		let cacheKey = utils.getCacheKey(mockAction.name, params);
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		broker.cacher.set.mockClear();
		mockAction.handler = jest.fn(() => resData); // no Promise

		let cachedHandler = utils.cachingWrapper(broker, mockAction, mockAction.handler);

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


describe("Test utils.getNodeID", () => {
	let os = require("os");
	it("should give the computer hostname", () => {
		expect(utils.getNodeID()).toBe(os.hostname().toLowerCase());
	});
});

describe("Test utils.string2Json", () => {
	let str = '{"a": 1, "b": [1,5,8], "c": "Test" }';
	it("should give JS object", () => {
		expect(utils.string2Json()).toBeUndefined();
		expect(utils.string2Json("")).toBeUndefined();
		expect(utils.string2Json(str)).toEqual({
			a: 1, 
			b: [1,5,8],
			c: "Test"
		});
	});
});

describe("Test utils.json2String", () => {
	let str = '{"a":1,"b":[1,5,8],"c":"Test"}';
	let obj = {
		a: 1, 
		b: [1,5,8],
		c: "Test"
	};

	it("should give JSON string", () => {
		expect(utils.json2String()).toBe("");
		expect(utils.json2String(null)).toBe("");
		expect(utils.json2String(obj)).toBe(str);
	});
});

describe("Test utils.wrapLogger", () => {
	let con = {
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn()
	};

	it("should create a full logger without moduleName", () => {
		let logger = utils.wrapLogger(con);
		expect(typeof logger.log).toBe("function");
		expect(typeof logger.error).toBe("function");
		expect(typeof logger.warn).toBe("function");
		expect(typeof logger.info).toBe("function");
		expect(typeof logger.debug).toBe("function");

		logger.log("log level");
		expect(con.log).toHaveBeenCalledTimes(1);
		expect(con.log).toHaveBeenCalledWith("log level");

		logger.warn("warn level");
		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("warn level");

		logger.error("error level");
		expect(con.error).toHaveBeenCalledTimes(1);
		expect(con.error).toHaveBeenCalledWith("error level");

		logger.info("info level");
		expect(con.log).toHaveBeenCalledTimes(2);
		expect(con.log).toHaveBeenCalledWith("info level");

		logger.debug("debug level");
		expect(con.log).toHaveBeenCalledTimes(3);
		expect(con.log).toHaveBeenCalledWith("debug level");
	});
});

describe("Test utils.wrapLogger", () => {
	let con = {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn()
	};

	it("should create a full logger without moduleName", () => {
		let logger = utils.wrapLogger(con, "Module");
		expect(typeof logger.log).toBe("function");
		expect(typeof logger.error).toBe("function");
		expect(typeof logger.warn).toBe("function");
		expect(typeof logger.info).toBe("function");
		expect(typeof logger.debug).toBe("function");

		logger.log("log level");
		expect(con.info).toHaveBeenCalledTimes(1);
		expect(con.info).toHaveBeenCalledWith("[Module] log level");

		logger.warn("warn level");
		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("[Module] warn level");

		logger.error("error level");
		expect(con.error).toHaveBeenCalledTimes(1);
		expect(con.error).toHaveBeenCalledWith("[Module] error level");

		logger.info("info level");
		expect(con.info).toHaveBeenCalledTimes(2);
		expect(con.info).toHaveBeenCalledWith("[Module] info level");

		logger.debug("debug level");
		expect(con.info).toHaveBeenCalledTimes(3);
		expect(con.info).toHaveBeenCalledWith("[Module] debug level");

	});
});