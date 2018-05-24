const ServiceBroker 			= require("../../../src/service-broker");
const { MoleculerError }		= require("../../../src/errors");
const Context 					= require("../../../src/context");
const Middleware 				= require("../../../src/middlewares").Metrics;
const { protectReject }			= require("../utils");

describe("Test MetricsMiddleware", () => {
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


	it("should send metric events if handler is resolved", () => {
		broker.options.metrics = true;
		handler.mockClear();
		const newHandler = mw.localAction.call(broker, handler, action);
		broker.emit = jest.fn();

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": {"name": "posts.find" },
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
				"startTime": ctx.startTime
			});

			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": {"name": "posts.find" },
				"startTime": ctx.startTime,
				"endTime": ctx.stopTime,
				"duration": ctx.duration,
				"fromCache": false,
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
			});
		});
	});

	it("should send metric events if handler is rejected", () => {
		let err = new MoleculerError("Some error", 502, "SOME_ERROR", { a: 5 });
		let handler = jest.fn(() => Promise.reject(err));
		const newHandler = mw.localAction.call(broker, handler, action);
		broker.emit = jest.fn();

		const ctx = Context.create(broker, endpoint);
		return newHandler(ctx).then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": {"name": "posts.find" },
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
				"startTime": ctx.startTime
			});

			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": {"name": "posts.find" },
				"startTime": ctx.startTime,
				"endTime": ctx.stopTime,
				"duration": ctx.duration,
				"fromCache": false,
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
				"error": {"code": 502, "message": "Some error", "name": "MoleculerError", "type": "SOME_ERROR" }
			});
		});
	});
});


