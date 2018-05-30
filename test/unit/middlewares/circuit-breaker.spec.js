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


