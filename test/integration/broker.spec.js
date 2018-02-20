const ServiceBroker = require("../../src/service-broker");
const MemoryCacher = require("../../src/cachers/memory");
const Context = require("../../src/context");

describe("Test load services", () => {
	let broker = new ServiceBroker();

	it("should create service from schema", () => {
		let handler = jest.fn();
		broker.createService({
			name: "mailer",
			version: 2,
			actions: {
				send: handler
			}
		});

		expect(broker.getLocalService("mailer", 2)).toBeDefined();
		expect(broker.registry.actions.isAvailable("v2.mailer.send")).toBe(true);

		broker.call("v2.mailer.send").then(() => {
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should load all services", () => {
		let count = broker.loadServices("./test/services");
		expect(count).toBe(4);

		//expect(broker.getLocalService("greeter")).toBeDefined();
		expect(broker.getLocalService("math")).toBeDefined();
		expect(broker.getLocalService("posts")).toBeDefined();
		expect(broker.getLocalService("users")).toBeDefined();
		expect(broker.getLocalService("test")).toBeDefined();
	});
});

describe("Test local call", () => {

	let broker = new ServiceBroker({ metrics: true });

	let actionHandler = jest.fn(ctx => ctx);
	let exportHandler = jest.fn(ctx => {
		ctx.meta.headers = { "Content-Type": "text/csv" };
		return ctx;
	});

	broker.createService({
		name: "posts",
		actions: {
			find: actionHandler,
			export: exportHandler
		}
	});

	it("should return context & call the action handler", () => {
		return broker.call("posts.find").then(ctx => {
			expect(ctx).toBeDefined();
			expect(ctx.broker).toBe(broker);
			expect(ctx.action.name).toBe("posts.find");
			expect(ctx.nodeID).toBe(broker.nodeID);
			expect(ctx.params).toBeDefined();
			expect(actionHandler).toHaveBeenCalledTimes(1);
			expect(actionHandler).toHaveBeenCalledWith(ctx);
		});
	});

	it("should set params to context", () => {
		let params = { a: 1 };
		return broker.call("posts.find", params).then(ctx => {
			expect(ctx.params).toEqual({ a: 1});
		});
	});

	it("should create a sub context of parent context", () => {
		let parentCtx = new Context();
		parentCtx.params = {
			a: 5,
			b: 2
		};
		parentCtx.meta = {
			user: "John",
			roles: ["user"],
			status: true
		};

		let params = { a: 1 };
		let meta = {
			user: "Jane",
			roles: ["admin"],
			verified: true
		};
		parentCtx.metrics = true;
		parentCtx.requestID = "12345";

		return broker.call("posts.find", params, { parentCtx, meta }).then(ctx => {
			expect(ctx.id).not.toBe(parentCtx.id);
			expect(ctx.params).toBe(params);
			expect(ctx.meta).toEqual({ user: "Jane", roles: ["admin"], status: true, verified: true });
			expect(ctx.level).toBe(2);
			expect(ctx.metrics).toBe(true);
			expect(ctx.parentID).toBe(parentCtx.id);
			expect(ctx.requestID).toBe("12345");
		});

	});

	it("should merge meta from sub context to parent context", () => {
		let ctx = new Context(broker, {});

		ctx.meta = {
			user: "John",
			roles: ["user"],
			status: true
		};

		let meta = {
			user: "Jane",
			roles: ["admin"],
			verified: true
		};
		ctx.metrics = true;
		ctx.requestID = "12345";

		return ctx.call("posts.export", {}, { meta }).then(newCtx => {
			expect(newCtx.id).not.toBe(ctx.id);
			expect(newCtx.level).toBe(2);
			expect(newCtx.metrics).toBe(true);
			expect(newCtx.parentID).toBe(ctx.id);
			expect(newCtx.requestID).toBe("12345");

			expect(newCtx.meta).toEqual({
				roles: ["admin"],
				status: true,
				user: "Jane",
				verified: true,
				headers: {
					"Content-Type": "text/csv"
				}
			});

			expect(ctx.meta).toEqual({
				roles: ["admin"],
				status: true,
				user: "Jane",
				verified: true,
				headers: {
					"Content-Type": "text/csv"
				}
			});
		});

	});
});


describe("Test versioned action registration", () => {

	let broker = new ServiceBroker();

	let findV1 = jest.fn(ctx => ctx);
	let findV2 = jest.fn(ctx => ctx);

	broker.createService({
		name: "posts",
		version: 1,

		actions: {
			find: findV1
		}
	});

	broker.createService({
		name: "posts",
		version: 2,

		actions: {
			find: findV2
		}
	});

	it("should call the v1 handler", () => {
		return broker.call("v1.posts.find").then(() => {
			expect(findV1).toHaveBeenCalledTimes(1);
		});
	});

	it("should call the v2 handler", () => {
		return broker.call("v2.posts.find").then(() => {
			expect(findV2).toHaveBeenCalledTimes(1);
		});
	});

});

describe("Test cachers", () => {

	let broker = new ServiceBroker({
		cacher: new MemoryCacher()
	});

	let handler = jest.fn(() => "Action result");

	broker.createService({
		name: "user",
		actions: {
			get: {
				cache: true,
				handler
			},

			save(ctx) {
				ctx.emit("cache.clean");
			}
		}
	});

	it("should call action handler because the cache is empty", () => {
		return broker.call("user.get").then(res => {
			expect(res).toBe("Action result");
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should NOT call action handler because the cache is loaded", () => {
		handler.mockClear();

		return broker.call("user.get").then(res => {
			expect(res).toBe("Action result");
			expect(handler).toHaveBeenCalledTimes(0);
		});
	});

	it("clear the cache with `save` action", () => {
		handler.mockClear();

		return broker.call("user.save").then(() => {
			expect(handler).toHaveBeenCalledTimes(0);
		});
	});

	it("should NOT call action handler because the cache is loaded", () => {
		handler.mockClear();

		return broker.call("user.get").then(res => {
			expect(res).toBe("Action result");
			expect(handler).toHaveBeenCalledTimes(0);
		});
	});

});

