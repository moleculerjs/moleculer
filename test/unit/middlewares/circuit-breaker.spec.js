const ServiceBroker 		= require("../../../src/service-broker");
const Context 				= require("../../../src/context");
const { MoleculerError } 	= require("../../../src/errors");
const Middleware 			= require("../../../src/middlewares").CircuitBreaker;
const lolex 				= require("lolex");
const { protectReject } 	= require("../utils");

describe("Test CircuitBreakerMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		handler
	};

	const mw = Middleware(broker);

	it("should register hooks", () => {
		expect(mw.created).toBeInstanceOf(Function);
		expect(mw.localAction).toBeInstanceOf(Function);
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

	// TODO more tests

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
		internalMiddlewares: false
	});
	const handler = jest.fn(ctx => ctx.params.crash ? Promise.reject(new MoleculerError("Crashed")) : Promise.resolve("Result"));
	const action = {
		name: "likes.count",
		handler
	};
	const node = { id: broker.nodeID };
	const endpoint = { name: "server-1:likes.count", action, node, id: node.id, state: true };
	broker.broadcast = jest.fn();

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
			expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.opened", { action: "likes.count", count: 5, failures: 3, nodeID: broker.nodeID, rate: 0.6 });
			expect(endpoint.state).toBe(false);
		});
	});

	it("should half-open", () => {
		broker.broadcast.mockClear();
		clock.tick(12 * 1000);
		expect(endpoint.state).toBe(true);
		expect(broker.broadcast).toHaveBeenCalledTimes(1);
		expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.half-opened", { action: "likes.count", nodeID: broker.nodeID });
	});

	it("should reopen CB", () => {
		broker.broadcast.mockClear();
		return Promise.all([
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
		]).catch(protectReject).then(() => {
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.opened", { action: "likes.count", count: 6, failures: 4, nodeID: broker.nodeID, rate: 0.6666666666666666 });
			expect(endpoint.state).toBe(false);
		});
	});

	it("should half-open again", () => {
		broker.broadcast.mockClear();
		clock.tick(11 * 1000);
		expect(endpoint.state).toBe(true);
		expect(broker.broadcast).toHaveBeenCalledTimes(1);
		expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.half-opened", { action: "likes.count", nodeID: broker.nodeID });
	});

	it("should close CB", () => {
		broker.broadcast.mockClear();
		return Promise.all([
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
			newHandler(Context.create(broker, endpoint, { crash: false })).catch(protectReject).then(res => expect(res).toBe("Result")),
		]).catch(protectReject).then(() => {
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("$circuit-breaker.closed", { action: "likes.count", nodeID: broker.nodeID });
			expect(endpoint.state).toBe(true);
		});
	});

	it("should reset stat after windowTime", () => {
		clock.tick(62 * 1000);
		expect(endpoint.state).toBe(true);
		broker.broadcast.mockClear();
		return Promise.all([
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
			newHandler(Context.create(broker, endpoint, { crash: true })).then(protectReject).catch(err => expect(err.message).toBe("Crashed")),
		]).catch(protectReject).then(() => {
			expect(endpoint.state).toBe(true);
			expect(broker.broadcast).toHaveBeenCalledTimes(0);
		});
	});

	it("should reset stat after windowTime", () => {
		clock.tick(62 * 1000);
		expect(endpoint.state).toBe(true);
		broker.broadcast.mockClear();
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
		});
	});


});


