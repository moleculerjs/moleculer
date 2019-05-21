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

	const mw = Middleware(broker);
	mw.created(broker);

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
		expect(mw.remoteAction).toBeInstanceOf(Function);
	});

	it("should wrap handler", () => {
		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});

	it("should call fallback Function and return", () => {
		action.fallback = jest.fn(() => "Fallback response");
		let error = new MoleculerError("Some error");
		let handler = jest.fn(() => Promise.reject(error));

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Fallback response");

			expect(action.fallback).toHaveBeenCalledTimes(1);
			expect(action.fallback).toHaveBeenCalledWith(ctx, error);
		});
	});


	it("should call fallback Function and return", () => {
		action.fallback = "someFallbackMethod";
		let error = new MoleculerError("Some error");
		let handler = jest.fn(() => Promise.reject(error));

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Fallback response from method");

			expect(action.service.someFallbackMethod).toHaveBeenCalledTimes(1);
			expect(action.service.someFallbackMethod).toHaveBeenCalledWith(ctx, error);
		});
	});

	it("should return fallbackResponse (native type)", () => {
		action.fallback = null;
		let error = new MoleculerError("Some error");
		let handler = jest.fn(() => Promise.reject(error));

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint, null, {
			fallbackResponse: "fallback response"
		});

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("fallback response");
		});
	});

	it("should return fallbackResponse (function)", () => {
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
		});
	});
});
