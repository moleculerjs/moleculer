const _ = require("lodash");
const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").Bulkhead;
const { protectReject } = require("../utils");

describe("Test BulkheadMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {};
	const action = {
		name: "posts.find",
		bulkhead: {
			enabled: false
		},
		handler,
		service
	};
	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		}
	};

	jest.spyOn(broker.metrics, "increment");
	jest.spyOn(broker.metrics, "decrement");
	jest.spyOn(broker.metrics, "set");

	const mw = Middleware(broker);
	mw.created(broker);

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
	});

	it("should not wrap handler if bulkhead is disabled", () => {
		broker.options.bulkhead.enabled = false;

		const newHandler = mw.localAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);
	});

	it("should wrap handler if bulkhead is disabled but in action is enabled", () => {
		broker.options.bulkhead.enabled = false;
		action.bulkhead.enabled = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});

	it("should wrap handler if bulkhead is enabled", () => {
		broker.options.bulkhead.enabled = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});

	it("should not wrap handler if bulkhead is enabled but in action is disabled", () => {
		broker.options.bulkhead.enabled = true;
		action.bulkhead.enabled = false;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).toBe(handler);
	});

	it("should register metrics", () => {
		broker.isMetricsEnabled = jest.fn(() => true);
		broker.metrics.register = jest.fn();

		mw.created.call(broker, broker);

		expect(broker.metrics.register).toHaveBeenCalledTimes(1);
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "gauge", name: "moleculer.request.bulkhead.inflight", labelNames: ["action"] });
	});

	it("should call 3 times immediately & 7 times after some delay (queueing)", () => {
		action.bulkhead.enabled = true;
		action.bulkhead.concurrency = 3;
		action.bulkhead.maxQueueSize = 10;

		let FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.id);
			return broker.Promise.delay(10 * ctx.params.id);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctxs = _.times(10, i => Context.create(broker, endpoint, { id: i + 1 }));
		Promise.all(ctxs.map(ctx => newHandler.call(broker, ctx)));

		expect(FLOW).toEqual(expect.arrayContaining([
			"handler-1",
			"handler-2",
			"handler-3",
		]));
		expect(handler).toHaveBeenCalledTimes(3);

		expect(broker.metrics.set).toHaveBeenCalledTimes(3);
		expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.request.bulkhead.inflight", 1, { action: "posts.find" });
		expect(broker.metrics.set).toHaveBeenNthCalledWith(2, "moleculer.request.bulkhead.inflight", 2, { action: "posts.find" });
		expect(broker.metrics.set).toHaveBeenNthCalledWith(3, "moleculer.request.bulkhead.inflight", 3, { action: "posts.find" });
		broker.metrics.set.mockClear();

		FLOW = [];

		return broker.Promise.delay(500).catch(protectReject).then(() => {
			expect(FLOW).toEqual(expect.arrayContaining([
				"handler-4",
				"handler-5",
				"handler-6",
				"handler-7",
				"handler-8",
				"handler-9",
				"handler-10",
			]));
			expect(handler).toHaveBeenCalledTimes(10);

			expect(broker.metrics.set).toHaveBeenCalledTimes(10);
		});
	});

	it("should call 3 times immediately & 5 times after some delay (queueing) and throw error because 2 are out of queue size", () => {
		action.bulkhead.enabled = true;
		action.bulkhead.concurrency = 3;
		action.bulkhead.maxQueueSize = 5;

		let FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.id);
			return broker.Promise.delay(10 * ctx.params.id);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctxs = _.times(10, i => Context.create(broker, endpoint, { id: i + 1 }));
		const p = broker.Promise.all(ctxs.map(ctx => newHandler.call(broker, ctx).catch(err => FLOW.push(err.name + "-" + ctx.params.id))));

		expect(FLOW).toEqual(expect.arrayContaining([
			"handler-1",
			"handler-2",
			"handler-3",
		]));
		expect(handler).toHaveBeenCalledTimes(3);

		FLOW = [];

		return p.delay(500).catch(protectReject).then(() => {
			expect(FLOW).toEqual(expect.arrayContaining([
				"handler-4",
				"QueueIsFullError-9",
				"QueueIsFullError-10",
				"handler-5",
				"handler-6",
				"handler-7",
				"handler-8",
			]));
			expect(handler).toHaveBeenCalledTimes(8);
		});
	});

	it("should call 3 times immediately & 7 times after some delay (queueing) and some request rejected", () => {
		action.bulkhead.enabled = true;
		action.bulkhead.concurrency = 3;
		action.bulkhead.maxQueueSize = 10;
		broker.metrics.set.mockClear();

		let FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.id);
			if (ctx.params.crash)
				return broker.Promise.reject(new Error("Crashed")).delay(10 * ctx.params.id);
			else
				return broker.Promise.delay(10 * ctx.params.id);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctxs = _.times(10, i => Context.create(broker, endpoint, { id: i + 1, crash: i == 1 || i == 7 }));
		const p = broker.Promise.all(ctxs.map(ctx => newHandler.call(broker, ctx).catch(err => FLOW.push(err.name + "-" + ctx.params.id))));

		expect(FLOW).toEqual(expect.arrayContaining([
			"handler-1",
			"handler-2",
			"handler-3",
		]));
		expect(handler).toHaveBeenCalledTimes(3);
		expect(broker.metrics.set).toHaveBeenCalledTimes(3);

		broker.metrics.set.mockClear();

		FLOW = [];

		return p.delay(500).catch(protectReject).then(() => {
			expect(FLOW).toEqual(expect.arrayContaining([
				"handler-4",
				"Error-2",
				"handler-5",
				"handler-6",
				"handler-7",
				"handler-8",
				"handler-9",
				"Error-8",
				"handler-10",
			]));
			expect(handler).toHaveBeenCalledTimes(10);

			expect(broker.metrics.set).toHaveBeenCalledTimes(10);
		});
	});
});


