const _ = require("lodash");
const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").MaxInFlight;
const { protectReject } = require("../utils");

describe("Test MaxInFlightMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {};
	const action = {
		name: "posts.find",
		maxInFlight: {
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

	const mw = Middleware();

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
	});

	it("should not wrap handler if maxInFlight is disabled", () => {
		broker.options.maxInFlight.enabled = false;

		const newHandler = mw.localAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);
	});

	it("should wrap handler if maxInFlight is disabled but in action is enabled", () => {
		broker.options.maxInFlight.enabled = false;
		action.maxInFlight.enabled = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});

	it("should wrap handler if maxInFlight is enabled", () => {
		broker.options.maxInFlight.enabled = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});

	it("should not wrap handler if maxInFlight is enabled but in action is disabled", () => {
		broker.options.maxInFlight.enabled = true;
		action.maxInFlight.enabled = false;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).toBe(handler);
	});


	it("should call 3 times immediately & 7 times after some delay (queueing)", () => {
		action.maxInFlight.enabled = true;
		action.maxInFlight.limit = 3;
		action.maxInFlight.maxQueueSize = 10;

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
		});
	});

	it("should call 3 times immediately & 5 times after some delay (queueing) and throw error because 2 are out of queue size", () => {
		action.maxInFlight.enabled = true;
		action.maxInFlight.limit = 3;
		action.maxInFlight.maxQueueSize = 5;

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
		action.maxInFlight.enabled = true;
		action.maxInFlight.limit = 3;
		action.maxInFlight.maxQueueSize = 10;

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
		});
	});
});


