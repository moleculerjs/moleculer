const ServiceBroker 			= require("../../../src/service-broker");
const { RequestTimeoutError }	= require("../../../src/errors");
const Context 					= require("../../../src/context");
const Middleware 				= require("../../../src/middlewares").Timeout;
const { protectReject } 		= require("../utils");
const lolex 					= require("lolex");

describe("Test TimeoutMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
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

	const mw = Middleware();

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
		expect(mw.remoteAction).toBeInstanceOf(Function);
	});

	it("should wrap handler", () => {
		broker.options.metrics = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});

	it("should not set ctx.timeout if requestTimeout is 0", () => {
		broker.options.requestTimeout = 0;
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx.timeout).toBeUndefined();
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should handle timeout", () => {
		const clock = lolex.install();

		broker.options.requestTimeout = 5000;

		let handler = jest.fn(() => broker.Promise.delay(10 * 1000));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		const p = newHandler(ctx);

		clock.tick(5500);

		return p.then(protectReject).catch(err => {
			expect(ctx.timeout).toBe(5000);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(err).toBeInstanceOf(Error);
			expect(err).toBeInstanceOf(RequestTimeoutError);
			expect(err.message).toBe("Request is timed out when call 'posts.find' action on 'server-1' node.");
			expect(err.data).toEqual({ action: "posts.find", nodeID: "server-1"});

			clock.uninstall();
		});
	});

	it("should don't touch other errors", () => {
		let err = new Error("Some error");
		let handler = jest.fn(() => Promise.reject(err));

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).then(protectReject).catch(res => {
			expect(ctx.timeout).toBe(5000);
			expect(res).toBe(err);
		});
	});
});
