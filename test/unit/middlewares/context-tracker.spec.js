// const why = require("why-is-node-running");
const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").ContextTracker;
const { protectReject } = require("../utils");

const lolex = require("lolex");

describe("Test ContextTrackerMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {
		_trackedContexts: []
	};
	broker._trackedContexts = [];

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

	const mw = Middleware(broker);

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
		expect(mw.remoteAction).toBeInstanceOf(Function);
		expect(mw.localEvent).toBeInstanceOf(Function);
	});

	it("should not wrap handler if tracking is disabled", () => {
		broker.options.tracking.enabled = false;

		const newHandler = mw.localAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);
	});

	it("should wrap handler if tracking is enabled", () => {
		broker.options.tracking.enabled = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});

	it("should not track if tracking is false in calling options", () => {
		let resolve;
		const handler = jest.fn(() => new Promise(r => resolve = r));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, null, { tracking: false });

		const p = newHandler(ctx);
		expect(service._trackedContexts.length).toBe(0);
		resolve("Result");

		return p.catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(handler).toHaveBeenCalledTimes(1);
			expect(service._trackedContexts.length).toBe(0);
		});
	});

	it("should tracking", () => {
		let resolve;
		const handler = jest.fn(() => new Promise(r => resolve = r));
		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint);

		const p = newHandler(ctx);
		expect(service._trackedContexts.length).toBe(1);
		expect(service._trackedContexts[0]).toBe(ctx);
		resolve("Result");
		return p.catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(service._trackedContexts.length).toBe(0);
		});
	});

	it("should remove from list if handler is rejected", () => {
		let reject;
		const handler = jest.fn(() => new Promise((_,r) => reject = r));
		const newHandler = mw.localAction.call(broker, handler, action);

		let err = new Error("Some error");

		const ctx = Context.create(broker, endpoint);

		const p = newHandler(ctx);
		expect(service._trackedContexts.length).toBe(1);
		expect(service._trackedContexts[0]).toBe(ctx);
		reject(err);

		return p.then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(service._trackedContexts.length).toBe(0);
		});
	});
});


describe("Test Service stopping with delayed shutdown", () => {
	const FLOW = [];

	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node-1",
		tracking: {
			enabled: true
		},
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

describe("Test Service stopping with delayed shutdown & event", () => {
	const FLOW = [];

	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node-1",
		tracking: {
			enabled: true
		},
		started: () => FLOW.push("broker-start"),
		stopped: () => FLOW.push("broker-stop")
	});


	const schema = {
		name: "delayed",

		events: {
			async test() {
				FLOW.push("start");
				await this.Promise.delay(80);
				FLOW.push("end");
			}
		},

		started: jest.fn(() => FLOW.push("service-start")),
		stopped: jest.fn(() => FLOW.push("service-stop"))
	};

	it("should called stopped", () => {
		const service = broker.createService(schema);
		return broker.start()
			.then(() => {
				broker.emit("test");
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

describe("Test Service throw GraceFulTimeoutError", () => {
	const FLOW = [];

	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node-2",
		tracking: {
			enabled: true
		},
		started: () => FLOW.push("broker-start"),
		stopped: () => FLOW.push("broker-stop")
	});


	const schema = {
		name: "delayed",
		settings: {
			$shutdownTimeout: 100
		},

		actions: {
			test() {
				FLOW.push("start");
				return this.Promise.delay(2000)
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
					"service-stop",
					"broker-stop"
				]);
				expect(schema.stopped).toHaveBeenCalledTimes(1);
			});
	});
});

// The result is not exact. Sometimes it's failed randomly on Travis CI
describe.skip("Test broker delayed shutdown with remote calls", () => {
	const FLOW = [];

	const broker1 = new ServiceBroker({
		transporter: "Fake",
		logger: false,
		nodeID: "node-3",
		tracking: {
			enabled: true
		},
		started: () => FLOW.push("broker1-start"),
		stopped: () => FLOW.push("broker1-stop")
	});

	const broker2 = new ServiceBroker({
		transporter: "Fake",
		logger: false,
		nodeID: "node-4",
		tracking: {
			enabled: true
		},
		started: () => FLOW.push("broker2-start"),
		stopped: () => FLOW.push("broker2-stop")
	});

	broker2.createService({
		name: "delayed",

		actions: {
			test() {
				FLOW.push("start");
				return this.Promise.delay(250)
					.then(() => FLOW.push("end"));
			}
		},

		started: jest.fn(() => FLOW.push("service-start")),
		stopped: jest.fn(() => FLOW.push("service-stop"))
	});

	beforeAll(() => broker1.start().then(() => broker2.start()));

	it("should called stopped", () => {
		return broker1.Promise.resolve()
			.then(() => {
				broker1.call("delayed.test", {});
				return broker1.Promise.delay(50);
			})
			.then(() => broker1.Promise.all([broker1.stop(), broker2.stop()]))
			.catch(protectReject)
			.then(() => {
				expect(FLOW).toEqual([
					"broker1-start",
					"service-start",
					"broker2-start",
					"start",
					"end",
					"service-stop",
					"broker2-stop",
					"broker1-stop",
				]);
			});
	});
});

describe.skip("Test broker delayed throw GraceFulTimeoutError with remote calls", () => {
	const FLOW = [];

	const broker1 = new ServiceBroker({
		transporter: "Fake",
		logger: false,
		nodeID: "node-5",
		tracking: {
			enabled: true,
			shutdownTimeout: 100
		},
		started: () => FLOW.push("broker1-start"),
		stopped: () => FLOW.push("broker1-stop")
	});

	const broker2 = new ServiceBroker({
		transporter: "Fake",
		logger: false,
		nodeID: "node-6",
		tracking: {
			enabled: true,
			shutdownTimeout: 200
		},
		started: () => FLOW.push("broker2-start"),
		stopped: () => FLOW.push("broker2-stop")
	});

	broker2.createService({
		name: "delayed",

		actions: {
			test() {
				FLOW.push("start");
				return new this.Promise(resolve => {
					const timer = setTimeout(() => {
						FLOW.push("end");
						resolve();
					}, 2000);
					timer.unref();
				});
			}
		},

		started: jest.fn(() => FLOW.push("service-start")),
		stopped: jest.fn(() => FLOW.push("service-stop"))
	});

	beforeAll(() => broker1.start().then(() => broker2.start()));

	it("should called stopped", () => {
		return broker1.Promise.resolve()
			.then(() => {
				broker1.call("delayed.test", {});
				return broker1.Promise.delay(10);
			})
			.then(() => broker1.Promise.all([broker2.stop(), broker1.stop()]))
			.catch(protectReject)
			.then(() => {
				expect(FLOW).toEqual([
					"broker1-start",
					"service-start",
					"broker2-start",
					"start",
					"broker1-stop",
					"service-stop",
					"broker2-stop",
				]);
			});
	});
});
