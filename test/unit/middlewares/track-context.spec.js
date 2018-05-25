const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").TrackContext;
const { protectReject } = require("../utils");

describe("Test TrackContextMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {
		_addActiveContext: jest.fn(),
		_removeActiveContext: jest.fn()
	};
	const action = {
		handler,
		service
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

	it("should not wrap handler if trackContext is disabled", () => {
		broker.options.trackContext = false;

		const newHandler = mw.localAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);
	});

	it("should wrap handler if trackContext is enabled", () => {
		broker.options.trackContext = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});


	it("should not call _trackContext & dispose if trackContext if false", () => {
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, null, { trackContext: false });

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx.tracked).toBeUndefined();
			expect(handler).toHaveBeenCalledTimes(1);

			expect(service._addActiveContext).toHaveBeenCalledTimes(0);
			expect(service._removeActiveContext).toHaveBeenCalledTimes(0);
		});
	});

	it("should call _trackContext & dispose", () => {
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);
		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx.tracked).toBe(true);

			expect(service._addActiveContext).toHaveBeenCalledTimes(1);
			expect(service._addActiveContext).toHaveBeenCalledWith(ctx);

			expect(service._removeActiveContext).toHaveBeenCalledTimes(1);
			expect(service._removeActiveContext).toHaveBeenCalledWith(ctx);
		});
	});

	it("should call _trackContext & dispose if handler is rejected", () => {
		service._addActiveContext.mockClear();
		service._removeActiveContext.mockClear();

		let err = new Error("Some error");
		let handler = jest.fn(() => Promise.reject(err));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);
		return newHandler(ctx).then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(ctx.tracked).toBe(true);

			expect(service._addActiveContext).toHaveBeenCalledTimes(1);
			expect(service._addActiveContext).toHaveBeenCalledWith(ctx);

			expect(service._removeActiveContext).toHaveBeenCalledTimes(1);
			expect(service._removeActiveContext).toHaveBeenCalledWith(ctx);
		});
	});
});


