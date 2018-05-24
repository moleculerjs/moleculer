const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").TrackContext;
const { protectReject } = require("../utils");

describe("Test TrackContextMiddleware", () => {
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
		ctx._trackContext = jest.fn(() => ctx.tracked = true);
		ctx.dispose = jest.fn();

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx.tracked).toBe(false);

			expect(ctx._trackContext).toHaveBeenCalledTimes(0);
			expect(ctx.dispose).toHaveBeenCalledTimes(0);
		});
	});

	it("should call _trackContext & dispose", () => {
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);
		ctx._trackContext = jest.fn(() => ctx.tracked = true);
		ctx.dispose = jest.fn();

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx.tracked).toBe(true);

			expect(ctx._trackContext).toHaveBeenCalledTimes(1);
			expect(ctx._trackContext).toHaveBeenCalledWith();

			expect(ctx.dispose).toHaveBeenCalledTimes(1);
			expect(ctx.dispose).toHaveBeenCalledWith();
		});
	});

	it("should call _trackContext & dispose if handler is rejected", () => {
		let err = new Error("Some error");
		let handler = jest.fn(() => Promise.reject(err));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);
		ctx._trackContext = jest.fn(() => ctx.tracked = true);
		ctx.dispose = jest.fn();


		return newHandler(ctx).then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(ctx.tracked).toBe(true);

			expect(ctx._trackContext).toHaveBeenCalledTimes(1);
			expect(ctx._trackContext).toHaveBeenCalledWith();

			expect(ctx.dispose).toHaveBeenCalledTimes(1);
			expect(ctx.dispose).toHaveBeenCalledWith();
		});
	});
});


