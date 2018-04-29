let ServiceBroker = require("../../src/service-broker");

describe("Test Service handlers", () => {

	let createdHandler = jest.fn();
	let startedHandler = jest.fn();
	let stoppedHandler = jest.fn();
	let eventHandler = jest.fn();

	let broker = new ServiceBroker({ nodeID: "node-1" });

	broker.createService({
		name: "posts",

		created: createdHandler,
		started: startedHandler,
		stopped: stoppedHandler,

		events: {
			"user.*": eventHandler
		}
	});

	it("should call created handler", () => {
		expect(createdHandler).toHaveBeenCalledTimes(1);
	});

	it("should call start handler", () => {
		return broker.start().then(() => {
			expect(startedHandler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call event handler", () => {
		broker.broadcastLocal("user.created", { id: 1, name: "John" });
		expect(eventHandler).toHaveBeenCalledTimes(1);
		expect(eventHandler).toHaveBeenCalledWith({ id: 1, name: "John" }, "node-1", "user.created");
	});

	it("should call stop handler", () => {
		return broker.stop().then(() => {
			expect(stoppedHandler).toHaveBeenCalledTimes(1);
		});
	});
});

describe("Test Service handlers after broker.start", () => {

	let createdHandler = jest.fn();
	let startedHandler = jest.fn();
	let stoppedHandler = jest.fn();
	let eventHandler = jest.fn();

	let broker = new ServiceBroker({ nodeID: "node-1" });

	beforeAll(() => broker.start());

	it("load service dynamically", () => {
		broker.createService({
			name: "posts",

			created: createdHandler,
			started: startedHandler,
			stopped: stoppedHandler,

			events: {
				"user.*": eventHandler
			}
		});
	});

	it("should call created & started handler", () => {
		return broker.Promise.delay(100).then(() => {
			expect(createdHandler).toHaveBeenCalledTimes(1);
			expect(startedHandler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call event handler", () => {
		broker.broadcastLocal("user.created", { id: 1, name: "John" });
		expect(eventHandler).toHaveBeenCalledTimes(1);
		expect(eventHandler).toHaveBeenCalledWith({ id: 1, name: "John" }, "node-1", "user.created");
	});

	it("should call stop handler", () => {
		return broker.stop().then(() => {
			expect(stoppedHandler).toHaveBeenCalledTimes(1);
		});
	});
});


describe("Test Service handlerswith delayed shutdown", () => {
	const broker = new ServiceBroker({ nodeID: "node-1", trackContext: true });

	const schema = {
		name: "delayed",

		actions: {
			test: jest.fn()
		},

		stopped: jest.fn()
	};

	it("should called stopped", () => {
		const service = broker.createService(schema);
		service.schema.actions.test.mockResolvedValue(service.Promise.delay(110));
		const getActiveContextsSpy = jest.spyOn(service, "_getActiveContexts");
		// const trackContextsSpy = jest.spyOn(service, "_trackContext");
		return broker.start()
			.then(() => {
				broker.call("delayed.test", {});
				return service.Promise.delay(10);
			})
			.then(() => broker.stop())
			.then(() => {
				expect(schema.actions.test).toHaveBeenCalledTimes(1);
				expect(getActiveContextsSpy).toHaveBeenCalledTimes(2);

				getActiveContextsSpy.mockReset();
				getActiveContextsSpy.mockRestore();
			});
	});
});
