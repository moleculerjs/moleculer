"use strict";

const Service = require("../../src/service");
const Context = require("../../src/context");
const ServiceBroker = require("../../src/service-broker");
const { protectReject } = require("./utils");

/**
 * TODO:
 * 	Should rewrite some tests because many test integration test instead of unit test.
 */

describe("Test Service constructor", () => {

	let broker = new ServiceBroker({ logger: false });

	let schema = {
		name: "users",
		version: 2,
		settings: {
			a: 1,
			cache: true
		}
	};

	broker.callMiddlewareHookSync = jest.fn();
	jest.spyOn(broker, "getLogger");

	it("should throw exceptions if missing main properties", () => {
		expect(() => {
			new Service();
		}).toThrowError("Must set a ServiceBroker instance!");

		expect(() => {
			/* eslint-disable-next-line */
			console.error = jest.fn();
			const svc = new Service(broker);
			svc.parseServiceSchema();
		}).toThrowError("Must pass a service schema in constructor. Maybe is it not a service schema?");

		expect(() => {
			new Service(broker, {});
		}).toThrowError("Service name can't be empty! Maybe it is not a valid Service schema.");
	});

	it("check local properties", () => {
		broker.callMiddlewareHookSync.mockClear();
		broker.getLogger.mockClear();
		let service = new Service(broker, schema);
		expect(service.name).toBe("users");
		expect(service.version).toBe(2);
		expect(service.fullName).toBe("v2.users");
		expect(service.settings).toBe(schema.settings);
		expect(service.metadata).toEqual({});
		expect(service.schema).toBe(schema);
		expect(service.broker).toBe(broker);
		expect(service.Promise).toBe(broker.Promise);

		expect(service.logger).toBeDefined();
		expect(service.actions).toEqual({});

		expect(broker.getLogger).toHaveBeenCalledTimes(1);
		expect(broker.getLogger).toHaveBeenCalledWith("v2.users", {
			svc: "users",
			ver: 2
		});

		expect(broker.callMiddlewareHookSync).toHaveBeenCalledTimes(2);
		expect(broker.callMiddlewareHookSync).toHaveBeenNthCalledWith(1, "serviceCreating", [service, schema]);
		expect(broker.callMiddlewareHookSync).toHaveBeenNthCalledWith(2, "serviceCreated", [service]);
	});

	it("check local properties with metadata", () => {
		schema.metadata = {
			scalable: true
		};
		let service = new Service(broker, schema);
		expect(service.name).toBe("users");
		expect(service.version).toBe(2);
		expect(service.settings).toBe(schema.settings);
		expect(service.metadata).toEqual({ scalable: true });
		expect(service.schema).toBe(schema);
		expect(service.broker).toBe(broker);

		expect(service.logger).toBeDefined();
		expect(service.actions).toEqual({});
	});

	it("check empty properties", () => {
		let service = new Service(broker, {
			name: "empty",
			mixins: [],
			dependencies: []
		});
		expect(service.name).toBe("empty");
		expect(service.broker).toBe(broker);
	});

	it("check logger with string version", () => {
		broker.getLogger.mockClear();
		const service = new Service(broker, {
			name: "posts",
			version: "stage"
		});
		expect(service.fullName).toBe("stage.posts");
		expect(broker.getLogger).toHaveBeenCalledTimes(1);
		expect(broker.getLogger).toHaveBeenCalledWith("stage.posts", {
			svc: "posts",
			ver: "stage"
		});
	});

	it("check logger with string version but disabled versionPrefix", () => {
		broker.getLogger.mockClear();
		const service = new Service(broker, {
			name: "posts",
			version: "stage",
			settings: {
				$noVersionPrefix: true
			}
		});
		expect(service.fullName).toBe("posts");
		expect(broker.getLogger).toHaveBeenCalledTimes(1);
		expect(broker.getLogger).toHaveBeenCalledWith("posts", {
			svc: "posts",
			ver: "stage"
		});
	});

	it("check logger without version", () => {
		broker.getLogger.mockClear();
		const service = new Service(broker, {
			name: "likes"
		});
		expect(service.fullName).toBe("likes");
		expect(broker.getLogger).toHaveBeenCalledTimes(1);
		expect(broker.getLogger).toHaveBeenCalledWith("likes", {
			svc: "likes",
			ver: undefined
		});
	});

});

describe("Test action creation", () => {
	let broker = new ServiceBroker({ logger: false, internalServices: false });
	broker.callMiddlewareHook = jest.fn();

	let schema = {
		name: "posts",
		actions: {
			find: jest.fn(),
			get: {
				cache: false,
				params: {
					id: "number"
				},
				handler: jest.fn()
			},
			noExist: false
		}
	};

	it("should register service & actions", () => {
		broker.addLocalService = jest.fn();

		const ep = {};
		broker.registry.createPrivateActionEndpoint = jest.fn(() => ep);

		let service = broker.createService(schema);

		expect(broker.registry.createPrivateActionEndpoint).toHaveBeenCalledTimes(2);

		expect(service).toBeDefined();

		expect(broker.addLocalService).toHaveBeenCalledTimes(1);
		expect(broker.addLocalService.mock.calls[0][0]).toBe(service);

		return service._start()
			.catch(protectReject)
			.then(() => {
				const spec = service._serviceSpecification;
				expect(spec).toEqual({
					name: "posts",
					version: undefined,
					fullName: "posts",
					settings: {},
					metadata: {},
					actions: {
						"posts.find": jasmine.any(Object),
						"posts.get": jasmine.any(Object)
					},
					events: {}
				});

				expect(service.actions.find).toBeDefined();
				expect(service.actions.get).toBeDefined();

				let ctx = new Context(broker);
				let oldCreate = broker.ContextFactory.create;
				broker.ContextFactory.create = jest.fn(() => ctx);

				service.actions.find({ a: 5 }, { timeout: 1000 });

				expect(broker.ContextFactory.create).toHaveBeenCalledTimes(1);
				expect(broker.ContextFactory.create).toHaveBeenCalledWith(broker, ep, { a: 5 }, { timeout: 1000 });

				expect(schema.actions.find).toHaveBeenCalledTimes(1);
				expect(schema.actions.find).toHaveBeenCalledWith(ctx);

				// ---
				broker.ContextFactory.create.mockClear();
				let prevCtx = new Context(broker, { action: service.schema.actions.get });
				prevCtx.setParams({ id: 10 });
				service.actions.get({ id: 20 }, { ctx: prevCtx });

				expect(broker.ContextFactory.create).toHaveBeenCalledTimes(0);

				expect(schema.actions.get.handler).toHaveBeenCalledTimes(1);
				expect(schema.actions.get.handler).toHaveBeenCalledWith(prevCtx);

				broker.ContextFactory.create = oldCreate;
			});

	});

	it("should throw error if action is neither object nor function", () => {
		expect(() => {
			broker.createService({
				name: "test",
				actions: {
					hello: 500
				}
			});
		}).toThrowError("Invalid action definition in 'hello' action in 'test' service!");
	});

});

describe("Test service start", () => {

	it("should start service with simple handler", () => {
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		broker.callMiddlewareHook = jest.fn();
		broker.registerLocalService = jest.fn();

		let schema = {
			name: "posts",
			started: jest.fn()
		};

		let service = broker.createService(schema);

		return service._start()
			.catch(protectReject)
			.then(() => {
				expect(schema.started).toHaveBeenCalledTimes(1);

				expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(2);
				expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(1, "serviceStarting", [service]);
				expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(2, "serviceStarted", [service]);

				expect(broker.registerLocalService).toHaveBeenCalledTimes(1);
				expect(broker.registerLocalService.mock.calls[0][0]).toBe(service._serviceSpecification);

			});
	});

	it("should start service with multiple handler", () => {
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		broker.callMiddlewareHook = jest.fn();
		broker.registerLocalService = jest.fn();

		let schema = {
			name: "posts",
			started: [jest.fn(), jest.fn()]
		};

		let service = broker.createService(schema);

		return service._start()
			.catch(protectReject)
			.then(() => {
				expect(schema.started[0]).toHaveBeenCalledTimes(1);
				expect(schema.started[1]).toHaveBeenCalledTimes(1);

				expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(2);
				expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(1, "serviceStarting", [service]);
				expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(2, "serviceStarted", [service]);

				expect(broker.registerLocalService).toHaveBeenCalledTimes(1);
				expect(broker.registerLocalService.mock.calls[0][0]).toBe(service._serviceSpecification);

			});

	});
});

describe("Test service stop", () => {

	it("should stop service with simple handler", () => {
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		broker.callMiddlewareHook = jest.fn();

		let schema = {
			name: "posts",
			stopped: jest.fn()
		};

		let service = broker.createService(schema);

		return service._start()
			.catch(protectReject)
			.then(() => {
				broker.callMiddlewareHook.mockClear();

				return service._stop()
					.catch(protectReject)
					.then(() => {
						expect(schema.stopped).toHaveBeenCalledTimes(1);

						expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(2);
						expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(1, "serviceStopping", [service], { reverse: true });
						expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(2, "serviceStopped", [service], { reverse: true });

					});
			});
	});

	it("should stop service with multiple handler", () => {
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		broker.callMiddlewareHook = jest.fn();

		let schema = {
			name: "posts",
			stopped: [jest.fn(), jest.fn()]
		};

		let service = broker.createService(schema);

		return service._start()
			.catch(protectReject)
			.then(() => {
				broker.callMiddlewareHook.mockClear();

				return service._stop()
					.catch(protectReject)
					.then(() => {
						expect(schema.stopped[0]).toHaveBeenCalledTimes(1);
						expect(schema.stopped[1]).toHaveBeenCalledTimes(1);

						expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(2);
						expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(1, "serviceStopping", [service], { reverse: true });
						expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(2, "serviceStopped", [service], { reverse: true });

					});
			});

	});
});

describe("Test events creation", () => {
	it("should register event handler to broker", () => {
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		broker.registerLocalService = jest.fn();
		broker.addLocalService = jest.fn();

		let service = broker.createService({
			name: "posts",
			events: {
				"user.*": jest.fn(),
				"posts.updated": {
					handler: jest.fn()
				}
			}
		});

		expect(service).toBeDefined();

		expect(broker.addLocalService).toHaveBeenCalledTimes(1);

		return service._start()
			.catch(protectReject)
			.then(() => {
				expect(broker.registerLocalService).toHaveBeenCalledTimes(1);
				expect(broker.registerLocalService.mock.calls[0][0]).toBe(service._serviceSpecification);

				const spec = service._serviceSpecification;
				expect(spec.events["posts.updated"]).toBeDefined();
				expect(spec.events["user.*"]).toBeDefined();
				expect(spec.actions).toEqual({});
			});
	});

	it("should register event handler with mixins", () => {
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		broker.addLocalService = jest.fn();
		broker.registerLocalService = jest.fn();

		let cb1 = jest.fn();
		let cb2 = jest.fn();
		let cb3 = jest.fn();
		let service = broker.createService({
			name: "posts",
			events: {
				"user.*": [cb1, ctx => cb2(ctx)],
				"posts.updated": {
					handler: cb3
				}
			}
		});

		expect(service).toBeDefined();

		expect(broker.addLocalService).toHaveBeenCalledTimes(1);
		return service._start()
			.catch(protectReject)
			.then(() => {
				expect(broker.registerLocalService).toHaveBeenCalledTimes(1);
				expect(broker.registerLocalService.mock.calls[0][0]).toBe(service._serviceSpecification);

				const spec = service._serviceSpecification;
				expect(spec.events["posts.updated"]).toBeDefined();
				expect(spec.events["user.*"]).toBeDefined();
				expect(spec.actions).toEqual({});

				const ctx = { params: { a: 5 }, nodeID: "node-123", eventName: "posts.updated" };
				spec.events["posts.updated"].handler(ctx);
				expect(cb3).toHaveBeenCalledTimes(1);
				expect(cb3).toHaveBeenCalledWith({ a: 5 }, "node-123", "posts.updated", ctx);

				spec.events["user.*"].handler(ctx);
				expect(cb1).toHaveBeenCalledTimes(1);
				expect(cb1).toHaveBeenCalledWith({ a: 5 }, "node-123", "posts.updated", ctx);

				expect(cb2).toHaveBeenCalledTimes(1);
				expect(cb2).toHaveBeenCalledWith(ctx);
			});
	});

	it("should throw error because no handler of event", () => {
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		expect(() => {
			broker.createService({
				name: "test",
				events: {
					"register.node": {}
				}
			});
		}).toThrowError("Missing event handler on 'register.node' event in 'test' service!");
	});
});

describe("Test methods creation", () => {
	it("should create method in Service instance", () => {
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		let service = broker.createService({
			name: "posts",
			methods: {
				something: jest.fn()
			}
		});

		expect(service).toBeDefined();
		expect(typeof service.something).toBe("function");

		service.something();

		expect(service.schema.methods.something).toHaveBeenCalledTimes(1);
	});

	it("should throw error because method name is reserved", () => {
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		expect(() => {
			broker.createService({
				name: "test",
				methods: {
					name: jest.fn()
				}
			});
		}).toThrowError("Invalid method name 'name' in 'test' service!");
	});
});

describe("Test created event handler", () => {
	let broker = new ServiceBroker({ logger: false, internalServices: false });

	let schema = {
		name: "posts",
		created: jest.fn()
	};

	it("should create method in Service instance", () => {
		broker.createService(schema);
		expect(schema.created).toHaveBeenCalledTimes(1);
	});
});

describe("Test _createAction function", () => {
	let broker = new ServiceBroker({ logger: false });

	const handler = jest.fn();

	it("should create action object with default values", () => {
		let service = broker.createService({ name: "users" });

		let action = service._createAction({ handler }, "find");
		expect(action.name).toBe("users.find");
		expect(action.rawName).toBe("find");
		expect(action.cache).toBe(false);
		expect(action.handler).toBeInstanceOf(Function);
		expect(action.service).toBe(service);
	});

	it("should create action with version number", () => {
		let service = broker.createService({ name: "users", version: 3 });

		let action = service._createAction({ handler, myProp: "teszt" }, "find");
		expect(action.name).toBe("v3.users.find");
		expect(action.rawName).toBe("find");
		expect(action.myProp).toBe("teszt");
	});

	it("should create action with version 0", () => {
		let service = broker.createService({ name: "users", version: 0 });

		let action = service._createAction({ handler }, "find");
		expect(action.name).toBe("v0.users.find");
		expect(action.rawName).toBe("find");
	});

	it("should create action with version string", () => {
		let service = broker.createService({ name: "users", version: "staging" });

		let action = service._createAction({ handler }, "find");
		expect(action.name).toBe("staging.users.find");
		expect(action.rawName).toBe("find");
	});

	it("should create action without version", () => {
		let service = broker.createService({ name: "users", version: 2, settings: { $noVersionPrefix: true } });

		let action = service._createAction({ handler }, "find");
		expect(action.name).toBe("users.find");
		expect(action.rawName).toBe("find");
	});

	it("should create action with different name", () => {
		let service = broker.createService({ name: "users" });

		let action = service._createAction({ handler, name: "list" }, "find");
		expect(action.name).toBe("users.list");
		expect(action.rawName).toBe("list");
	});

	it("should create action without service name", () => {
		let service = broker.createService({
			name: "users",
			settings: {
				$noServiceNamePrefix: true
			}
		});

		let action = service._createAction({ handler }, "find");
		expect(action.name).toBe("find");
		expect(action.rawName).toBe("find");
	});


	it("should throw Error if no handler", () => {
		let service = broker.createService({ name: "users" });

		expect(() => service._createAction({}, "find")).toThrowError("Missing action handler on 'find' action in 'users' service!");
	});

	describe("Test action cache property", () => {

		it("cache is FALSE, if schema cache is UNDEFINED and action cache is UNDEFINED", () => {
			let service = broker.createService({ name: "test" });
			let action = service._createAction({ handler }, "find");

			expect(action.cache).toBe(false);
		});

		it("cache is TRUE, if schema cache is TRUE and action cache UNDEFINED", () => {
			let service = broker.createService({ name: "test", settings: { $cache: true } });
			let action = service._createAction({ handler }, "find");

			expect(action.cache).toBe(true);
		});

		it("cache is FALSE, if schema cache is TRUE and action cache is FALSE", () => {
			let service = broker.createService({ name: "test", settings: { $cache: true } });
			let action = service._createAction({ handler, cache: false }, "find");

			expect(action.cache).toBe(false);
		});

		it("cache is TRUE, if schema cache is UNDEFINED and action cache is TRUE", () => {
			let service = broker.createService({ name: "test" });
			let action = service._createAction({ handler, cache: true }, "find");

			expect(action.cache).toBe(true);
		});

		it("cache is TRUE, if schema cache is UNDEFINED and action cache is Object", () => {
			let service = broker.createService({ name: "test" });
			let action = service._createAction({ handler, cache: {} }, "find");

			expect(action.cache).toEqual({});
		});

		it("cache is TRUE, if schema cache is FALSE and action cache is TRUE", () => {
			let service = broker.createService({ name: "test", settings: { $cache: false } });
			let action = service._createAction({ handler, cache: true }, "find");

			expect(action.cache).toBe(true);
		});

		it("cache is TRUE, if schema cache is TRUE and action cache is TRUE", () => {
			let service = broker.createService({ name: "test", settings: { $cache: true } });
			let action = service._createAction({ handler, cache: true }, "find");

			expect(action.cache).toBe(true);
		});

		it("cache is TRUE, if schema cache is TRUE and action cache is Object", () => {
			let service = broker.createService({ name: "test", settings: { $cache: true } });
			let action = service._createAction({ handler, cache: { keys: [ "id" ] } }, "find");

			expect(action.cache).toEqual({ keys: [ "id" ] });
		});

	});
});


describe("Test constructor with mixins", () => {
	let broker = new ServiceBroker({ logger: false });

	let mixin1 = { name: "mixin1" };
	let mixin2 = { name: "mixin2" };

	let schema = {
		name: "posts",
		mixins: [
			mixin1,
			mixin2
		]
	};

	it("should call applyMixins with schema", () => {
		let oldApply = Service.applyMixins;
		Service.applyMixins = jest.fn(schema => schema);

		new Service(broker, schema);

		expect(Service.applyMixins).toHaveBeenCalledTimes(1);
		expect(Service.applyMixins).toHaveBeenCalledWith(schema);

		Service.applyMixins = oldApply;
	});
});

describe("Test lifecycle event handlers", () => {
	describe("with simple handlers", () => {

		let broker = new ServiceBroker({ logger: false });

		let schema = {
			name: "simple",

			created: jest.fn(),
			started: jest.fn(),
			stopped: jest.fn()
		};

		it("should called created", () => {
			broker.createService(schema);

			expect(schema.created).toHaveBeenCalledTimes(1);

			return broker.start();
		});

		it("should called started", () => {
			expect(schema.started).toHaveBeenCalledTimes(1);

			return broker.stop();
		});

		it("should called stopped", () => {
			expect(schema.stopped).toHaveBeenCalledTimes(1);
		});
	});

	describe("with multiple handlers (from mixins)", () => {

		let broker = new ServiceBroker({ logger: false });

		let FLOW = [];

		let createdFn1 = jest.fn(() => FLOW.push("C1"));
		let createdFn2 = jest.fn(() => FLOW.push("C2"));

		let startedFn1 = jest.fn(() => FLOW.push("A1"));
		let startedFn2 = jest.fn(() => FLOW.push("A2"));

		let stoppedFn1 = jest.fn(() => FLOW.push("O1"));
		let stoppedFn2 = jest.fn(() => FLOW.push("O2"));

		let schema = {
			name: "simple",

			created: [
				createdFn1,
				createdFn2
			],
			started: [
				startedFn1,
				startedFn2
			],
			stopped: [
				stoppedFn1,
				stoppedFn2
			],
		};

		it("should called created", () => {
			broker.createService(schema);

			expect(createdFn1).toHaveBeenCalledTimes(1);
			expect(createdFn2).toHaveBeenCalledTimes(1);

			return broker.start();
		});

		it("should called started", () => {
			expect(startedFn1).toHaveBeenCalledTimes(1);
			expect(startedFn2).toHaveBeenCalledTimes(1);

			return broker.stop();
		});

		it("should called stopped", () => {
			expect(stoppedFn1).toHaveBeenCalledTimes(1);
			expect(stoppedFn2).toHaveBeenCalledTimes(1);

			expect(FLOW.join("-")).toBe("C1-C2-A1-A2-O2-O1");
		});
	});

});

describe("Test broker.waitForServices", () => {
	let broker = new ServiceBroker({ logger: false });
	broker.waitForServices = jest.fn();

	it("should call waitForServices", () => {
		let svc = broker.createService({
			name: "test",
			created() {
				this.waitForServices("posts", 5000, 500);
			}
		});
		expect(broker.waitForServices).toHaveBeenCalledTimes(1);
		expect(broker.waitForServices).toHaveBeenCalledWith("posts", 5000, 500, svc.logger);
	});

});

describe("Test dependencies", () => {

	describe("with one dependency", () => {

		let broker = new ServiceBroker({ logger: false });

		let schema = {
			name: "simple",
			dependencies: "math",

			created: jest.fn(),
			started: jest.fn()
		};
		let svc;

		it("should called created", () => {
			svc = broker.createService(schema);
			svc.waitForServices = jest.fn(() => Promise.resolve());

			expect(schema.created).toHaveBeenCalledTimes(1);

			return broker.start();
		});

		it("should called started", () => {
			expect(schema.started).toHaveBeenCalledTimes(1);
			expect(svc.waitForServices).toHaveBeenCalledTimes(1);
			expect(svc.waitForServices).toHaveBeenCalledWith("math", 0);

			return broker.stop();
		});
	});

	describe("with multi dependency & $dependencyTimeout ", () => {

		let broker = new ServiceBroker({ logger: false });

		let schema = {
			name: "simple",
			dependencies: [
				{ name: "math" },
				{ name: "test", version: 2 }
			],
			settings: {
				$dependencyTimeout: 5000
			},
			started: jest.fn()
		};
		let svc;

		it("should called created", () => {
			svc = broker.createService(schema);
			svc.waitForServices = jest.fn(() => Promise.resolve());
			return broker.start();
		});

		it("should called started", () => {
			expect(schema.started).toHaveBeenCalledTimes(1);
			expect(svc.waitForServices).toHaveBeenCalledTimes(1);
			expect(svc.waitForServices).toHaveBeenCalledWith(schema.dependencies, 5000);

			return broker.stop();
		});
	});

});


describe("Test applyMixins", () => {
	let mixin1 = { name: "mixin1" };
	let mixin2 = { name: "mixin2" };
	let mixin3 = { name: "mixin3", mixins: mixin2 };

	const oldMerge = Service.mergeSchemas;
	beforeAll(() => Service.mergeSchemas = jest.fn(s1 => s1));
	afterAll(() => Service.mergeSchemas = oldMerge);

	it("should call Service.mergeSchemas with mixins", () => {
		Service.mergeSchemas.mockClear();
		let schema = {
			name: "posts",
			mixins: [
				mixin1,
				mixin2
			]
		};
		Service.applyMixins(schema);

		expect(Service.mergeSchemas).toHaveBeenCalledTimes(2);
		expect(Service.mergeSchemas).toHaveBeenCalledWith(mixin2, mixin1);
		expect(Service.mergeSchemas).toHaveBeenCalledWith(mixin2, schema);
	});

	it("should call Service.mergeSchemas with mixin", () => {
		Service.mergeSchemas.mockClear();
		let schema = {
			name: "posts",
			mixins: mixin2
		};
		Service.applyMixins(schema);

		expect(Service.mergeSchemas).toHaveBeenCalledTimes(1);
		expect(Service.mergeSchemas).toHaveBeenCalledWith(mixin2, schema);
	});

	it("should call Service.mergeSchemas with two level mixins", () => {
		Service.mergeSchemas.mockClear();
		let schema = {
			name: "posts",
			mixins: mixin3
		};
		Service.applyMixins(schema);

		expect(Service.mergeSchemas).toHaveBeenCalledTimes(2);
		expect(Service.mergeSchemas).toHaveBeenCalledWith(mixin2, mixin3);
		expect(Service.mergeSchemas).toHaveBeenCalledWith(mixin2, schema);
	});
});

describe("Test mergeSchemas", () => {

	it("should merge two schemas", () => {

		let origSchema = {
			name: "posts",
			settings: {
				a: 5,
				b: "10",
				nested: {
					id: 10
				},
				array: [
					"first"
				]
			},

			dependencies: [
				"posts",
				"users"
			],

			metadata: {
				a: "a",
				b: 33,
				d: true,
				nested: {
					old: 1,
					tag: "old"
				}
			},

			actions: {
				get() {},
				find() {},
				list: {
					cache: {
						keys: ["id"]
					},
					handler() {}
				},
				create() {},
				update: {
					use: [],
					handler() {

					}
				},
				clean() {}
			},

			events: {
				"created"() {},
				"updated"() {},
				"removed": {
					group: "mail",
					handler: () => {}
				},
				"inserted"() {}
			},

			methods: {
				getByID() {},
				notify() {}
			},

			created: jest.fn(),
			started: jest.fn(),
			stopped: jest.fn()
		};

		let newSchema = {
			name: "users",
			version: 2,
			settings: {
				b: 100,
				c: true,
				nested: {
					name: "John"
				},
				array: [
					"second",
					"third"
				]
			},

			dependencies: "math",

			metadata: {
				a: "aaa",
				b: 25,
				c: "metadata",
				nested: {
					tag: "new",
					res: "test"
				}
			},

			actions: {
				find: {
					cache: false,
					handler() {}
				},
				list() {},
				create: {
					cache: {
						keys: ["id"]
					}
				},
				update() {
				},
				remove() {},
				clean: false
			},

			events: {
				"created"() {},
				"removed"() {},
				"cleared"() {},
				"inserted": {
					group: "payment",
					handler: () => {}
				},
			},

			methods: {
				getByID() {},
				checkPermission() {}
			},

			created: jest.fn(),
			started: jest.fn(),
			stopped: jest.fn(),

			customProp: "test"
		};

		let res = Service.mergeSchemas(origSchema, newSchema);

		expect(res).toBeDefined();
		expect(res.name).toBe("users");
		expect(res.version).toBe(2);
		expect(res.settings).toEqual({
			a: 5,
			b: 100,
			c: true,
			nested: {
				id: 10,
				name: "John"
			},
			array: [
				"second",
				"third"
			]
		});
		expect(res.metadata).toEqual({
			a: "aaa",
			b: 25,
			c: "metadata",
			d: true,
			nested: {
				old: 1,
				tag: "new",
				res: "test"
			}
		});
		expect(res.dependencies).toEqual(["math", "posts", "users"]);

		// Actions
		expect(res.actions.get).toBe(origSchema.actions.get);
		expect(res.actions.find.handler).toBe(newSchema.actions.find.handler);
		expect(res.actions.find.cache).toBe(false);
		expect(res.actions.list.handler).toBe(newSchema.actions.list);
		expect(res.actions.remove.handler).toBe(newSchema.actions.remove);
		expect(res.actions.clean).toBeUndefined();

		// Merge action definition
		expect(res.actions.create).toEqual({
			cache: {
				keys: ["id"]
			},
			handler: origSchema.actions.create
		});
		expect(res.actions.create.handler).toBe(origSchema.actions.create);

		expect(res.actions.update).toEqual({
			use: [],
			handler: newSchema.actions.update
		});
		expect(res.actions.update.handler).toBe(newSchema.actions.update);

		// Events
		expect(res.events.created.handler).toBeInstanceOf(Array);
		expect(res.events.created.handler[0]).toBe(origSchema.events.created);
		expect(res.events.created.handler[1]).toBe(newSchema.events.created);

		expect(res.events.updated).toBe(origSchema.events.updated);

		expect(res.events.removed.handler).toBeInstanceOf(Array);
		expect(res.events.removed.handler[0]).toBe(origSchema.events.removed.handler);
		expect(res.events.removed.handler[1]).toBe(newSchema.events.removed);
		expect(res.events.removed.group).toBe("mail");

		expect(res.events.cleared.handler[0]).toBe(newSchema.events.cleared);

		expect(res.events.inserted.handler).toBeInstanceOf(Array);
		expect(res.events.inserted.handler[0]).toBe(origSchema.events.inserted);
		expect(res.events.inserted.handler[1]).toBe(newSchema.events.inserted.handler);
		expect(res.events.inserted.group).toBe("payment");

		// Methods
		expect(res.methods.getByID).toBe(newSchema.methods.getByID);
		expect(res.methods.notify).toBe(origSchema.methods.notify);
		expect(res.methods.checkPermission).toBe(newSchema.methods.checkPermission);

		// Lifecycle handlers
		expect(res.created).toBeInstanceOf(Array);
		expect(res.started).toBeInstanceOf(Array);
		expect(res.stopped).toBeInstanceOf(Array);

		expect(res.created[0]).toBe(origSchema.created);
		expect(res.created[1]).toBe(newSchema.created);

		expect(res.started[0]).toBe(origSchema.started);
		expect(res.started[1]).toBe(newSchema.started);

		expect(res.stopped[0]).toBe(origSchema.stopped);
		expect(res.stopped[1]).toBe(newSchema.stopped);

		expect(res.customProp).toBe("test");

	});

	it("should concat lifecycle events", () => {

		let origSchema = {
			created: jest.fn(),
			started: jest.fn()
		};

		let newSchema = {
			created: jest.fn(),
			stopped: jest.fn()
		};

		let res = Service.mergeSchemas(origSchema, newSchema);

		expect(res).toBeDefined();

		expect(res.created).toBeInstanceOf(Array);
		expect(res.created.length).toBe(2);
		expect(res.created[0]).toBe(origSchema.created);
		expect(res.created[1]).toBe(newSchema.created);

		expect(res.started).toBe(origSchema.started);

		expect(res.stopped).toBeInstanceOf(Array);
		expect(res.stopped.length).toBe(1);
		expect(res.stopped[0]).toBe(newSchema.stopped);

	});

	describe("merge schemas with unique dependencies", () => {
		it("should merge dependencies defined in shorthand notation", () => {
			const origSchema = {
				dependencies: ["users", "mail"]
			};
			const mixinSchema = {
				dependencies: ["users", "posts"]
			};

			const result = Service.mergeSchemas(origSchema, mixinSchema);
			expect(result.dependencies).toEqual(["users", "posts", "mail"]);
		});

		it("should merge versioned dependencies", () => {
			const origSchema = {
				dependencies: [{ name: "users", version: 1 }, { name: "mail", version: "staging" }]
			};
			const mixinSchema = {
				dependencies: [{ name: "users", version: 1 }, { name: "posts", version: "v2" }]
			};

			const result = Service.mergeSchemas(origSchema, mixinSchema);
			expect(result.dependencies).toEqual([{ name: "users", version: 1 }, { name: "posts", version: "v2" }, { name: "mail", version: "staging" }]);
		});

		it("should merge mixed", () => {
			const origSchema = {
				dependencies: [{ name: "users", version: 1 }, "mail"]
			};
			const mixinSchema = {
				dependencies: ["users", { name: "posts", version: "v2" }]
			};

			const result = Service.mergeSchemas(origSchema, mixinSchema);
			expect(result.dependencies).toEqual(["users", { name: "posts", version: "v2" }, { name: "users", version: 1 }, "mail"]);
		});

	});

});


describe("Test $secureSettings", () => {

	let schema = {
		name: "demo",
		settings: {
			jwtSecret: "12345",
			other: "some",
			topSecret: {
				name: "John",
				password: "password",
				age: 33
			}
		},
	};

	let broker;

	function createService(schema) {
		broker = new ServiceBroker({ logger: false });
		const svc = broker.createService(schema);
		return broker.start().then(() => svc);
	}

	afterEach(() => broker ? broker.stop() : null);

	it("should leave all settings", () => {
		return createService(schema).catch(protectReject).then(svc => {
			expect(svc.settings).toEqual({
				jwtSecret: "12345",
				other: "some",
				topSecret: {
					name: "John",
					password: "password",
					age: 33
				}
			});

			const list = broker.registry.services.list({ onlyLocal: true, skipInternal: true });
			expect(list[0].settings).toEqual({
				jwtSecret: "12345",
				other: "some",
				topSecret: {
					name: "John",
					password: "password",
					age: 33
				}
			});
		});
	});

	it("should omit protected settings", () => {
		schema.settings.$secureSettings = ["jwtSecret", "topSecret"];

		return createService(schema).catch(protectReject).then(svc => {
			expect(svc.settings).toEqual({
				$secureSettings: ["jwtSecret", "topSecret"],
				jwtSecret: "12345",
				other: "some",
				topSecret: {
					name: "John",
					password: "password",
					age: 33
				}
			});

			const list = broker.registry.services.list({ onlyLocal: true, skipInternal: true });
			expect(list[0].settings).toEqual({
				other: "some"
			});
		});
	});

	it("should omit protected nested settings", () => {
		schema.settings.$secureSettings = ["jwtSecret", "topSecret.password"];

		return createService(schema).catch(protectReject).then(svc => {
			expect(svc.settings).toEqual({
				$secureSettings: ["jwtSecret", "topSecret.password"],
				jwtSecret: "12345",
				other: "some",
				topSecret: {
					name: "John",
					password: "password",
					age: 33
				}
			});

			const list = broker.registry.services.list({ onlyLocal: true, skipInternal: true });
			expect(list[0].settings).toEqual({
				other: "some",
				topSecret: {
					name: "John",
					age: 33
				}
			});
		});
	});

	it("should merge $secureSettings from mixins & omit protected settings", () => {
		schema.mixins = [{
			settings: {
				$secureSettings: ["topSecret.password"]
			}
		}];
		schema.settings.$secureSettings = ["jwtSecret"];

		return createService(schema).catch(protectReject).then(svc => {
			expect(svc.settings).toEqual({
				$secureSettings: ["jwtSecret", "topSecret.password"],
				jwtSecret: "12345",
				other: "some",
				topSecret: {
					name: "John",
					password: "password",
					age: 33
				}
			});

			const list = broker.registry.services.list({ onlyLocal: true, skipInternal: true });
			expect(list[0].settings).toEqual({
				other: "some",
				topSecret: {
					name: "John",
					age: 33
				}
			});
		});
	});

	it("should handle undefined settings", () => {
		delete schema.settings;
		delete schema.mixins;

		return createService(schema).catch(protectReject).then(svc => {
			expect(svc.settings).toEqual({});

			const list = broker.registry.services.list({ onlyLocal: true, skipInternal: true });
			expect(list[0].settings).toEqual({});
		});
	});

	it("should handle undefined & defined settings #1", () => {
		schema.settings = {};
		delete schema.mixins;

		return createService(schema).catch(protectReject).then(svc => {
			expect(svc.settings).toEqual({});

			const list = broker.registry.services.list({ onlyLocal: true, skipInternal: true });
			expect(list[0].settings).toEqual({});
		});
	});

	it("should handle undefined & defined settings #1", () => {
		delete schema.settings;
		schema.mixins = {};

		return createService(schema).catch(protectReject).then(svc => {
			expect(svc.settings).toEqual({});

			const list = broker.registry.services.list({ onlyLocal: true, skipInternal: true });
			expect(list[0].settings).toEqual({});
		});
	});
});

/*
describe("Test currentContext", () => {

	it("should call broker methods", () => {
		const broker = new ServiceBroker({ logger: false, internalServices: false });
		const ctx = new Context(broker);
		broker.getCurrentContext = jest.fn(() => ctx);
		broker.setCurrentContext = jest.fn();

		const schema = {
			name: "posts"
		};

		const service = broker.createService(schema);

		return service._start()
			.catch(protectReject)
			.then(() => {
				service.currentContext = ctx;

				expect(broker.setCurrentContext).toHaveBeenCalledTimes(1);
				expect(broker.setCurrentContext).toHaveBeenCalledWith(ctx);

				let res = service.currentContext;
				expect(res).toBe(ctx);
				expect(broker.getCurrentContext).toHaveBeenCalledTimes(1);
				expect(broker.getCurrentContext).toHaveBeenCalledWith();
			});
	});
});
*/
