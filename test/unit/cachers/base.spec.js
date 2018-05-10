const ServiceBroker = require("../../../src/service-broker");
const Cacher = require("../../../src/cachers/base");
const Context = require("../../../src/context");


describe("Test BaseCacher", () => {

	it("check constructor", () => {
		let cacher = new Cacher();
		expect(cacher).toBeDefined();
		expect(cacher.opts).toBeDefined();
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
		expect(cacher.opts.ttl).toBeNull();
		expect(cacher.opts.maxKeyLength).toBeNull();
	});

	it("check constructor with options", () => {
		let opts = { ttl: 500, maxKeyLength: 128 };
		let cacher = new Cacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(cacher.opts.ttl).toBe(500);
		expect(cacher.opts.maxKeyLength).toBe(128);
	});

	it("check init", () => {
		let broker = new ServiceBroker({ logger: false });
		broker.on = jest.fn();
		broker.use = jest.fn();
		let cacher = new Cacher();

		cacher.init(broker);
		expect(cacher.broker).toBe(broker);
		expect(cacher.logger).toBeDefined();
		expect(cacher.prefix).toBe("MOL-");

		expect(broker.use).toHaveBeenCalledTimes(1);

		/*
		expect(broker.on).toHaveBeenCalledTimes(2);
		expect(broker.on).toHaveBeenCalledWith("cache.clean", jasmine.any(Function));
		expect(broker.on).toHaveBeenCalledWith("cache.del", jasmine.any(Function));
		*/
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

		res = cacher.getCacheKey("user", {a: 5});
		expect(res).toBe("user:a|5");

		res = cacher.getCacheKey("user", {a: []});
		expect(res).toBe("user:a|");

		res = cacher.getCacheKey("user", {a: null});
		expect(res).toBe("user:a|null");

		res = cacher.getCacheKey("user", {a: 5}, null, ["a"]);
		expect(res).toBe("user:5");

		res = cacher.getCacheKey("user", {a: { id: 5 }}, null, ["a"]);
		expect(res).toBe("user:id|5");

		res = cacher.getCacheKey("user", { a: [1,3,5] }, null, ["a"]);
		expect(res).toBe("user:1|3|5");

		res = cacher.getCacheKey("user", {a: 5, b: 3, c: 5}, null, ["a"]);
		expect(res).toBe("user:5");

		res = cacher.getCacheKey("user", {a: { b: "John" }}, null, ["a.b"]);
		expect(res).toBe("user:John");

		res = cacher.getCacheKey("user", {a: 5, b: 3, c: 5}, null, ["a", "b", "c"]);
		expect(res).toBe("user:5|3|5");

		res = cacher.getCacheKey("user", {a: 5, c: 5}, null, ["a", "b", "c"]);
		expect(res).toBe("user:5|undefined|5");


		res = cacher.getCacheKey("user", {a: 5, b: { id: 3 }}, null, ["a", "c", "b"]);
		expect(res).toBe("user:5|undefined|id|3");

		res = cacher.getCacheKey("user", {a: 5, b: { id: 3, other: { status: true } }}, null, ["a", "c", "b.id"]);
		expect(res).toBe("user:5|undefined|3");

		res = cacher.getCacheKey("user", {a: 5, b: { id: 3, other: { status: true } }}, null, ["a", "b.id", "b.other.status"]);
		expect(res).toBe("user:5|3|true");

		res = cacher.getCacheKey("user", {a: 5, b: { id: 3, other: { status: true } }});
		expect(res).toBe("user:a|5|b|id|3|other|status|true");

		res = cacher.getCacheKey("user", {a: 5, b: 3}, null, []);
		expect(res).toBe("user");

		// Test with meta
		res = cacher.getCacheKey("user", {a: 5}, { user: "bob" });
		expect(res).toBe("user:a|5");

		res = cacher.getCacheKey("user", {a: 5}, { user: "bob" }, ["a"]);
		expect(res).toBe("user:5");

		res = cacher.getCacheKey("user", {a: 5}, { user: "bob" }, ["user"]);
		expect(res).toBe("user:undefined");

		res = cacher.getCacheKey("user", {a: 5}, { user: "bob" }, ["#user"]);
		expect(res).toBe("user:bob");

		res = cacher.getCacheKey("user", {a: 5}, { user: "bob" }, ["a", "#user"]);
		expect(res).toBe("user:5|bob");

		res = cacher.getCacheKey("user", {a: 5}, { user: "bob" }, ["#user", "a"]);
		expect(res).toBe("user:bob|5");

		res = cacher.getCacheKey("user", {a: 5, user: "adam"}, { user: "bob" }, ["#user"]);
		expect(res).toBe("user:bob");

		res = cacher.getCacheKey("user", {a: 5}, null, ["#user"]);
		expect(res).toBe("user:undefined");

		res = cacher.getCacheKey("user", null, {a: { b: { c: "nested" }}}, ["#a.b.c"]);
		expect(res).toBe("user:nested");
	});

	it("check getCacheKey with hashing", () => {
		let broker = new ServiceBroker({ logger: false });
		let cacher = new Cacher();
		let res;

		cacher.init(broker);

		const bigObj = {"A":{"C0":[0,4,6],"C1":true,"C2":3342,"C3":"5530af6f0cb29229","C4":"643ded40b0da2745"},"B":{"C0":"5a75b699c41d9a75","C1":false,"C2":true,"C3":"14e77e2edd0dcb98","C4":true},"C":{"C0":[5,9,7],"C1":true,"C2":[6,9,2],"C3":false,"C4":[9,5,0]},"D":{"C0":true,"C1":883,"C2":false,"C3":5645,"C4":2633},"E":{"C0":"4119cd276d9db0d1","C1":"50ed180e9583e17d","C2":true,"C3":false,"C4":[8,2,9]},"F":{"C0":"42146325b8cbca02","C1":false,"C2":true,"C3":5434,"C4":"55997c3e66920def"},"G":{"C0":false,"C1":false,"C2":[4,6,3],"C3":"41782dd5a2348223","C4":true},"H":{"C0":2337,"C1":6906,"C2":false,"C3":"40d74a450b623175","C4":true},"I":{"C0":true,"C1":[2,8,4],"C2":[1,8,7],"C3":false,"C4":true},"J":{"C0":true,"C1":false,"C2":"4e96dbf3f282df0c","C3":2548,"C4":"3aa6fb7043976492"},"K":{"C0":"394e2f2f68f510b7","C1":5776,"C2":[1,0,1],"C3":"248693f7ff03ae","C4":true},"L":{"C0":8210,"C1":true,"C2":false,"C3":true,"C4":true},"M":{"C0":[5,5,3],"C1":3579,"C2":2352,"C3":true,"C4":false},"N":{"C0":[8,3,8],"C1":6946,"C2":true,"C3":true,"C4":[8,3,5]},"O":{"C0":false,"C1":true,"C2":[3,4,5],"C3":false,"C4":7694},"P":{"C0":true,"C1":[9,5,3],"C2":false,"C3":"160aff0aa355691c","C4":"1e1ac668a9ce211c"},"Q":{"C0":"226ed51c1a3ab8ba","C1":[4,3,0],"C2":8623,"C3":true,"C4":"6d8d97befef92ca7"},"R":{"C0":true,"C1":"49fdbe5c79a9392e","C2":9540,"C3":[0,6,5],"C4":[9,6,7]},"S":{"C0":"7de076f622f9c370","C1":[6,6,5],"C2":"5a341d690938b35b","C3":false,"C4":true},"T":{"C0":7086,"C1":false,"C2":"18c0266dd067362d","C3":[2,9,8],"C4":true},"U":{"C0":false,"C1":6132,"C2":false,"C3":false,"C4":false},"V":{"C0":"33736e82b9b2a3f7","C1":false,"C2":8390,"C3":351,"C4":"1f19281ac4924648"},"W":{"C0":[1,9,3],"C1":973,"C2":[5,7,2],"C3":true,"C4":false},"X":{"C0":true,"C1":"4c311f7f595e47bb","C2":true,"C3":false,"C4":true},"Y":{"C0":false,"C1":"542e39e1c1fc1691","C2":true,"C3":[3,5,2],"C4":"1a8499f7dd494ff4"}};

		cacher.opts.maxKeyLength = 44;
		res = cacher.getCacheKey("abc.def", bigObj);
		expect(res).toBe("abc.def:TfvZ8TKvsujXJdXPcDpmkT4/iIoY/oIDmvVYtwTqUe0=");

		cacher.opts.maxKeyLength = 72;
		res = cacher.getCacheKey("abc.def", bigObj);
		expect(res).toBe("abc.def:A|C0|0|4|6|C1|true|C2|3342|CTfvZ8TKvsujXJdXPcDpmkT4/iIoY/oIDmvVYtwTqUe0=");

		cacher.opts.maxKeyLength = 771;
		res = cacher.getCacheKey("abc.def", bigObj);
		expect(res).toBe("abc.def:A|C0|0|4|6|C1|true|C2|3342|C3|5530af6f0cb29229|C4|643ded40b0da2745|B|C0|5a75b699c41d9a75|C1|false|C2|true|C3|14e77e2edd0dcb98|C4|true|C|C0|5|9|7|C1|true|C2|6|9|2|C3|false|C4|9|5|0|D|C0|true|C1|883|C2|false|C3|5645|C4|2633|E|C0|4119cd276d9db0d1|C1|50ed180e9583e17d|C2|true|C3|false|C4|8|2|9|F|C0|42146325b8cbca02|C1|false|C2|true|C3|5434|C4|55997c3e66920def|G|C0|false|C1|false|C2|4|6|3|C3|41782dd5a2348223|C4|true|H|C0|2337|C1|6906|C2|false|C3|40d74a450b623175|C4|true|I|C0|true|C1|2|8|4|C2|1|8|7|C3|false|C4|true|J|C0|true|C1|false|C2|4e96dbf3f282df0c|C3|2548|C4|3aa6fb7043976492|K|C0|394e2f2f68f510b7|C1|5776|C2|1|0|1|C3|248693f7ff03ae|C4|true|L|C0|8210|C1|true|C2|false|C3|true|C4|true|M|C0|5|5|3|C1|3579|C2|2352|C3|true|C4|TfvZ8TKvsujXJdXPcDpmkT4/iIoY/oIDmvVYtwTqUe0=");

		cacher.opts.maxKeyLength = null;
		res = cacher.getCacheKey("abc.def", bigObj);
		expect(res).toBe("abc.def:A|C0|0|4|6|C1|true|C2|3342|C3|5530af6f0cb29229|C4|643ded40b0da2745|B|C0|5a75b699c41d9a75|C1|false|C2|true|C3|14e77e2edd0dcb98|C4|true|C|C0|5|9|7|C1|true|C2|6|9|2|C3|false|C4|9|5|0|D|C0|true|C1|883|C2|false|C3|5645|C4|2633|E|C0|4119cd276d9db0d1|C1|50ed180e9583e17d|C2|true|C3|false|C4|8|2|9|F|C0|42146325b8cbca02|C1|false|C2|true|C3|5434|C4|55997c3e66920def|G|C0|false|C1|false|C2|4|6|3|C3|41782dd5a2348223|C4|true|H|C0|2337|C1|6906|C2|false|C3|40d74a450b623175|C4|true|I|C0|true|C1|2|8|4|C2|1|8|7|C3|false|C4|true|J|C0|true|C1|false|C2|4e96dbf3f282df0c|C3|2548|C4|3aa6fb7043976492|K|C0|394e2f2f68f510b7|C1|5776|C2|1|0|1|C3|248693f7ff03ae|C4|true|L|C0|8210|C1|true|C2|false|C3|true|C4|true|M|C0|5|5|3|C1|3579|C2|2352|C3|true|C4|false|N|C0|8|3|8|C1|6946|C2|true|C3|true|C4|8|3|5|O|C0|false|C1|true|C2|3|4|5|C3|false|C4|7694|P|C0|true|C1|9|5|3|C2|false|C3|160aff0aa355691c|C4|1e1ac668a9ce211c|Q|C0|226ed51c1a3ab8ba|C1|4|3|0|C2|8623|C3|true|C4|6d8d97befef92ca7|R|C0|true|C1|49fdbe5c79a9392e|C2|9540|C3|0|6|5|C4|9|6|7|S|C0|7de076f622f9c370|C1|6|6|5|C2|5a341d690938b35b|C3|false|C4|true|T|C0|7086|C1|false|C2|18c0266dd067362d|C3|2|9|8|C4|true|U|C0|false|C1|6132|C2|false|C3|false|C4|false|V|C0|33736e82b9b2a3f7|C1|false|C2|8390|C3|351|C4|1f19281ac4924648|W|C0|1|9|3|C1|973|C2|5|7|2|C3|true|C4|false|X|C0|true|C1|4c311f7f595e47bb|C2|true|C3|false|C4|true|Y|C0|false|C1|542e39e1c1fc1691|C2|true|C3|3|5|2|C4|1a8499f7dd494ff4");
	});

	it("check getCacheKey with custom keygen", () => {
		let broker = new ServiceBroker({ logger: false });
		let keygen = jest.fn(() => "custom");
		let cacher = new Cacher({ keygen });

		cacher.init(broker);

		let res = cacher.getCacheKey("posts.find.model", { limit: 5 }, { user: "bob" }, ["limit", "#user"]);
		expect(res).toBe("custom");
		expect(keygen).toHaveBeenCalledTimes(1);
		expect(keygen).toHaveBeenCalledWith("posts.find.model", { limit: 5 }, { user: "bob" }, ["limit", "#user"]);
	});
});

describe("Test middleware", () => {
	let cachedData = { num: 5 };

	let cacher = new Cacher();
	let broker = new ServiceBroker({
		logger: false,
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
		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware()(mockAction.handler, mockAction);
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
		let resData = [1,3,5];
		let cacheKey = cacher.getCacheKey(mockAction.name, params);
		broker.cacher.get = jest.fn(() => Promise.resolve(null));
		mockAction.handler = jest.fn(() => Promise.resolve(resData));

		let ctx = new Context();
		ctx.setParams(params);

		let cachedHandler = cacher.middleware()(mockAction.handler, mockAction);

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

		let cachedHandler = cacher.middleware()(mockAction.handler, mockAction);

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
