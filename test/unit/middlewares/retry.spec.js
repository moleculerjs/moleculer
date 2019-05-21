const ServiceBroker 				= require("../../../src/service-broker");
const { MoleculerRetryableError }	= require("../../../src/errors");
const Context 						= require("../../../src/context");
const Middleware 					= require("../../../src/middlewares").Retry;
const { protectReject } 			= require("../utils");

describe("Test RetryMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false, transporter: "Fake" });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		name: "posts.find",
		handler
	};
	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		}
	};

	const mw = Middleware(broker);
	mw.created(broker);

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
		expect(mw.remoteAction).toBeInstanceOf(Function);
	});

	it("should not wrap handler if retryPolicy is disabled", () => {
		broker.options.retryPolicy.enabled = false;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).toBe(handler);

		const newHandler2 = mw.remoteAction.call(broker, handler, action);
		expect(newHandler2).toBe(handler);
	});

	it("should wrap handler if retryPolicy is enabled", () => {
		broker.options.retryPolicy.enabled = true;
		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);

		const newHandler2 = mw.remoteAction.call(broker, handler, action);
		expect(newHandler2).not.toBe(handler);
	});

	it("should retry", () => {
		broker.options.retryPolicy.enabled = true;
		broker.options.retryPolicy.retries = 3;
		broker.options.retryPolicy.check = jest.fn(() => true);

		let error = new MoleculerRetryableError("Retryable error");
		let handler = jest.fn(() => Promise.reject(error));

		broker.Promise.delay = jest.fn(() => Promise.resolve());

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);

		broker.call = jest.fn(() => Promise.resolve("Next call"));

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Next call");
			expect(ctx._retryAttempts).toBe(1);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledWith("posts.find", {}, { ctx });

			expect(broker.Promise.delay).toHaveBeenCalledTimes(1);
			expect(broker.Promise.delay).toHaveBeenCalledWith(100);

			expect(broker.options.retryPolicy.check).toHaveBeenCalledTimes(1);
			expect(broker.options.retryPolicy.check).toHaveBeenCalledWith(error);
		});
	});

	it("should not retry if attempts reach the limit", () => {
		broker.options.retryPolicy.enabled = true;
		broker.options.retryPolicy.retries = 3;
		broker.options.retryPolicy.check = jest.fn(() => true);

		let error = new MoleculerRetryableError("Retryable error");
		let handler = jest.fn(() => Promise.reject(error));

		broker.Promise.delay = jest.fn(() => Promise.resolve());

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);
		ctx._retryAttempts = 3;

		broker.call = jest.fn(() => Promise.resolve("Next call"));

		return newHandler(ctx).then(protectReject).catch(err => {
			expect(err).toBe(error);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(broker.Promise.delay).toHaveBeenCalledTimes(0);
		});
	});

	it("should not retry if check returns false", () => {
		broker.options.retryPolicy.check = jest.fn(() => false);

		let error = new MoleculerRetryableError("Retryable error");
		let handler = jest.fn(() => Promise.reject(error));

		broker.Promise.delay = jest.fn(() => Promise.resolve());

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);

		broker.call = jest.fn(() => Promise.resolve("Next call"));

		return newHandler(ctx).then(protectReject).catch(err => {
			expect(err).toBe(error);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(broker.Promise.delay).toHaveBeenCalledTimes(0);
		});
	});


});
