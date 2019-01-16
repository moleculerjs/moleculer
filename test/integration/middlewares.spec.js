const ServiceBroker = require("../../src/service-broker");
const Promise = require("bluebird");
const utils = require("../../src/utils");

describe("Test middleware system", () => {

	describe("Test with sync & async middlewares", () => {
		let flow = [];
		let mw1Sync = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;
				});
			};
		};

		let mw2Async = handler => {
			return ctx => {
				flow.push("B2");
				return new Promise(resolve => {
					setTimeout(() => {
						flow.push("B2P");
						resolve();
					}, 10);
				}).then(() => {
					return handler(ctx);
				}).then(res => {
					flow.push("A2");
					return res;
				});
			};
		};

		let broker = new ServiceBroker({ logger: false, validation: false, internalMiddlewares: false, middlewares: [mw2Async, mw1Sync] });

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };
		});

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should register plugins", () => {
			expect(broker.middlewares.count()).toBe(2);
		});

		it("should call all middlewares functions & master", () => {
			let p = broker.call("test.foo");
			expect(utils.isPromise(p)).toBe(true);
			return p.then(res => {
				expect(res).toEqual({ user: "icebob" });
				expect(master).toHaveBeenCalledTimes(1);

				expect(flow.join("-")).toBe("B1-B2-B2P-MASTER-A2-A1");
			});
		});
	});

	describe("Test with SYNC break", () => {
		let flow = [];
		let mw1 = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;
				});
			};
		};

		let mw2 = () => {
			return () => {
				flow.push("B2");
				// Don't call handler, break the chain
				return Promise.resolve({ user: "bobcsi" });
			};
		};

		let mw3 = handler => {
			return ctx => {
				flow.push("B3");
				return handler(ctx).then(res => {
					flow.push("A3");
					return res;
				});
			};
		};

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };
		});

		let broker = new ServiceBroker({ logger: false, validation: false, internalMiddlewares: false, middlewares: [mw3, mw2, mw1] });

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should register plugins", () => {
			expect(broker.middlewares.count()).toBe(3);
		});

		it("should call only mw1 & mw2 middlewares functions", () => {
			let p = broker.call("test.foo");
			expect(utils.isPromise(p)).toBe(true);
			return p.then(res => {
				expect(res).toEqual({ user: "bobcsi" });
				expect(master).toHaveBeenCalledTimes(0);
				expect(flow.join("-")).toBe("B1-B2-A1");
			});
		});
	});

	describe("Test middleware system with ASYNC break", () => {
		let flow = [];
		let mw1 = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;
				});
			};
		};

		let mw2 = () => {
			return () => {
				flow.push("B2");
				return new Promise(resolve => {
					setTimeout(() => {
						flow.push("B2P");
						resolve({ user: "bobcsi" });
					}, 10);
				});
			};
		};

		let mw3 = handler => {
			return ctx => {
				flow.push("B3");
				return handler(ctx).then(res => {
					flow.push("A3");
					return res;
				});
			};
		};

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };

		});

		let broker = new ServiceBroker({ logger: false, validation: false, internalMiddlewares: false, middlewares: [mw3, mw2, mw1] });

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should register plugins", () => {
			expect(broker.middlewares.count()).toBe(3);
		});

		it("should call only mw1 & mw2 middlewares functions", () => {
			let p = broker.call("test.foo");
			expect(utils.isPromise(p)).toBe(true);
			return p.then(res => {
				expect(res).toEqual({ user: "bobcsi" });
				expect(master).toHaveBeenCalledTimes(0);
				expect(flow.join("-")).toBe("B1-B2-B2P-A1");
			});
		});
	});

	describe("Test with Error", () => {
		let flow = [];
		let mw1 = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;
				});
			};
		};

		let mw2 = () => {
			return () => {
				flow.push("B2");
				return Promise.reject(new Error("Something happened in mw2"));
			};
		};

		let master = jest.fn(() => {
			return new Promise(resolve => {
				flow.push("MASTER");
				resolve({ user: "icebob" });
			});
		});

		let broker = new ServiceBroker({ logger: false, validation: false, middlewares: [mw2, mw1] });

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should call only mw1 & mw2 middlewares functions", () => {
			let p = broker.call("test.foo");
			expect(utils.isPromise(p)).toBe(true);
			return p.catch(err => {
				expect(err.message).toEqual("Something happened in mw2");
				expect(flow.join("-")).toBe("B1-B2");
			});
		});
	});

});


describe("Test middleware v2 system", () => {

	const FLOW = [];

	const mw1 = {
		// After broker is created
		created(broker) {
			FLOW.push("mw1-created");
		},
		/*
		// Wrap local action handlers (legacy middleware handler)
		localAction(next, action) {

		},

		// Wrap remote action handlers
		remoteAction(next, action) {

		},

		// Wrap local event handlers
		localEvent(next, event) {

		},

		// Wrap broker.createService method
		createService(next) {

		},

		// Wrap broker.registerLocalService method
		registerLocalService(next) {

		},

		// Wrap broker.destroyService method
		destroyService(next) {

		},

		// Wrap broker.call method
		call(next) {

		},

		// Wrap broker.mcall method
		mcall(next) {

		},

		// Wrap broker.emit method
		emit(next) {

		},

		// Wrap broker.broadcast method
		broadcast(next) {

		},

		// Wrap broker.broadcastLocal method
		broadcastLocal(next) {

		},

		// While a new local service creating (after mixins are mixed)
		serviceCreating(service, schema) {

		},

		// After a new local service created
		serviceCreated(service) {

		},

		// Before a local service started
		serviceStarting(service) {

		},

		// After a local service started
		serviceStarted(service) {

		},

		// Before a local service stopping
		serviceStopping(service) {

		},

		// After a local service stopped
		serviceStopped(service) {

		},

		// Before broker starting
		starting(broker) {

		},

		// After broker started
		started(broker) {

		},

		// Before broker stopping
		stopping(broker) {

		},

		// After broker stopped
		stopped(broker) {

		},

		// When transit publishing a packet
		transitPublish(next) {

		},

		// When transit subscribe to a topic
		transitSubscribe(next) {

		},

		// When transit receives & handles a packet
		transitMessageHandler(next) {

		},

		// When transporter send data
		transporterSend(next) {

		},

		// When transporter received data
		transporterReceive(next) {

		}
*/
	};

	const mw2 = {
		// After broker is created
		created(broker) {
			FLOW.push("mw2-created");
		},
		/*
		// Wrap local action handlers (legacy middleware handler)
		localAction(next, action) {

		},

		// Wrap remote action handlers
		remoteAction(next, action) {

		},

		// Wrap local event handlers
		localEvent(next, event) {

		},

		// Wrap broker.createService method
		createService(next) {

		},

		// Wrap broker.registerLocalService method
		registerLocalService(next) {

		},

		// Wrap broker.destroyService method
		destroyService(next) {

		},

		// Wrap broker.call method
		call(next) {

		},

		// Wrap broker.mcall method
		mcall(next) {

		},

		// Wrap broker.emit method
		emit(next) {

		},

		// Wrap broker.broadcast method
		broadcast(next) {

		},

		// Wrap broker.broadcastLocal method
		broadcastLocal(next) {

		},

		// While a new local service creating (after mixins are mixed)
		serviceCreating(service, schema) {

		},

		// After a new local service created
		serviceCreated(service) {

		},

		// Before a local service started
		serviceStarting(service) {

		},

		// After a local service started
		serviceStarted(service) {

		},

		// Before a local service stopping
		serviceStopping(service) {

		},

		// After a local service stopped
		serviceStopped(service) {

		},

		// Before broker starting
		starting(broker) {

		},

		// After broker started
		started(broker) {

		},

		// Before broker stopping
		stopping(broker) {

		},

		// After broker stopped
		stopped(broker) {

		},

		// When transit publishing a packet
		transitPublish(next) {

		},

		// When transit subscribe to a topic
		transitSubscribe(next) {

		},

		// When transit receives & handles a packet
		transitMessageHandler(next) {

		},

		// When transporter send data
		transporterSend(next) {

		},

		// When transporter received data
		transporterReceive(next) {

		}
*/
	};

	let broker;

	it("should call 'created' ", () => {
		broker = new ServiceBroker({ nodeID: "mw2-test", logger: false, internalMiddlewares: false, middlewares: [mw1, mw2] });

		expect(FLOW).toEqual([
			"mw1-created",
			"mw2-created",
		]);
	});

});
