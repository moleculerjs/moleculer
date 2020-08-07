const _ = require("lodash");
const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").Bulkhead;
const { protectReject } = require("../utils");

describe("Test BulkheadMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = { fullName: "posts" };
	const action = {
		name: "posts.find",
		bulkhead: {
			enabled: false
		},
		handler,
		service
	};
	const event = {
		name: "user.created",
		bulkhead: {
			enabled: false
		},
		handler,
		service
	};
	const endpoint = {
		action,
		event,
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
		expect(mw.localEvent).toBeInstanceOf(Function);
	});

	it("should not wrap handler if bulkhead is disabled", () => {
		broker.options.bulkhead.enabled = false;

		const newActionHandler = mw.localAction.call(broker, handler, action);
		expect(newActionHandler).toBe(handler);

		const newEventHandler = mw.localEvent.call(broker, handler, action);
		expect(newEventHandler).toBe(handler);
	});

	it("should register metrics", () => {
		broker.isMetricsEnabled = jest.fn(() => true);
		broker.metrics.register = jest.fn();

		mw.created.call(broker, broker);

		expect(broker.metrics.register).toHaveBeenCalledTimes(4);
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "gauge", name: "moleculer.request.bulkhead.inflight", labelNames: ["action", "service"] });
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "gauge", name: "moleculer.request.bulkhead.queue.size", labelNames: ["action", "service"] });
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "gauge", name: "moleculer.event.bulkhead.inflight", labelNames: ["event", "service"] });
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "gauge", name: "moleculer.event.bulkhead.queue.size", labelNames: ["event", "service"] });
	});

	describe("Test localAction", () => {

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

			expect(broker.metrics.set).toHaveBeenCalledTimes(13);
			expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.request.bulkhead.inflight", 1, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(2, "moleculer.request.bulkhead.queue.size", 0, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(3, "moleculer.request.bulkhead.inflight", 2, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(4, "moleculer.request.bulkhead.queue.size", 0, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(5, "moleculer.request.bulkhead.inflight", 3, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(6, "moleculer.request.bulkhead.queue.size", 0, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(7, "moleculer.request.bulkhead.queue.size", 1, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(8, "moleculer.request.bulkhead.queue.size", 2, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(9, "moleculer.request.bulkhead.queue.size", 3, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(10, "moleculer.request.bulkhead.queue.size", 4, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(11, "moleculer.request.bulkhead.queue.size", 5, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(12, "moleculer.request.bulkhead.queue.size", 6, { action: "posts.find", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(13, "moleculer.request.bulkhead.queue.size", 7, { action: "posts.find", service: "posts" });
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

				expect(broker.metrics.set).toHaveBeenCalledTimes(34);
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
			expect(broker.metrics.set).toHaveBeenCalledTimes(13);

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

				expect(broker.metrics.set).toHaveBeenCalledTimes(34);
			});
		});

	});

	describe("Test localEvent", () => {

		it("should wrap handler if bulkhead is disabled but in event is enabled", () => {
			broker.options.bulkhead.enabled = false;
			event.bulkhead.enabled = true;

			const newHandler = mw.localEvent.call(broker, handler, event);
			expect(newHandler).not.toBe(handler);
		});

		it("should wrap handler if bulkhead is enabled", () => {
			broker.options.bulkhead.enabled = true;

			const newHandler = mw.localEvent.call(broker, handler, event);
			expect(newHandler).not.toBe(handler);
		});

		it("should not wrap handler if bulkhead is enabled but in event is disabled", () => {
			broker.options.bulkhead.enabled = true;
			event.bulkhead.enabled = false;

			const newHandler = mw.localEvent.call(broker, handler, event);
			expect(newHandler).toBe(handler);
		});

		it("should call 3 times immediately & 7 times after some delay (queueing)", () => {
			event.bulkhead.enabled = true;
			event.bulkhead.concurrency = 3;
			event.bulkhead.maxQueueSize = 10;

			broker.metrics.set.mockClear();

			let FLOW = [];

			const handler = jest.fn(ctx => {
				FLOW.push("handler-" + ctx.params.id);
				return broker.Promise.delay(10 * ctx.params.id);
			});

			const newHandler = mw.localEvent.call(broker, handler, event);

			const ctxs = _.times(10, i => Context.create(broker, endpoint, { id: i + 1 }));
			Promise.all(ctxs.map(ctx => newHandler.call(broker, ctx)));

			expect(FLOW).toEqual(expect.arrayContaining([
				"handler-1",
				"handler-2",
				"handler-3",
			]));
			expect(handler).toHaveBeenCalledTimes(3);

			expect(broker.metrics.set).toHaveBeenCalledTimes(13);
			expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.event.bulkhead.inflight", 1, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(2, "moleculer.event.bulkhead.queue.size", 0, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(3, "moleculer.event.bulkhead.inflight", 2, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(4, "moleculer.event.bulkhead.queue.size", 0, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(5, "moleculer.event.bulkhead.inflight", 3, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(6, "moleculer.event.bulkhead.queue.size", 0, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(7, "moleculer.event.bulkhead.queue.size", 1, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(8, "moleculer.event.bulkhead.queue.size", 2, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(9, "moleculer.event.bulkhead.queue.size", 3, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(10, "moleculer.event.bulkhead.queue.size", 4, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(11, "moleculer.event.bulkhead.queue.size", 5, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(12, "moleculer.event.bulkhead.queue.size", 6, { event: "user.created", service: "posts" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(13, "moleculer.event.bulkhead.queue.size", 7, { event: "user.created", service: "posts" });
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

				expect(broker.metrics.set).toHaveBeenCalledTimes(34);
			});
		});

		it("should call 3 times immediately & 5 times after some delay (queueing) and throw error because 2 are out of queue size", () => {
			event.bulkhead.enabled = true;
			event.bulkhead.concurrency = 3;
			event.bulkhead.maxQueueSize = 5;

			let FLOW = [];

			const handler = jest.fn(ctx => {
				FLOW.push("handler-" + ctx.params.id);
				return broker.Promise.delay(10 * ctx.params.id);
			});

			const newHandler = mw.localEvent.call(broker, handler, event);

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
			event.bulkhead.enabled = true;
			event.bulkhead.concurrency = 3;
			event.bulkhead.maxQueueSize = 10;
			broker.metrics.set.mockClear();

			let FLOW = [];

			const handler = jest.fn(ctx => {
				FLOW.push("handler-" + ctx.params.id);
				if (ctx.params.crash)
					return broker.Promise.reject(new Error("Crashed")).delay(10 * ctx.params.id);
				else
					return broker.Promise.delay(10 * ctx.params.id);
			});

			const newHandler = mw.localEvent.call(broker, handler, event);

			const ctxs = _.times(10, i => Context.create(broker, endpoint, { id: i + 1, crash: i == 1 || i == 7 }));
			const p = broker.Promise.all(ctxs.map(ctx => newHandler.call(broker, ctx).catch(err => FLOW.push(err.name + "-" + ctx.params.id))));

			expect(FLOW).toEqual(expect.arrayContaining([
				"handler-1",
				"handler-2",
				"handler-3",
			]));
			expect(handler).toHaveBeenCalledTimes(3);
			expect(broker.metrics.set).toHaveBeenCalledTimes(13);

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

				expect(broker.metrics.set).toHaveBeenCalledTimes(34);
			});
		});

	});

});


