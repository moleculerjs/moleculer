const ServiceBroker 		= require("../../../src/service-broker");
const Context 				= require("../../../src/context");
const { MoleculerError } 	= require("../../../src/errors");
const Middleware 			= require("../../../src/middlewares").CircuitBreaker;
const lolex 				= require("@sinonjs/fake-timers");
const { protectReject } 	= require("../utils");

describe("Test CircuitBreakerMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		service: {
			fullName: "v2.likes"
		},
		handler
	};

	const mw = Middleware(broker);

	afterAll(() => {
		mw.stopped.call(broker);
	});

	it("should register hooks", () => {
		expect(mw.created).toBeInstanceOf(Function);
		expect(mw.localAction).toBeInstanceOf(Function);
		expect(mw.remoteAction).toBeInstanceOf(Function);
		expect(mw.stopped).toBeInstanceOf(Function);
	});

	it("should not wrap handler if circuitBreaker is disabled", () => {
		broker.options.circuitBreaker.enabled = false;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).toBe(handler);

		const newHandler2 = mw.remoteAction.call(broker, handler, action);
		expect(newHandler2).toBe(handler);
	});

	it("should wrap handler if circuitBreaker is enabled", () => {
		broker.options.circuitBreaker.enabled = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);

		const newHandler2 = mw.remoteAction.call(broker, handler, action);
		expect(newHandler2).not.toBe(handler);
	});

	it("should register metrics", () => {
		broker.isMetricsEnabled = jest.fn(() => true);
		broker.metrics.register = jest.fn();

		mw.created.call(broker, broker);

		expect(broker.metrics.register).toHaveBeenCalledTimes(3);
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "gauge", name: "moleculer.circuit-breaker.opened.active", labelNames: ["affectedNodeID", "service", "action"], description: expect.any(String) });
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "counter", name: "moleculer.circuit-breaker.opened.total", labelNames: ["affectedNodeID", "service", "action"], description: expect.any(String) });
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "gauge", name: "moleculer.circuit-breaker.half-opened.active", labelNames: ["affectedNodeID", "service", "action"], description: expect.any(String) });
	});

});


describe("Test CircuitBreakerMiddleware logic", () => {
	const broker = new ServiceBroker({
		nodeID: "server-1",
		logger: false,
		circuitBreaker: {
			enabled: true,
			threshold: 0.5,
			minRequestCount: 5,
			windowTime: 60,
		},
		internalMiddlewares: false,
		metrics: true
	});
	const handler = jest.fn(ctx => ctx.params.crash ? Promise.reject(new MoleculerError("Crashed")) : Promise.resolve("Result"));
	const action = {
		service: {
			fullName: "v2.likes"
		},
		name: "likes.count",
		handler
	};
	const node = { id: broker.nodeID };
	const endpoint = { name: "server-1:likes.count", action, node, id: node.id, state: true };
	broker.broadcast = jest.fn();
	jest.spyOn(broker.metrics, "increment");
	jest.spyOn(broker.metrics, "decrement");
	jest.spyOn(broker.metrics, "set");

	let clock, newHandler;
	const mw = Middleware(broker);
	beforeAll(() => {
		clock = lolex.install();
		mw.created(broker);
		newHandler = mw.localAction.call(broker, handler, action);
	});
	afterAll(() => {
		clock.uninstall();
		mw.stopped();
	});

	it("should not open CB", () => {
		return Promise.all([
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
		]).catch(protectReject).then(() => {
			expect(broker.broadcast).toHaveBeenCalledTimes(0);
			expect(endpoint.state).toBe(true);
		});
	});

	it("should open CB", () => {
		return Promise.all([
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
		]).catch(protectReject).then(() => {
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.opened", { service: "v2.likes", action: "likes.count", count: 5, failures: 3, nodeID: broker.nodeID, rate: 0.6 });
			expect(endpoint.state).toBe(false);

			expect(broker.metrics.set).toHaveBeenCalledTimes(1);
			expect(broker.metrics.set).toHaveBeenCalledWith("moleculer.circuit-breaker.opened.active", 1, { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.circuit-breaker.opened.total", { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });
		});
	});

	it("should half-open", () => {
		broker.broadcast.mockClear();
		broker.metrics.set.mockClear();

		clock.tick(12 * 1000);
		expect(endpoint.state).toBe(true);
		expect(broker.broadcast).toHaveBeenCalledTimes(1);
		expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.half-opened", { service: "v2.likes", action: "likes.count", nodeID: broker.nodeID });

		expect(broker.metrics.set).toHaveBeenCalledTimes(2);
		expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.circuit-breaker.opened.active", 0, { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });
		expect(broker.metrics.set).toHaveBeenNthCalledWith(2, "moleculer.circuit-breaker.half-opened.active", 1, { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });
	});

	it("should reopen CB", () => {
		broker.metrics.set.mockClear();
		broker.metrics.increment.mockClear();
		broker.broadcast.mockClear();

		return Promise.all([
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
		]).catch(protectReject).then(() => {
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.opened", { service: "v2.likes", action: "likes.count", count: 6, failures: 4, nodeID: broker.nodeID, rate: 0.6666666666666666 });
			expect(endpoint.state).toBe(false);

			expect(broker.metrics.set).toHaveBeenCalledTimes(1);
			expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.circuit-breaker.opened.active", 1, { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.circuit-breaker.opened.total", { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });

		});
	});

	it("should half-open again", () => {
		broker.broadcast.mockClear();
		broker.metrics.set.mockClear();

		clock.tick(11 * 1000);
		expect(endpoint.state).toBe(true);
		expect(broker.broadcast).toHaveBeenCalledTimes(1);
		expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.half-opened", { service: "v2.likes", action: "likes.count", nodeID: broker.nodeID });

		expect(broker.metrics.set).toHaveBeenCalledTimes(2);
		expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.circuit-breaker.opened.active", 0, { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });
		expect(broker.metrics.set).toHaveBeenNthCalledWith(2, "moleculer.circuit-breaker.half-opened.active", 1, { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });

	});

	it("should close CB", () => {
		broker.broadcast.mockClear();
		broker.metrics.set.mockClear();

		return Promise.all([
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
		]).catch(protectReject).then(() => {
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.closed", { service: "v2.likes", action: "likes.count", nodeID: broker.nodeID });
			expect(endpoint.state).toBe(true);

			expect(broker.metrics.set).toHaveBeenCalledTimes(2);
			expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.circuit-breaker.opened.active", 0, { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(2, "moleculer.circuit-breaker.half-opened.active", 0, { affectedNodeID: "server-1", service: "v2.likes", action: "likes.count" });
		});
	});

	it("should reset stat after windowTime", () => {
		clock.tick(62 * 1000);
		expect(endpoint.state).toBe(true);
		broker.broadcast.mockClear();
		broker.metrics.set.mockClear();
		broker.metrics.increment.mockClear();

		return Promise.all([
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
		]).catch(protectReject).then(() => {
			expect(endpoint.state).toBe(true);
			expect(broker.broadcast).toHaveBeenCalledTimes(0);
			expect(broker.metrics.set).toHaveBeenCalledTimes(0);
			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);
		});
	});

	it("should reset stat after windowTime", () => {
		clock.tick(62 * 1000);
		expect(endpoint.state).toBe(true);
		broker.broadcast.mockClear();
		broker.metrics.set.mockClear();
		broker.metrics.increment.mockClear();

		return Promise.all([
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
		]).catch(protectReject).then(() => {
			expect(endpoint.state).toBe(true);
			expect(broker.broadcast).toHaveBeenCalledTimes(0);
			expect(broker.metrics.set).toHaveBeenCalledTimes(0);
			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);
		});
	});


});


