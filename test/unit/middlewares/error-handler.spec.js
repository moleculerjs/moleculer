const ServiceBroker 			= require("../../../src/service-broker");
const { MoleculerError }		= require("../../../src/errors");
const Context 					= require("../../../src/context");
const Middleware 				= require("../../../src/middlewares").ErrorHandler;
const { protectReject } 		= require("../utils");

describe("Test ErrorHandlerMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false, transporter: "Fake" });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		name: "posts.find",
		handler,
		service: {
			name: "posts"
		}
	};
	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		}
	};

	broker.errorHandler = jest.fn(err => Promise.reject(err));

	const mw = Middleware(broker);

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
		expect(mw.remoteAction).toBeInstanceOf(Function);
	});

	it("should wrap handler", () => {
		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);

		const newHandler2 = mw.remoteAction.call(broker, handler, action);
		expect(newHandler2).not.toBe(handler);
	});

	it("should call broker errorHandler", () => {
		broker.errorHandler.mockClear();
		const error = new MoleculerError("Something wrong");
		let handler = jest.fn(() => Promise.reject(error));

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).then(protectReject).catch(err => {
			expect(err).toBeInstanceOf(MoleculerError);
			expect(err.name).toBe("MoleculerError");
			expect(err.message).toBe("Something wrong");
			expect(err.ctx).toBe(ctx);

			expect(broker.errorHandler).toBeCalledTimes(1);
			expect(broker.errorHandler).toBeCalledWith(err, { ctx, service: action.service, action });
		});
	});

	it("should convert if not Error", () => {
		broker.errorHandler.mockClear();
		let handler = jest.fn(() => Promise.reject("Something wrong"));

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).then(protectReject).catch(err => {
			expect(err).toBeInstanceOf(Error);
			expect(err).toBeInstanceOf(MoleculerError);
			expect(err.name).toBe("MoleculerError");
			expect(err.message).toBe("Something wrong");
			expect(err.ctx).toBe(ctx);

			expect(broker.errorHandler).toBeCalledTimes(1);
			expect(broker.errorHandler).toBeCalledWith(err, { ctx, service: action.service, action });
		});
	});

	it("should remove pending request if remote call", () => {
		let error = new MoleculerError("Some error");
		let handler = jest.fn(() => Promise.reject(error));
		broker.transit.removePendingRequest = jest.fn();

		const newHandler = mw.localAction.call(broker, handler, action);
		const ctx = Context.create(broker, endpoint);
		ctx.id = "123456";
		ctx.nodeID = "server-2";

		return newHandler(ctx).then(protectReject).catch(err => {
			expect(err).toBe(error);
			expect(err.ctx).toBe(ctx);

			expect(broker.transit.removePendingRequest).toHaveBeenCalledTimes(1);
			expect(broker.transit.removePendingRequest).toHaveBeenCalledWith("123456");
		});
	});

});
