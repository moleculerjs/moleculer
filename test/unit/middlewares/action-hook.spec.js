const _ = require("lodash");
const ServiceBroker = require("../../../src/service-broker");
const { MoleculerError } = require("../../../src/errors");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").ActionHook;
const { protectReject } = require("../utils");

describe("Test ActionHookMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {
		schema: {
			hooks: {}
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
		broker.options.maxInFlight.enabled = false;

		const newHandler = mw.localAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);
	});

	it("should call simple before & after hooks", () => {
		service.schema.hooks.find = {
			before(ctx) {
				FLOW.push("before-hook");
				ctx.params.second = 2;
			},
			after(ctx, res) {
				FLOW.push("after-hook");
				return Object.assign(res, { b: 200 });
			}
		};

		let FLOW = [];

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
				"before-hook",
				"handler-1-2",
				"after-hook",
			]);
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call simple error hooks", () => {
		service.schema.hooks.find = {
			error(ctx, err) {
				FLOW.push("error-hook");
				throw err;
			}
		};

		let FLOW = [];
		const error = new MoleculerError("Simple error");

		const handler = jest.fn(ctx => {
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
			]);
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call multiple before & after hooks", () => {
		service.schema.hooks.find = {
			before: [
				function(ctx) {
					FLOW.push("before-hook-1");
					ctx.params.second = 2;
				},
				function(ctx) {
					FLOW.push("before-hook-2");
					ctx.params.third = 3;
				},
			],
			after: [
				function(ctx, res) {
					FLOW.push("after-hook-1");
					return Object.assign(res, { b: 200 });
				},
				function(ctx, res) {
					FLOW.push("after-hook-2");
					return Object.assign(res, { c: 300 });
				}
			]
		};

		let FLOW = [];

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
			});

			expect(FLOW).toEqual([
				"before-hook-1",
				"before-hook-2",
				"handler-1-2-3",
				"after-hook-1",
				"after-hook-2",
			]);
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call multiple error hooks", () => {
		service.schema.hooks.find = {
			error: [
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
			]
		};

		let FLOW = [];
		const error = new MoleculerError("Simple error");

		const handler = jest.fn(ctx => {
			FLOW.push("handler");
			return broker.Promise.reject(error);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler.call(broker, ctx).then(protectReject).catch(err => {
			expect(err).toBe(error);
			expect(err.a).toBe(100);
			expect(err.b).toBe(200);

			expect(FLOW).toEqual([
				"handler",
				"error-hook-1",
				"error-hook-2",
			]);
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});


});


