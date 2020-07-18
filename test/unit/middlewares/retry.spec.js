const ServiceBroker 				= require("../../../src/service-broker");
const { MoleculerRetryableError }	= require("../../../src/errors");
const Context 						= require("../../../src/context");
const Middleware 					= require("../../../src/middlewares").Retry;
const { protectReject } 			= require("../utils");

let currID = 1;
const uidGenerator = () => (currID++).toString();

describe("Test RetryMiddleware", () => {

	const broker = new ServiceBroker({ nodeID: "server-1", logger: false, transporter: "Fake", uidGenerator });
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
		node: {
			id: broker.nodeID
		}
	};

	broker.isMetricsEnabled = jest.fn(() => true);
	broker.metrics.register = jest.fn();
	broker.metrics.increment = jest.fn();

	const mw = Middleware(broker);

	it("should register hooks", () => {
		expect(mw.created).toBeInstanceOf(Function);
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

	it("should register metrics", () => {
		mw.created(broker);
		expect(broker.metrics.register).toHaveBeenCalledTimes(1);
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "counter", name: "moleculer.request.retry.attempts.total", labelNames: ["service", "action"], rate: true });
	});

	it("should retry", () => {
		broker.metrics.increment.mockClear();
		broker.options.retryPolicy.enabled = true;
		broker.options.retryPolicy.retries = 3;
		broker.options.retryPolicy.check = jest.fn(() => true);

		let error = new MoleculerRetryableError("Retryable error");
		let handler = jest.fn(() => Promise.reject(error));

		broker.Promise.delay = jest.fn(() => Promise.resolve());

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);
		ctx.setParams({ offset: 10 });
		ctx.span = { setError: jest.fn() };
		ctx.finishSpan = jest.fn();

		broker.call = jest.fn(() => Promise.resolve("Next call"));

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Next call");
			expect(ctx.id).toBe("1");
			expect(ctx._retryAttempts).toBe(1);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledWith("posts.find", { offset: 10 }, { ctx: expect.any(Context) });
			expect(broker.call.mock.calls[0][2].ctx.id).toBe("2");
			expect(broker.call.mock.calls[0][2].ctx._retryAttempts).toBe(1);

			expect(ctx.span.setError).toHaveBeenCalledTimes(1);
			expect(ctx.span.setError).toHaveBeenCalledWith(error);

			expect(ctx.finishSpan).toHaveBeenCalledTimes(1);
			expect(ctx.finishSpan).toHaveBeenCalledWith(ctx.span);

			expect(broker.Promise.delay).toHaveBeenCalledTimes(1);
			expect(broker.Promise.delay).toHaveBeenCalledWith(100);

			expect(broker.options.retryPolicy.check).toHaveBeenCalledTimes(1);
			expect(broker.options.retryPolicy.check).toHaveBeenCalledWith(error);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.retry.attempts.total", { service: "posts", action: "posts.find" });
		});
	});

	it("should retry private action", () => {
		broker.metrics.increment.mockClear();
		broker.options.retryPolicy.enabled = true;
		broker.options.retryPolicy.retries = 3;
		broker.options.retryPolicy.check = jest.fn(() => true);

		let error = new MoleculerRetryableError("Retryable error");
		let handler = jest.fn(() => Promise.reject(error));

		broker.Promise.delay = jest.fn(() => Promise.resolve());

		let action = {
			name: "posts.list",
			rawName: "list",
			visibility: "private",
			service: {
				fullName: "posts",
				actions: {
					list: jest.fn(() => Promise.resolve("Next direct call"))
				}
			}
		};

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, {
			action,
			node: {
				id: broker.nodeID
			}
		});
		ctx.setParams({ limit: 5 });

		broker.call = jest.fn();

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Next direct call");
			expect(ctx._retryAttempts).toBe(1);
			expect(ctx.id).toBe("3");

			expect(handler).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(action.service.actions.list).toHaveBeenCalledTimes(1);
			expect(action.service.actions.list).toHaveBeenCalledWith({ limit: 5 }, { ctx: { ...ctx, id: "4" } });

			expect(broker.Promise.delay).toHaveBeenCalledTimes(1);
			expect(broker.Promise.delay).toHaveBeenCalledWith(100);

			expect(broker.options.retryPolicy.check).toHaveBeenCalledTimes(1);
			expect(broker.options.retryPolicy.check).toHaveBeenCalledWith(error);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.retry.attempts.total", { service: "posts", action: "posts.list" });
		});
	});

	it("should not retry if attempts reach the limit", () => {
		broker.metrics.increment.mockClear();
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

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.retry.attempts.total", { service: "posts", action: "posts.find" });
		});
	});

	it("should not retry if check returns false", () => {
		broker.metrics.increment.mockClear();
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

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);
		});
	});

	it("should not retry if the call is a remote received call from other node", () => {
		broker.metrics.increment.mockClear();
		broker.options.retryPolicy.enabled = true;
		broker.options.retryPolicy.retries = 3;
		broker.options.retryPolicy.check = jest.fn(() => true);

		let error = new MoleculerRetryableError("Retryable error");
		let handler = jest.fn(() => Promise.reject(error));

		broker.Promise.delay = jest.fn(() => Promise.resolve());

		const newHandler = mw.localAction.call(broker, handler, action);
		endpoint.local = true;
		const ctx = Context.create(broker, endpoint);
		ctx.nodeID = "server-2";
		ctx.setParams({ offset: 10 });

		broker.call = jest.fn(() => Promise.resolve("Next call"));

		return newHandler(ctx).then(protectReject).catch(err => {
			expect(err).toBe(error);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(broker.Promise.delay).toHaveBeenCalledTimes(0);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);
		});
	});


});
