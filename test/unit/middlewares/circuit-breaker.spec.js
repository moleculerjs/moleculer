const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const C = require("../../../src/constants");
const Middleware = require("../../../src/middlewares").CircuitBreaker;
const { protectReject } = require("../utils");

describe("Test CircuitBreakerMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		handler
	};
	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		},
		state: C.CIRCUIT_CLOSE,
		success: jest.fn(),
		failure: jest.fn(),
		circuitHalfOpenWait: jest.fn()
	};

	const mw = Middleware();

	it("should register hooks", () => {
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


	it("should call endpoint.success", () => {
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(handler).toHaveBeenCalledTimes(1);

			expect(endpoint.success).toHaveBeenCalledTimes(1);
			expect(endpoint.success).toHaveBeenCalledWith();

			expect(endpoint.failure).toHaveBeenCalledTimes(0);
		});
	});

	it("should call endpoint.failure", () => {
		endpoint.success.mockClear();

		broker.options.circuitBreaker.check = jest.fn(() => true);
		let err = new Error("Some error");
		let handler = jest.fn(() => Promise.reject(err));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.options.circuitBreaker.check).toHaveBeenCalledTimes(1);
			expect(broker.options.circuitBreaker.check).toHaveBeenCalledWith(err);

			expect(endpoint.failure).toHaveBeenCalledTimes(1);
			expect(endpoint.failure).toHaveBeenCalledWith(err);

			expect(endpoint.success).toHaveBeenCalledTimes(0);
		});
	});

	it("should not call endpoint.failure if check returns false", () => {
		endpoint.success.mockClear();
		endpoint.failure.mockClear();

		broker.options.circuitBreaker.check = jest.fn(() => false);
		let err = new Error("Some error");
		let handler = jest.fn(() => Promise.reject(err));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);
		ctx.endpoint.state = C.CIRCUIT_HALF_OPEN;

		return newHandler(ctx).then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.options.circuitBreaker.check).toHaveBeenCalledTimes(1);
			expect(broker.options.circuitBreaker.check).toHaveBeenCalledWith(err);

			expect(endpoint.failure).toHaveBeenCalledTimes(0);
			expect(endpoint.success).toHaveBeenCalledTimes(0);

			expect(ctx.endpoint.circuitHalfOpenWait).toHaveBeenCalledTimes(1);
			expect(ctx.endpoint.circuitHalfOpenWait).toHaveBeenCalledWith();
		});
	});

	it("should not call endpoint.failure if nodeID is different", () => {
		endpoint.success.mockClear();
		endpoint.failure.mockClear();

		broker.options.circuitBreaker.check = jest.fn(() => true);
		let err = new Error("Some error");
		err.nodeID = "server-3";

		let handler = jest.fn(() => Promise.reject(err));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(endpoint.failure).toHaveBeenCalledTimes(0);
			expect(endpoint.success).toHaveBeenCalledTimes(0);
		});
	});
});


