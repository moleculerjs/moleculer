const ServiceBroker = require("../../../src/service-broker");
const { MoleculerError } = require("../../../src/errors");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").ActionHook;
const { protectReject } = require("../utils");

describe("Test ActionHookMiddleware", () => {
	let FLOW = [];

	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {
		schema: {
			hooks: {},
		},
		beforeHookMethod(ctx) {
			FLOW.push(`method-before-hook-${ctx.action.rawName}`);
			ctx.params.second = 2;
		},
		afterHookMethod(ctx, res) {
			FLOW.push(`method-after-hook-${ctx.action.rawName}`);
			return Object.assign(res, { b: 200 });
		}
	};
	const action = {
		name: "posts.find",
		rawName: "find",
		handler,
		service
	};
	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		}
	};

	const mw = Middleware();

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
	});

	it("should not wrap handler if no hooks", () => {
		broker.options.bulkhead.enabled = false;

		const newHandler = mw.localAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);
	});

	it("should call simple before & after hooks", () => {
		service.schema.hooks = {
			before: {
				"*"(ctx) {
					FLOW.push("before-all-hook");
					ctx.params.hundred = 100;
				},
				find(ctx) {
					FLOW.push("before-hook");
					ctx.params.second = 2;
				},
			},
			after: {
				find(ctx, res) {
					FLOW.push("after-hook");
					return Object.assign(res, { b: 200 });
				},
				"*"(ctx, res) {
					FLOW.push("after-all-hook");
					return Object.assign(res, { x: 999 });
				}
			}
		};

		FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.first + "-" + ctx.params.second);
			return broker.Promise.resolve({ a: 100 });
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler.call(broker, ctx).catch(protectReject).then(res => {
			expect(res).toEqual({
				a: 100,
				b: 200,
				x: 999
			});

			expect(FLOW).toEqual([
				"before-all-hook",
				"before-hook",
				"handler-1-2",
				"after-hook",
				"after-all-hook",
			]);
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call simple error hooks", () => {
		service.schema.hooks = {
			error: {
				find(ctx, err) {
					FLOW.push("error-hook");
					throw err;
				},
				list(ctx, err) {
					FLOW.push("error-other-hook");
					throw err;
				},
				"*"(ctx, err) {
					FLOW.push("error-all-hook");
					throw err;
				}
			}
		};

		FLOW = [];
		const error = new MoleculerError("Simple error");

		const handler = jest.fn(() => {
			FLOW.push("handler");
			return broker.Promise.reject(error);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler.call(broker, ctx).then(protectReject).catch(err => {
			expect(err).toBe(error);

			expect(FLOW).toEqual([
				"handler",
				"error-hook",
				"error-all-hook",
			]);
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call multiple before & after hooks", () => {
		service.schema.hooks = {
			before: {
				"*": [
					function(ctx) {
						FLOW.push("before-all-hook-1");
						ctx.params.hundred = 100;
					},
					function(ctx) {
						FLOW.push("before-all-hook-2");
						ctx.params.hundred = 101;
					},
				],
				find: [
					function(ctx) {
						FLOW.push("before-hook-1");
						ctx.params.second = 2;
					},
					function(ctx) {
						FLOW.push("before-hook-2");
						ctx.params.third = 3;
					},
				],
			},
			after: {
				find: [
					function(ctx, res) {
						FLOW.push("after-hook-1");
						return Object.assign(res, { b: 200 });
					},
					function(ctx, res) {
						FLOW.push("after-hook-2");
						return Object.assign(res, { c: 300 });
					}
				],
				"*": [
					function(ctx, res) {
						FLOW.push("after-all-hook-1");
						return Object.assign(res, { x: 999 });
					},
					function(ctx, res) {
						FLOW.push("after-all-hook-2");
						res.x = 909;
						return res;
					}
				]
			}
		};

		FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.first + "-" + ctx.params.second + "-" + ctx.params.third);
			return broker.Promise.resolve({ a: 100 });
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler.call(broker, ctx).catch(protectReject).then(res => {
			expect(res).toEqual({
				a: 100,
				b: 200,
				c: 300,
				x: 909,
			});

			expect(FLOW).toEqual([
				"before-all-hook-1",
				"before-all-hook-2",
				"before-hook-1",
				"before-hook-2",
				"handler-1-2-3",
				"after-hook-1",
				"after-hook-2",
				"after-all-hook-1",
				"after-all-hook-2",
			]);
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call multiple error hooks", () => {
		service.schema.hooks = {
			error: {
				find: [
					function(ctx, err) {
						FLOW.push("error-hook-1");
						err.a = 100;
						throw err;
					},
					function(ctx, err) {
						FLOW.push("error-hook-2");
						err.b = 200;
						throw err;
					},
				],
				"*": [
					function(ctx, err) {
						FLOW.push("error-all-hook-1");
						err.x = 999;
						err.y = 888;
						throw err;
					},
					function(ctx, err) {
						FLOW.push("error-all-hook-2");
						err.x = 909;
						throw err;
					},
				]
			}
		};

		FLOW = [];
		const error = new MoleculerError("Simple error");

		const handler = jest.fn(() => {
			FLOW.push("handler");
			return broker.Promise.reject(error);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler.call(broker, ctx).then(protectReject).catch(err => {
			expect(err).toBe(error);
			expect(err.a).toBe(100);
			expect(err.b).toBe(200);
			expect(err.x).toBe(909);
			expect(err.y).toBe(888);

			expect(FLOW).toEqual([
				"handler",
				"error-hook-1",
				"error-hook-2",
				"error-all-hook-1",
				"error-all-hook-2",
			]);
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call service method hooks if the hook is a 'string'", () => {
		service.schema.hooks = {
			before: {
				find: [
					function(ctx) {
						FLOW.push("before-hook-1");
						ctx.params.second = 2;
					},
					"beforeHookMethod"
				],
			},
			after: {
				find: "afterHookMethod"
			}
		};

		FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.first + "-" + ctx.params.second);
			return broker.Promise.resolve({ a: 100 });
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler.call(broker, ctx).catch(protectReject).then(res => {
			expect(res).toEqual({
				a: 100,
				b: 200
			});

			expect(FLOW).toEqual([
				"before-hook-1",
				"method-before-hook-find",
				"handler-1-2",
				"method-after-hook-find",
			]);
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

});


