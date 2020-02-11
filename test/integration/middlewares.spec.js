const ServiceBroker = require("../../src/service-broker");
const utils = require("../../src/utils");
const { protectReject } = require("../unit/utils");

describe("Test middleware system", () => {

	describe("Test with sync & async middlewares", () => {
		let flow = [];
		let mw1Sync = {
			localAction: handler => {
				return ctx => {
					flow.push("B1");
					return handler(ctx).then(res => {
						flow.push("A1");
						return res;
					});
				};
			}
		};

		let mw2Async = {
			localAction: handler => {
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
			}
		};

		let broker = new ServiceBroker({ logger: false, validator: false, internalMiddlewares: false, middlewares: [mw2Async, null, mw1Sync] });

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
		let mw1 = {
			localAction: handler => {
				return ctx => {
					flow.push("B1");
					return handler(ctx).then(res => {
						flow.push("A1");
						return res;
					});
				};
			}
		};

		let mw2 = {
			localAction: () => {
				return () => {
					flow.push("B2");
					// Don't call handler, break the chain
					return Promise.resolve({ user: "bobcsi" });
				};
			}
		};

		let mw3 = {
			localAction: handler => {
				return ctx => {
					flow.push("B3");
					return handler(ctx).then(res => {
						flow.push("A3");
						return res;
					});
				};
			}
		};

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };
		});

		let broker = new ServiceBroker({ logger: false, validator: false, internalMiddlewares: false, middlewares: [mw3, mw2, mw1] });

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
		let mw1 = {
			localAction: handler => {
				return ctx => {
					flow.push("B1");
					return handler(ctx).then(res => {
						flow.push("A1");
						return res;
					});
				};
			}
		};

		let mw2 = {
			localAction: () => {
				return () => {
					flow.push("B2");
					return new Promise(resolve => {
						setTimeout(() => {
							flow.push("B2P");
							resolve({ user: "bobcsi" });
						}, 10);
					});
				};
			}
		};

		let mw3 = {
			localAction: handler => {
				return ctx => {
					flow.push("B3");
					return handler(ctx).then(res => {
						flow.push("A3");
						return res;
					});
				};
			}
		};

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };
		});

		let broker = new ServiceBroker({ logger: false, validator: false, internalMiddlewares: false, middlewares: [mw3, mw2, mw1] });

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
		let mw1 = {
			localAction: handler => {
				return ctx => {
					flow.push("B1");
					return handler(ctx).then(res => {
						flow.push("A1");
						return res;
					});
				};
			}
		};

		let mw2 = {
			localAction: () => {
				return () => {
					flow.push("B2");
					return Promise.reject(new Error("Something happened in mw2"));
				};
			}
		};

		let master = jest.fn(() => {
			return new Promise(resolve => {
				flow.push("MASTER");
				resolve({ user: "icebob" });
			});
		});

		let broker = new ServiceBroker({ logger: false, validator: false, middlewares: [mw2, mw1] });

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
	let broker;

	function createMW(mwName) {
		return {
			// After broker is created
			created(b) {
				expect(b).toBeInstanceOf(ServiceBroker);
				FLOW.push(`${mwName}-created`);
			},

			// Wrap local action handlers (legacy middleware handler)
			localAction(next, action) {
				expect(action).toBeDefined();
				return ctx => {
					FLOW.push(`${mwName}-localAction-before-${ctx.params.name}`);
					return next(ctx).then(res => {
						FLOW.push(`${mwName}-localAction-after-${ctx.params.name}`);
						return res;
					});
				};
			},

			// Wrap remote action handlers
			remoteAction(next, action) {
				expect(action).toBeDefined();
				return ctx => {
					FLOW.push(`${mwName}-remoteAction-before-${ctx.params.name}`);
					return next(ctx).then(res => {
						FLOW.push(`${mwName}-remoteAction-after-${ctx.params.name}`);
						return res;
					});
				};
			},

			// Wrap local event handlers
			localEvent(next, event) {
				expect(event).toBeDefined();
				return (ctx) => {
					FLOW.push(`${mwName}-localEvent-${ctx.eventName}-${ctx.params.name}`);
					return next(ctx);
				};
			},

			// Wrap broker.createService method
			createService(next) {
				return (schema, schemaMods) => {
					FLOW.push(`${mwName}-createService-${schema.name}`);
					return next(schema, schemaMods);
				};
			},

			// Wrap broker.registerLocalService method
			registerLocalService(next) {
				return (svc) => {
					FLOW.push(`${mwName}-registerLocalService-${svc.name}`);
					return next(svc);
				};
			},

			// Wrap broker.destroyService method
			destroyService(next) {
				return (svc) => {
					FLOW.push(`${mwName}-destroyService-${svc.name}`);
					return next(svc);
				};
			},

			// Wrap broker.call method
			call(next) {
				return (actionName, params, opts) => {
					FLOW.push(`${mwName}-call-${actionName}-before-${params.name}`);
					return next(actionName, params, opts).then(res => {
						FLOW.push(`${mwName}-call-${actionName}-after-${params.name}`);
						return res;
					});
				};
			},

			// Wrap broker.mcall method
			mcall(next) {
				return (def) => {
					FLOW.push(`${mwName}-mcall-${def[0].action}-before-${def[0].params.name}`);
					return next(def).then(res => {
						FLOW.push(`${mwName}-mcall-${def[0].action}-after-${def[0].params.name}`);
						return res;
					});
				};
			},

			// Wrap broker.emit method
			emit(next) {
				return (event, payload) => {
					if (event == "john.welcomed")
						FLOW.push(`${mwName}-emit-${event}-${payload.name}`);
					return next(event, payload);
				};
			},

			// Wrap broker.broadcast method
			broadcast(next) {
				return (event, payload) => {
					if (event == "john.welcomed")
						FLOW.push(`${mwName}-broadcast-${event}-${payload.name}`);
					return next(event, payload);
				};
			},

			// Wrap broker.broadcastLocal method
			broadcastLocal(next) {
				return (event, payload) => {
					if (event == "john.welcomed")
						FLOW.push(`${mwName}-broadcastLocal-${event}-${payload.name}`);
					return next(event, payload);
				};
			},

			// While a new local service creating (after mixins are mixed)
			serviceCreating(service, schema) {
				expect(service).toBeDefined();
				expect(schema).toBeDefined();

				FLOW.push(`${mwName}-serviceCreating-${schema.name}`);
			},

			// After a new local service created
			serviceCreated(service) {
				expect(service).toBeDefined();

				FLOW.push(`${mwName}-serviceCreated-${service.name}`);
			},

			// Before a local service started
			serviceStarting(service) {
				expect(service).toBeDefined();

				FLOW.push(`${mwName}-serviceStarting-${service.name}`);
			},

			// After a local service started
			serviceStarted(service) {
				expect(service).toBeDefined();

				FLOW.push(`${mwName}-serviceStarted-${service.name}`);
			},

			// Before a local service stopping
			serviceStopping(service) {
				expect(service).toBeDefined();

				FLOW.push(`${mwName}-serviceStopping-${service.name}`);
			},

			// After a local service stopped
			serviceStopped(service) {
				expect(service).toBeDefined();

				FLOW.push(`${mwName}-serviceStopped-${service.name}`);
			},

			// Before broker starting
			starting(b) {
				expect(b).toBe(broker);

				FLOW.push(`${mwName}-starting`);
			},

			// After broker started
			started(b) {
				expect(b).toBe(broker);

				FLOW.push(`${mwName}-started`);
			},

			// Before broker stopping
			stopping(b) {
				expect(b).toBe(broker);

				FLOW.push(`${mwName}-stopping`);
			},

			// After broker stopped
			stopped(b) {
				expect(b).toBe(broker);

				FLOW.push(`${mwName}-stopped`);
			},

			// When transit publishing a packet
			transitPublish(next) {
				return packet => {
					FLOW.push(`${mwName}-publish-${packet.type}`);
					return next(packet);
				};
			},

			// When transit receives & handles a packet
			transitMessageHandler(next) {
				return (cmd, packet) => {
					FLOW.push(`${mwName}-transitMessageHandler-${cmd}`);
					return next(cmd, packet);
				};
			},

			// When transporter send data
			transporterSend(next) {
				return (topic, data, meta) => {
					FLOW.push(`${mwName}-transporterSend-${topic}`);
					return next(topic, data, meta);
				};
			},

			// When transporter received data
			transporterReceive(next) {
				return (cmd, data, s) => {
					FLOW.push(`${mwName}-transporterReceive-${cmd}`);
					return next(cmd, data, s);
				};
			}

		};
	}

	const mw1 = createMW("mw1");
	const mw2 = createMW("mw2");

	beforeEach(() => FLOW.length = 0);

	it("should call 'created' ", () => {
		broker = new ServiceBroker({ nodeID: "mw2-test", logger: false, internalMiddlewares: false, middlewares: [mw1, mw2] });

		expect(FLOW).toEqual([
			"mw2-createService-$node",
			"mw1-createService-$node",

			"mw1-serviceCreating-$node",
			"mw2-serviceCreating-$node",

			"mw1-serviceCreated-$node",
			"mw2-serviceCreated-$node",

			"mw1-created",
			"mw2-created",
		]);
	});

	it("should call 'serviceCreating' & 'serviceCreated' ", () => {
		broker.createService({
			name: "greeter",
			actions: {
				hello(ctx) {
					FLOW.push(`svc-${ctx.action.name}-${ctx.params.name}`);
					return `Hello ${ctx.params.name}!`;
				}
			},
			events: {
				"john.**"(ctx) {
					FLOW.push(`svc-${ctx.eventName}-${ctx.params.name}`);
				}
			}
		});
		expect(FLOW).toEqual([
			"mw2-createService-greeter",
			"mw1-createService-greeter",

			"mw1-serviceCreating-greeter",
			"mw2-serviceCreating-greeter",

			"mw1-serviceCreated-greeter",
			"mw2-serviceCreated-greeter"
		]);
	});

	it("should call 'starting', 'started', 'serviceStarting' & serviceStarted' ", () => {
		return broker.start().catch(protectReject).then(() => {
			expect(FLOW).toEqual([
				"mw1-starting",
				"mw2-starting",

				"mw1-serviceStarting-$node",
				"mw1-serviceStarting-greeter",
				"mw2-serviceStarting-$node",
				"mw2-serviceStarting-greeter",

				"mw2-registerLocalService-$node",
				"mw1-registerLocalService-$node",
				"mw2-registerLocalService-greeter",
				"mw1-registerLocalService-greeter",

				"mw1-serviceStarted-$node",
				"mw1-serviceStarted-greeter",
				"mw2-serviceStarted-$node",
				"mw2-serviceStarted-greeter",

				"mw1-started",
				"mw2-started"
			]);
		});
	});

	it("should call 'call' & 'localAction' ", () => {
		return broker.call("greeter.hello", { name: "John" }).catch(protectReject).then(res => {
			expect(res).toBe("Hello John!");
			expect(FLOW).toEqual([
				"mw2-call-greeter.hello-before-John",
				"mw1-call-greeter.hello-before-John",

				"mw2-localAction-before-John",
				"mw1-localAction-before-John",

				"svc-greeter.hello-John",

				"mw1-localAction-after-John",
				"mw2-localAction-after-John",

				"mw1-call-greeter.hello-after-John",
				"mw2-call-greeter.hello-after-John"
			]);
		});
	});

	it("should call 'mcall' & 'localAction' ", () => {
		return broker.mcall([
			{ action: "greeter.hello", params: { name: "John" } }
		]).catch(protectReject).then(res => {
			expect(res).toEqual(["Hello John!"]);
			expect(FLOW).toEqual([
				"mw2-mcall-greeter.hello-before-John",
				"mw1-mcall-greeter.hello-before-John",
				"mw2-call-greeter.hello-before-John",
				"mw1-call-greeter.hello-before-John",

				"mw2-localAction-before-John",
				"mw1-localAction-before-John",

				"svc-greeter.hello-John",

				"mw1-localAction-after-John",
				"mw2-localAction-after-John",

				"mw1-call-greeter.hello-after-John",
				"mw2-call-greeter.hello-after-John",
				"mw1-mcall-greeter.hello-after-John",
				"mw2-mcall-greeter.hello-after-John"
			]);
		});
	});

	it("should call 'emit' & 'localEvent' ", () => {
		broker.emit("john.welcomed", { name: "John" });
		expect(FLOW).toEqual([
			"mw2-emit-john.welcomed-John",
			"mw1-emit-john.welcomed-John",

			"mw2-localEvent-john.welcomed-John",
			"mw1-localEvent-john.welcomed-John",

			"svc-john.welcomed-John"
		]);
	});

	it("should call 'broadcast' & 'localEvent' ", () => {
		broker.broadcast("john.welcomed", { name: "John" });
		expect(FLOW).toEqual([
			"mw2-broadcast-john.welcomed-John",
			"mw1-broadcast-john.welcomed-John",

			"mw2-broadcastLocal-john.welcomed-John",
			"mw1-broadcastLocal-john.welcomed-John",

			"mw2-localEvent-john.welcomed-John",
			"mw1-localEvent-john.welcomed-John",

			"svc-john.welcomed-John"
		]);
	});

	it("should call 'broadcastLocal' & 'localEvent' ", () => {
		broker.broadcastLocal("john.welcomed", { name: "John" });
		expect(FLOW).toEqual([
			"mw2-broadcastLocal-john.welcomed-John",
			"mw1-broadcastLocal-john.welcomed-John",

			"mw2-localEvent-john.welcomed-John",
			"mw1-localEvent-john.welcomed-John",

			"svc-john.welcomed-John"
		]);
	});

	it("should call 'destroyService', 'serviceStopping', 'serviceStopped' ", () => {
		return broker.destroyService(broker.getLocalService("greeter")).catch(protectReject).then(() => {
			expect(FLOW).toEqual([
				"mw2-destroyService-greeter",
				"mw1-destroyService-greeter",

				"mw2-serviceStopping-greeter",
				"mw1-serviceStopping-greeter",

				"mw2-serviceStopped-greeter",
				"mw1-serviceStopped-greeter"
			]);
		});
	});

	it("should call 'stopping', 'stopped' ", () => {
		return broker.stop().catch(protectReject).then(() => {
			expect(FLOW).toEqual([
				"mw2-stopping",
				"mw1-stopping",

				"mw2-serviceStopping-$node",
				"mw1-serviceStopping-$node",

				"mw2-serviceStopped-$node",
				"mw1-serviceStopped-$node",

				"mw2-stopped",
				"mw1-stopped"
			]);
		});
	});

	it("--- create broker with transporter", () => {
		mw1.created = null; mw1.starting = null; mw1.started = null; mw1.stopping = null; mw1.stopped = null;
		mw2.created = null; mw2.starting = null; mw2.started = null; mw2.stopping = null; mw2.stopped = null;

		broker = new ServiceBroker({ logger: false, nodeID: "node-1", transporter: "Fake", internalMiddlewares: false, middlewares: [mw1, mw2] });
		const broker2 = new ServiceBroker({ logger: false, nodeID: "node-2", transporter: "Fake", internalMiddlewares: false, middlewares: [mw1, mw2] });
		broker2.createService({
			name: "greeter",
			actions: {
				hello(ctx) {
					FLOW.push(`svc-${ctx.action.name}-${ctx.params.name}`);
					return `Hello ${ctx.params.name}!`;
				}
			}
		});

		return Promise.all([broker.start(), broker2.start()]).delay(500)/*.catch(protectReject).then(() => {
			expect(FLOW).toEqual([

			]);
		})*/;
	});

	it("should call 'remoteAction' ", () => {
		return broker.call("greeter.hello", { name: "John" }).catch(protectReject).then(res => {
			expect(res).toBe("Hello John!");
			expect(FLOW).toEqual([
				"mw2-call-greeter.hello-before-John",
				"mw1-call-greeter.hello-before-John",

				"mw2-remoteAction-before-John",
				"mw1-remoteAction-before-John",

				"mw2-publish-REQ",
				"mw1-publish-REQ",

				"mw2-transporterSend-MOL.REQ.node-2",
				"mw1-transporterSend-MOL.REQ.node-2",

				"mw1-transporterReceive-REQ",
				"mw2-transporterReceive-REQ",

				"mw2-transitMessageHandler-REQ",
				"mw1-transitMessageHandler-REQ",

				"mw2-localAction-before-John",
				"mw1-localAction-before-John",

				"svc-greeter.hello-John",

				"mw1-localAction-after-John",
				"mw2-localAction-after-John",

				"mw2-publish-RES",
				"mw1-publish-RES",

				"mw2-transporterSend-MOL.RES.node-1",
				"mw1-transporterSend-MOL.RES.node-1",

				"mw1-transporterReceive-RES",
				"mw2-transporterReceive-RES",

				"mw2-transitMessageHandler-RES",
				"mw1-transitMessageHandler-RES",

				"mw1-remoteAction-after-John",
				"mw2-remoteAction-after-John",

				"mw1-call-greeter.hello-after-John",
				"mw2-call-greeter.hello-after-John"
			]);
		});
	});

	it("should call 'transitPublish', 'transporterSend', 'transporterReceive', 'transporterSend' ", () => {
		return broker.ping().catch(protectReject).then(() => {
			expect(FLOW).toEqual([
				"mw2-publish-PING",
				"mw1-publish-PING",

				"mw2-transporterSend-MOL.PING.node-2",
				"mw1-transporterSend-MOL.PING.node-2",

				"mw1-transporterReceive-PING",
				"mw2-transporterReceive-PING",

				"mw2-transitMessageHandler-PING",
				"mw1-transitMessageHandler-PING",

				"mw2-publish-PONG",
				"mw1-publish-PONG",

				"mw2-transporterSend-MOL.PONG.node-1",
				"mw1-transporterSend-MOL.PONG.node-1",

				"mw1-transporterReceive-PONG",
				"mw2-transporterReceive-PONG",

				"mw2-transitMessageHandler-PONG",
				"mw1-transitMessageHandler-PONG"
			]);
		});
	});

});
