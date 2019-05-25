const ServiceBroker 			= require("../../../src/service-broker");
const { MoleculerError }		= require("../../../src/errors");
const Context 					= require("../../../src/context");
const Middleware 				= require("../../../src/middlewares").Fallback;
const { protectReject } 		= require("../utils");

describe("Test FallbackMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false, transporter: "Fake" });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		name: "posts.find",
		handler,
		service: {
			logger: broker.getLogger(),
			someFallbackMethod: jest.fn(() => "Fallback response from method")
		}
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

	it("should wrap handler", () => {
		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});

	it("should register metrics", () => {
		mw.created(broker);
		expect(broker.metrics.register).toHaveBeenCalledTimes(1);
		expect(broker.metrics.register).toHaveBeenCalledWith({ type: "counter", name: "moleculer.request.fallback.total", labelNames: ["action"] });
	});

	it("should call fallback Function and return", () => {
		broker.metrics.increment.mockClear();
		action.fallback = jest.fn(() => "Fallback response");
		let error = new MoleculerError("Some error");
		let handler = jest.fn(() => Promise.reject(error));

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Fallback response");

			expect(action.fallback).toHaveBeenCalledTimes(1);
			expect(action.fallback).toHaveBeenCalledWith(ctx, error);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.fallback.total", { action: "posts.find" });
		});
	});


	it("should call fallback Function and return", () => {
		broker.metrics.increment.mockClear();
		action.fallback = "someFallbackMethod";
		let error = new MoleculerError("Some error");
		let handler = jest.fn(() => Promise.reject(error));

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Fallback response from method");

			expect(action.service.someFallbackMethod).toHaveBeenCalledTimes(1);
			expect(action.service.someFallbackMethod).toHaveBeenCalledWith(ctx, error);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.fallback.total", { action: "posts.find" });
		});
	});

	it("should return fallbackResponse (native type)", () => {
		broker.metrics.increment.mockClear();
		action.fallback = null;
		let error = new MoleculerError("Some error");
		let handler = jest.fn(() => Promise.reject(error));

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint, null, {
			fallbackResponse: "fallback response"
		});

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("fallback response");

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.fallback.total", { action: "posts.find" });
		});
	});

	it("should return fallbackResponse (function)", () => {
		broker.metrics.increment.mockClear();
		let error = new MoleculerError("Some error");
		let handler = jest.fn(() => Promise.reject(error));
		let fallbackResponse = jest.fn(() => "fallback response");

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint, null, { fallbackResponse });
		expect(ctx.options.fallbackResponse).toBe(fallbackResponse);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("fallback response");
			expect(fallbackResponse).toHaveBeenCalledTimes(1);
			expect(fallbackResponse).toHaveBeenCalledWith(ctx, error);


			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenCalledWith("moleculer.request.fallback.total", { action: "posts.find" });
		});
	});
});
