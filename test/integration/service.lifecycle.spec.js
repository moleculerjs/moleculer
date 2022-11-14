const ServiceBroker = require("../../src/service-broker");
const { protectReject } = require("../unit/utils");

describe("Test Service handlers", () => {
	let mergedHandler = jest.fn();
	let createdHandler = jest.fn();
	let startedHandler = jest.fn();
	let stoppedHandler = jest.fn();
	let eventHandler = jest.fn();

	let broker = new ServiceBroker({ logger: false, nodeID: "node-1" });

	broker.createService({
		name: "posts",

		merged: mergedHandler,
		created: createdHandler,
		started: startedHandler,
		stopped: stoppedHandler,

		events: {
			"user.*": eventHandler
		}
	});

	it("should call merged handler", () => {
		expect(mergedHandler).toHaveBeenCalledTimes(1);
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
		expect(eventHandler).toHaveBeenCalledWith(
			{ id: 1, name: "John" },
			"node-1",
			"user.created",
			expect.any(broker.ContextFactory)
		);
	});

	it("should call stop handler", () => {
		return broker.stop().then(() => {
			expect(stoppedHandler).toHaveBeenCalledTimes(1);
		});
	});
});

describe("Test Service handlers after broker.start", () => {
	let mergedHandler = jest.fn();
	let createdHandler = jest.fn();
	let startedHandler = jest.fn();
	let stoppedHandler = jest.fn();
	let eventHandler = jest.fn();

	let broker = new ServiceBroker({ logger: false, nodeID: "node-1" });

	beforeAll(() => broker.start());

	it("load service dynamically", () => {
		broker.createService({
			name: "posts",

			merged: mergedHandler,
			created: createdHandler,
			started: startedHandler,
			stopped: stoppedHandler,

			events: {
				"user.*": eventHandler
			}
		});
	});

	it("should call merged, created & started handler", () => {
		return broker.Promise.delay(100).then(() => {
			expect(mergedHandler).toHaveBeenCalledTimes(1);
			expect(createdHandler).toHaveBeenCalledTimes(1);
			expect(startedHandler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call event handler", () => {
		broker.broadcastLocal("user.created", { id: 1, name: "John" });
		expect(eventHandler).toHaveBeenCalledTimes(1);
		expect(eventHandler).toHaveBeenCalledWith(
			{ id: 1, name: "John" },
			"node-1",
			"user.created",
			expect.any(broker.ContextFactory)
		);
	});

	it("should call stop handler", () => {
		return broker.stop().then(() => {
			expect(stoppedHandler).toHaveBeenCalledTimes(1);
		});
	});
});

describe("Test Service requesting during stopping", () => {
	const broker1 = new ServiceBroker({ logger: false, nodeID: "node-1", transporter: "Fake" });
	const broker2 = new ServiceBroker({ logger: false, nodeID: "node-2", transporter: "Fake" });

	let resolver = null;

	const schema1 = {
		name: "posts",

		actions: {
			find: jest.fn()
		},

		stopped() {
			return new this.Promise(resolve => {
				resolver = resolve;
			});
		}
	};
	broker2.createService(schema1);

	const schema2 = {
		name: "users",
		actions: {
			find: jest.fn()
		}
	};
	broker2.createService(schema2);

	beforeAll(() => Promise.all([broker1.start(), broker2.start(), Promise.resolve().delay(2000)]));

	it("should call action", () => {
		return broker1
			.call("posts.find")
			.catch(protectReject)
			.then(() => {
				expect(schema1.actions.find).toHaveBeenCalledTimes(1);
			});
	});

	it("should not call action after stopping", () => {
		schema1.actions.find.mockClear();
		broker2.stop();
		return broker1.Promise.delay(500)
			.then(() => broker1.call("posts.find"))
			.then(protectReject)
			.catch(err => {
				expect(err.name).toBe("ServiceNotAvailableError");
				expect(schema1.actions.find).toHaveBeenCalledTimes(0);
			})
			.then(() => broker1.call("users.find"))
			.then(protectReject)
			.catch(err => {
				expect(err.name).toBe("ServiceNotAvailableError");
				expect(schema2.actions.find).toHaveBeenCalledTimes(0);

				resolver();
				return broker1.stop();
			});
	});
});
