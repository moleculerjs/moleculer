const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").ContextTracker;
const { protectReject } = require("../utils");

describe("Test ContextTrackerMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {
		_activeContexts: []
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
		let resolve;
		const handler = jest.fn(() => new Promise(r => resolve = r));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, null, { trackContext: false });

		const p = newHandler(ctx);
		expect(service._activeContexts.length).toBe(0);
		resolve("Result");

		return p.catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx.tracked).toBeUndefined();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(service._activeContexts.length).toBe(0);
		});
	});

	it("should call _trackContext & dispose", () => {
		let resolve;
		const handler = jest.fn(() => new Promise(r => resolve = r));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		const p = newHandler(ctx);
		expect(service._activeContexts.length).toBe(1);
		expect(service._activeContexts[0]).toBe(ctx);
		resolve("Result");
		return p.catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(ctx.tracked).toBe(true);
			expect(service._activeContexts.length).toBe(0);
		});
	});

	it("should call _trackContext & dispose if handler is rejected", () => {
		let reject;
		const handler = jest.fn(() => new Promise((_,r) => reject = r));
		const newHandler = mw.localAction.call(broker, handler, action);

		let err = new Error("Some error");

		const ctx = Context.create(broker, endpoint);

		const p = newHandler(ctx);
		expect(service._activeContexts.length).toBe(1);
		expect(service._activeContexts[0]).toBe(ctx);
		reject(err);

		return p.then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(ctx.tracked).toBe(true);
			expect(service._activeContexts.length).toBe(0);
		});
	});
});


describe("Test Service handlers with delayed shutdown", () => {
	const FLOW = [];

	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node-1",
		trackContext: true,
		started: () => FLOW.push("broker-start"),
		stopped: () => FLOW.push("broker-stop")
	});


	const schema = {
		name: "delayed",

		actions: {
			test() {
				FLOW.push("start");
				return this.Promise.delay(80)
					.then(() => FLOW.push("end"));
			}
		},

		started: jest.fn(() => FLOW.push("service-start")),
		stopped: jest.fn(() => FLOW.push("service-stop"))
	};

	it("should called stopped", () => {
		const service = broker.createService(schema);
		return broker.start()
			.then(() => {
				broker.call("delayed.test", {});
				return service.Promise.delay(10);
			})
			.then(() => broker.stop())
			.catch(protectReject)
			.then(() => {
				expect(FLOW).toEqual([
					"service-start",
					"broker-start",
					"start",
					"end",
					"service-stop",
					"broker-stop"
				]);
				expect(schema.stopped).toHaveBeenCalledTimes(1);
			});
	});
});
