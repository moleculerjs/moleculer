const ServiceBroker 			= require("../../../src/service-broker");
const { RequestTimeoutError }	= require("../../../src/errors");
const Context 					= require("../../../src/context");
const Middleware 				= require("../../../src/middlewares").Timeout;
const { protectReject } 		= require("../utils");
const lolex 					= require("lolex");

describe("Test TimeoutMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		name: "posts.find",
		service: {
			fullName: "posts"
		},
		handler
	};
	const endpoint = {
		action,
		id: broker.nodeID
	};

	broker.isMetricsEnabled = jest.fn(() => true);
	broker.metrics.register = jest.fn();
	broker.metrics.increment = jest.fn();

	const mw = Middleware(broker);

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
		expect(mw.remoteAction).toBeInstanceOf(Function);
	});

	it("should wrap handler", () => {
		broker.options.metrics = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});

	it("should register metrics", () => {
		mw.created(broker);
		expect(broker.metrics.register).toHaveBeenCalledTimes(1);
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "counter", name: "moleculer.request.timeout.total", labelNames: ["service", "action"], rate: true });
	});

	it("should not be timeout if requestTimeout is 0", () => {
		broker.metrics.increment.mockClear();
		broker.options.requestTimeout = 0;
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx.options.timeout).toBe(0);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);
		});
	});

	it("should handle timeout from global setting", () => {
		const clock = lolex.install();

		broker.metrics.increment.mockClear();
		broker.options.requestTimeout = 5000;

		let handler = jest.fn(() => broker.Promise.delay(10 * 1000));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		const p = newHandler(ctx);

		clock.tick(5500);

		return p.then(protectReject).catch(err => {
			expect(ctx.startHrTime).toBeDefined();
			expect(ctx.options.timeout).toBe(5000);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.timeout.total", { service: "posts", action: "posts.find" });

			expect(err).toBeInstanceOf(Error);
			expect(err).toBeInstanceOf(RequestTimeoutError);
			expect(err.message).toBe("Request is timed out when call 'posts.find' action on 'server-1' node.");
			expect(err.data).toEqual({ action: "posts.find", nodeID: "server-1" });

			clock.uninstall();
		});
	});

	it("should handle timeout from action setting", () => {
		const clock = lolex.install();

		broker.metrics.increment.mockClear();
		broker.options.requestTimeout = 5000;
		action.timeout = 4000;

		let handler = jest.fn(() => broker.Promise.delay(10 * 1000));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		const p = newHandler(ctx);

		clock.tick(5500);

		return p.then(protectReject).catch(err => {
			expect(ctx.startHrTime).toBeDefined();
			expect(ctx.options.timeout).toBe(4000);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.timeout.total", { service: "posts", action: "posts.find" });

			expect(err).toBeInstanceOf(Error);
			expect(err).toBeInstanceOf(RequestTimeoutError);
			expect(err.message).toBe("Request is timed out when call 'posts.find' action on 'server-1' node.");
			expect(err.data).toEqual({ action: "posts.find", nodeID: "server-1" });

			clock.uninstall();
		});
	});

	it("should handle timeout from Context setting", () => {
		const clock = lolex.install();

		broker.metrics.increment.mockClear();
		broker.options.requestTimeout = 5000;
		action.timeout = 4000;

		let handler = jest.fn(() => broker.Promise.delay(10 * 1000));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);
		ctx.options.timeout = 2000;

		const p = newHandler(ctx);

		clock.tick(5500);

		return p.then(protectReject).catch(err => {
			expect(ctx.startHrTime).toBeDefined();
			expect(ctx.options.timeout).toBe(2000);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.timeout.total", { service: "posts", action: "posts.find" });

			expect(err).toBeInstanceOf(Error);
			expect(err).toBeInstanceOf(RequestTimeoutError);
			expect(err.message).toBe("Request is timed out when call 'posts.find' action on 'server-1' node.");
			expect(err.data).toEqual({ action: "posts.find", nodeID: "server-1" });

			clock.uninstall();
		});
	});

	it("should don't touch other errors", () => {
		broker.metrics.increment.mockClear();
		let err = new Error("Some error");
		let handler = jest.fn(() => Promise.reject(err));

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).then(protectReject).catch(res => {
			expect(ctx.options.timeout).toBe(4000);
			expect(res).toBe(err);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);
		});
	});
});
