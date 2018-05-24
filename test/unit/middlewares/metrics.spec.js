const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").Metrics;
const { protectReject } = require("../utils");

describe("Test MetricsMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		handler
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

	it("should not wrap handler if metrics is disabled", () => {
		broker.options.metrics = false;

		const newHandler = mw.localAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);
	});

	it("should wrap handler if metrics is enabled", () => {
		broker.options.metrics = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});


	it("should call metricStart only if has timeout", () => {
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, null, { timeout: 5000 });
		ctx._metricStart = jest.fn();
		ctx._metricFinish = jest.fn();
		ctx.metrics = false;

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx._metricStart).toHaveBeenCalledTimes(1);
			expect(ctx._metricStart).toHaveBeenCalledWith(false);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(0);
		});
	});

	it("should call metricStart & metricFinish if handler is resolved", () => {
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);
		ctx._metricStart = jest.fn();
		ctx._metricFinish = jest.fn();

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx._metricStart).toHaveBeenCalledTimes(1);
			expect(ctx._metricStart).toHaveBeenCalledWith(true);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(null, true);
		});
	});

	it("should call metricStart & metricFinish if handler is rejected", () => {
		let err = new Error("Some error");
		let handler = jest.fn(() => Promise.reject(err));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);
		ctx._metricStart = jest.fn();
		ctx._metricFinish = jest.fn();

		return newHandler(ctx).then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(ctx._metricStart).toHaveBeenCalledTimes(1);
			expect(ctx._metricStart).toHaveBeenCalledWith(true);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(res, true);
		});
	});
});


