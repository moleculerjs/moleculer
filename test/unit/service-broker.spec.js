/*eslint-disable no-console */
"use strict";

const kleur = require("kleur");
kleur.enabled = false;

const H = require("../../src/health");
H.getHealthStatus = jest.fn();

const C = require("../../src/constants");

let polyfillPromise;
jest.mock("../../src/utils", () => ({
	getNodeID() {
		return "node-1234";
	},
	generateToken: jest.fn(() => "1"),
	humanize() {
		return "1";
	},
	getIpList() {
		return [];
	},
	safetyObject(obj) {
		return obj;
	},
	isPromise(p) {
		return p && p.then != null;
	},
	isObject(o) {
		return o !== null && typeof o === "object";
	},
	isPlainObject(o) {
		return o != null
			? Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null
			: false;
	},
	isFunction(fn) {
		return typeof fn === "function";
	},
	isString(s) {
		return typeof s === "string";
	},
	polyfillPromise(p) {
		return polyfillPromise(p);
	},
	functionArguments() {
		return ["ctx"];
	},
	deprecate() {},
	uniq(arr) {
		return [...new Set(arr)];
	},
	randomInt() {
		return 2;
	}
}));
polyfillPromise = jest.requireActual("../../src/utils").polyfillPromise;

const utils = require("../../src/utils");
utils.removeFromArray = jest.requireActual("../../src/utils").removeFromArray;
utils.promiseAllControl = jest.requireActual("../../src/utils").promiseAllControl;
utils.getConstructorName = jest.requireActual("../../src/utils").getConstructorName;
utils.isInheritedClass = jest.requireActual("../../src/utils").isInheritedClass;

const { protectReject } = require("./utils");
const path = require("path");
const _ = require("lodash");
const lolex = require("@sinonjs/fake-timers");
const ServiceBroker = require("../../src/service-broker");
const Service = require("../../src/service");
const LoggerFactory = require("../../src/logger-factory");
const Registry = require("../../src/registry");
const Context = require("../../src/context");
const Transit = require("../../src/transit");
const Cachers = require("../../src/cachers");
const Serializers = require("../../src/serializers");
const Validators = require("../../src/validators");
const Transporters = require("../../src/transporters");
const Strategies = require("../../src/strategies");
const MiddlewareHandler = require("../../src/middleware");
const {
	MoleculerError,
	MoleculerServerError,
	ServiceNotFoundError,
	ServiceNotAvailableError,
	Regenerator
} = require("../../src/errors");

jest.spyOn(Registry.prototype, "init");

describe("Test ServiceBroker constructor", () => {
	let broker;

	afterEach(async () => {
		await broker.stop();
	});

	it("should set default options", () => {
		console.log = jest.fn();
		Registry.prototype.init.mockClear();

		broker = new ServiceBroker();
		expect(broker).toBeDefined();
		expect(broker.options).toEqual(ServiceBroker.defaultOptions);

		expect(broker.Promise).toBe(Promise);
		expect(ServiceBroker.Promise).toBe(Promise);

		expect(broker.ServiceFactory).toBe(Service);
		expect(broker.ContextFactory).toBe(Context);

		expect(broker.namespace).toBe("");
		expect(broker.nodeID).toBe("node-1234");
		expect(broker.instanceID).toBe("1");

		expect(broker.loggerFactory).toBeInstanceOf(LoggerFactory);
		expect(broker.logger).toBeDefined();

		expect(broker.metadata).toEqual({});

		expect(broker.localBus).toBeDefined();

		//expect(broker.scope).toBeDefined();

		expect(broker.metrics).toBeDefined();
		expect(broker.tracer).toBeDefined();

		expect(broker.services).toBeInstanceOf(Array);

		expect(broker.registry).toBeInstanceOf(Registry);
		expect(broker.registry.init).toBeCalledTimes(1);
		expect(broker.registry.init).toBeCalledWith(broker);

		expect(broker.middlewares).toBeInstanceOf(MiddlewareHandler);

		expect(broker.cacher).toBeNull();
		expect(broker.serializer).toBeInstanceOf(Serializers.JSON);
		expect(broker.validator).toBeInstanceOf(Validators.Fastest);
		expect(broker.errorRegenerator).toBeInstanceOf(Regenerator);
		expect(broker.transit).toBeUndefined();

		expect(broker.getLocalService("$node")).toBeDefined();

		expect(ServiceBroker.defaultOptions).toBeDefined();
		expect(ServiceBroker.MOLECULER_VERSION).toBeDefined();
		expect(broker.MOLECULER_VERSION).toBeDefined();

		expect(broker.call).not.toBe(broker.callWithoutBalancer);
	});

	it("should merge options", () => {
		broker = new ServiceBroker({
			namespace: "test",
			nodeID: "server-12",
			transporter: null,
			heartbeatTimeout: 25,
			logger: {
				type: "Console",
				options: {
					level: "error",
					formatter: "simple"
				}
			},
			retryPolicy: {
				enabled: true,
				retries: 3
			},
			contextParamsCloning: true,
			maxCallLevel: 10,
			requestTimeout: 5000,

			tracking: {
				enabled: true
			},

			metrics: {
				enabled: true
			},

			tracing: {
				enabled: true
			},

			errorHandler: err => console.log(err),

			disableBalancer: true,
			registry: {
				strategy: Strategies.Random,
				preferLocal: false
			},
			circuitBreaker: {
				enabled: true,
				threshold: 0.3,
				minRequestCount: 10
			},
			bulkhead: {
				enabled: true,
				concurrency: 2
			},
			validator: false,
			internalServices: false,
			hotReload: true,

			metadata: {
				region: "eu-west1"
			}
		});

		expect(broker).toBeDefined();
		expect(broker.options).toEqual({
			namespace: "test",
			nodeID: "server-12",
			logger: {
				type: "Console",
				options: {
					level: "error",
					formatter: "simple"
				}
			},
			logLevel: null,
			errorRegenerator: null,
			cacher: null,
			serializer: null,
			transporter: null,
			heartbeatTimeout: 25,
			heartbeatInterval: 10,
			tracking: {
				enabled: true,
				shutdownTimeout: 5000
			},

			errorHandler: expect.any(Function),

			metrics: {
				enabled: true
			},

			tracing: {
				enabled: true
			},

			disableBalancer: true,
			registry: {
				strategy: Strategies.Random,
				preferLocal: false,
				stopDelay: 100
			},

			circuitBreaker: {
				enabled: true,
				threshold: 0.3,
				windowTime: 60,
				minRequestCount: 10,
				halfOpenTime: 10 * 1000,
				check: expect.any(Function)
			},

			bulkhead: {
				enabled: true,
				concurrency: 2,
				maxQueueSize: 100
			},

			transit: {
				disableReconnect: false,
				maxQueueSize: 50 * 1000,
				maxChunkSize: 262144,
				disableVersionCheck: false
			},

			uidGenerator: null,

			retryPolicy: {
				enabled: true,
				retries: 3,
				delay: 100,
				maxDelay: 1000,
				factor: 2,
				check: expect.any(Function)
			},
			requestTimeout: 5000,
			maxCallLevel: 10,
			maxSafeObjectSize: null,
			contextParamsCloning: true,
			validator: false,
			internalServices: false,
			internalMiddlewares: true,
			dependencyInterval: 1000,
			dependencyTimeout: 0,
			hotReload: true,
			middlewares: null,
			replCommands: null,
			replDelimiter: null,
			metadata: {
				region: "eu-west1"
			},

			skipProcessEventRegistration: false
		});

		expect(broker.services).toBeInstanceOf(Array);
		expect(broker.registry).toBeInstanceOf(Registry);
		expect(broker.transit).toBeUndefined();
		expect(broker.validator).toBeUndefined();
		expect(broker.serializer).toBeInstanceOf(Serializers.JSON);
		expect(broker.namespace).toBe("test");
		expect(broker.nodeID).toBe("server-12");
		expect(broker.instanceID).toBe("1");
		expect(broker.metadata).toEqual({
			region: "eu-west1"
		});

		expect(broker.call).toBe(broker.callWithoutBalancer);

		expect(broker.getLocalService("$node")).not.toBeDefined();
	});

	it("should create transit if transporter into options", () => {
		broker = new ServiceBroker({
			logger: false,
			transporter: "Fake"
		});

		expect(broker).toBeDefined();
		expect(broker.transit).toBeInstanceOf(Transit);
		expect(broker.nodeID).toBe("node-1234");
	});

	it("should create cacher and call init", () => {
		let cacher = new Cachers.Memory();
		cacher.init = jest.fn();
		broker = new ServiceBroker({
			logger: false,
			cacher
		});

		expect(broker).toBeDefined();
		expect(broker.cacher).toBe(cacher);
		expect(cacher.init).toHaveBeenCalledTimes(1);
		expect(cacher.init).toHaveBeenCalledWith(broker);
	});

	it("should create errorRegenerator and call init", () => {
		let errorRegenerator = new Regenerator();
		errorRegenerator.init = jest.fn();
		broker = new ServiceBroker({
			logger: false,
			errorRegenerator
		});

		expect(broker).toBeDefined();
		expect(broker.errorRegenerator).toBe(errorRegenerator);
		expect(errorRegenerator.init).toHaveBeenCalledTimes(1);
		expect(errorRegenerator.init).toHaveBeenCalledWith(broker);
	});

	it("should set serializer and call init", () => {
		let serializer = new Serializers.JSON();
		serializer.init = jest.fn();
		broker = new ServiceBroker({
			logger: false,
			serializer
		});

		expect(broker).toBeDefined();
		expect(broker.serializer).toBe(serializer);
		expect(serializer.init).toHaveBeenCalledTimes(1);
		expect(serializer.init).toHaveBeenCalledWith(broker);
	});

	it("should set validator", () => {
		broker = new ServiceBroker({ logger: false });
		expect(broker.validator).toBeInstanceOf(Validators.Fastest);
		broker.stop();

		broker = new ServiceBroker({ logger: false, validator: true });
		expect(broker.validator).toBeInstanceOf(Validators.Fastest);
		broker.stop();
	});

	it("should not set validator", () => {
		broker = new ServiceBroker({ logger: false, validator: false });
		expect(broker.validator).toBeUndefined();
		broker.stop();

		broker = new ServiceBroker({ logger: false, validator: null });
		expect(broker.validator).toBeUndefined();
		broker.stop();
	});

	it("should disable balancer if transporter has no built-in balancer", () => {
		broker = new ServiceBroker({
			logger: false,
			transporter: "Fake",
			disableBalancer: true
		});

		expect(broker.options.disableBalancer).toBe(true);
	});

	it("should not disable balancer if transporter has no built-in balancer", () => {
		let tx = new Transporters.Fake();
		tx.hasBuiltInBalancer = false;

		broker = new ServiceBroker({
			logger: false,
			transporter: tx,
			disableBalancer: true
		});

		expect(broker.options.disableBalancer).toBe(false);
	});

	it("should call lifecycle handlers", () => {
		let created = jest.fn();
		let started = jest.fn();
		let stopped = jest.fn();

		broker = new ServiceBroker({
			logger: false,
			created,
			started,
			stopped
		});

		expect(created).toHaveBeenCalledTimes(1);
		expect(created).toHaveBeenCalledWith(broker);
		expect(started).toHaveBeenCalledTimes(0);
		expect(stopped).toHaveBeenCalledTimes(0);

		return broker.start().then(() => {
			expect(created).toHaveBeenCalledTimes(1);
			expect(started).toHaveBeenCalledTimes(1);
			expect(started).toHaveBeenCalledWith(broker);
			expect(stopped).toHaveBeenCalledTimes(0);

			return broker.stop().then(() => {
				expect(created).toHaveBeenCalledTimes(1);
				expect(started).toHaveBeenCalledTimes(1);
				expect(stopped).toHaveBeenCalledTimes(1);
				expect(stopped).toHaveBeenCalledWith(broker);
			});
		});
	});

	it("should load internal middlewares", () => {
		broker = new ServiceBroker({
			logger: false
		});

		expect(broker.middlewares.count()).toBe(13);
	});

	it("should not load internal middlewares", () => {
		broker = new ServiceBroker({
			logger: false,
			internalMiddlewares: false
		});

		expect(broker.middlewares.count()).toBe(0);
	});

	it("should load user middlewares", () => {
		let mw1 = { localAction: jest.fn(handler => handler) };
		let mw2 = { localAction: jest.fn(handler => handler) };
		broker = new ServiceBroker({
			logger: false,
			internalMiddlewares: false,
			middlewares: [
				mw1,
				function () {
					return mw2;
				}
			]
		});

		expect(broker.middlewares.count()).toBe(2);
		expect(mw1.localAction).toHaveBeenCalledTimes(7);
		expect(mw2.localAction).toHaveBeenCalledTimes(7);
	});

	it("should register internal middlewares", () => {
		broker = new ServiceBroker({
			logger: false,
			cacher: "memory",
			requestTimeout: 5000,
			trackContext: true,
			circuitBreaker: {
				enabled: true
			},
			retryPolicy: {
				enabled: true
			}
		});

		expect(broker.middlewares.count()).toBe(14);
	});

	it("should register moleculer metrics", () => {
		broker = new ServiceBroker({
			logger: false,
			metrics: false
		});

		const mockSet = jest.fn();
		broker.metrics.register = jest.fn(() => ({ set: mockSet }));

		broker.registerMoleculerMetrics();

		expect(broker.metrics.register).toHaveBeenCalledTimes(0);

		broker.isMetricsEnabled = jest.fn(() => true);
		broker.registerMoleculerMetrics();

		expect(broker.metrics.register).toHaveBeenCalledTimes(7);
		expect(mockSet).toHaveBeenCalledTimes(7);
	});
});

describe("Test broker.start", () => {
	describe("without transporter", () => {
		let schema;
		let optStarted;
		let broker;
		let svc;

		beforeEach(() => {
			schema = {
				name: "test",
				started: jest.fn(() => Promise.resolve())
			};

			optStarted = jest.fn();
			broker = new ServiceBroker({
				logger: false,
				transporter: null,
				started: optStarted
			});

			svc = broker.createService(schema);
		});

		it("should call started of services, created whilst starting an initial service", async () => {
			const shouldBeCalled = jest.fn();
			const serviceStartingOthers = broker.createService({
				name: "test",
				started: () => {
					broker.createService({
						name: "test",
						started: shouldBeCalled
					});
					broker.waitForServices("test");
					// do something
				}
			});
			broker.broadcastLocal = jest.fn();
			broker.metrics.set = jest.fn();
			broker.callMiddlewareHook = jest.fn();
			broker.registry.regenerateLocalRawInfo = jest.fn();
			await broker.start();
			expect(shouldBeCalled).toHaveBeenCalledTimes(1);
		});

		it("should call started of services", async () => {
			broker.services.forEach(svc => (svc._start = jest.fn()));
			broker.broadcastLocal = jest.fn();
			broker.metrics.set = jest.fn();
			broker.callMiddlewareHook = jest.fn();
			broker.registry.regenerateLocalRawInfo = jest.fn();

			//broker.scope.enable = jest.fn();
			//broker.tracer.restartScope = jest.fn();

			await broker.start();
			//expect(broker.scope.enable).toHaveBeenCalledTimes(1);
			//expect(broker.tracer.restartScope).toHaveBeenCalledTimes(1);

			expect(optStarted).toHaveBeenCalledTimes(1);
			expect(svc._start).toHaveBeenCalledTimes(1);
			expect(broker.started).toBe(true);

			expect(broker.metrics.set).toHaveBeenCalledTimes(1);
			expect(broker.metrics.set).toHaveBeenCalledWith("moleculer.broker.started", 1);
			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenCalledWith("$broker.started");

			expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(2);
			expect(broker.callMiddlewareHook).toHaveBeenCalledWith("starting", [broker]);
			expect(broker.callMiddlewareHook).toHaveBeenCalledWith("started", [broker]);
		});
	});

	describe("with transporter", () => {
		const schema = {
			name: "test",
			started: jest.fn(() => Promise.resolve())
		};

		const optStarted = jest.fn();
		const broker = new ServiceBroker({
			logger: false,
			transporter: "Fake",
			started: optStarted
		});
		broker.transit.connect = jest.fn(() => Promise.resolve());
		broker.transit.ready = jest.fn(() => Promise.resolve());
		broker.broadcastLocal = jest.fn();
		broker.metrics.set = jest.fn();
		broker.callMiddlewareHook = jest.fn();
		const svc = broker.createService(schema);

		it("should call started of services, created whilst starting an initial service", async () => {
			const shouldBeCalled = jest.fn();

			broker.createService({
				name: "test2",
				started: () => {
					broker.createService({
						name: "test3",
						started: shouldBeCalled
					});
					broker.waitForServices("test");
					// do something
				}
			});
			await broker.start();
			expect(shouldBeCalled).toHaveBeenCalledTimes(1);
		});

		it("should call started of services", async () => {
			optStarted.mockClear();
			broker.transit.connect.mockClear();
			broker.transit.ready.mockClear();
			broker.broadcastLocal.mockClear();
			broker.metrics.set.mockClear();
			broker.callMiddlewareHook.mockClear();

			broker.services.forEach(svc => (svc._start = jest.fn()));
			//broker.scope.enable = jest.fn();
			//broker.tracer.restartScope = jest.fn();

			await broker.start();

			//expect(broker.scope.enable).toHaveBeenCalledTimes(1);
			//expect(broker.tracer.restartScope).toHaveBeenCalledTimes(1);

			expect(optStarted).toHaveBeenCalledTimes(1);
			expect(svc._start).toHaveBeenCalledTimes(1);
			expect(broker.transit.connect).toHaveBeenCalledTimes(1);
			expect(broker.started).toBe(true);

			expect(broker.metrics.set).toHaveBeenCalledTimes(1);
			expect(broker.metrics.set).toHaveBeenCalledWith("moleculer.broker.started", 1);
			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenCalledWith("$broker.started");

			expect(broker.transit.ready).toHaveBeenCalledTimes(1);

			expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(2);
			expect(broker.callMiddlewareHook).toHaveBeenCalledWith("starting", [broker]);
			expect(broker.callMiddlewareHook).toHaveBeenCalledWith("started", [broker]);
		});
	});

	describe("if started throw error", () => {
		let schema = {
			name: "test",
			started: jest.fn(() => Promise.reject("Can't start!"))
		};

		const optStarted = jest.fn();
		let broker = new ServiceBroker({
			logger: false,
			transporter: "Fake",
			internalServices: false,
			started: optStarted
		});

		broker.createService(schema);

		broker.transit.connect = jest.fn(() => Promise.resolve());
		broker.transit.ready = jest.fn(() => Promise.resolve());
		broker.localBus.emit = jest.fn();
		broker.metrics.set = jest.fn();
		broker.callMiddlewareHook = jest.fn();
		// broker.scope.enable = jest.fn();
		// broker.tracer.restartScope = jest.fn();

		it("should reject", () => {
			return expect(broker.start()).rejects.toBeDefined();
		});

		it("should not call others", () => {
			// expect(broker.scope.enable).toHaveBeenCalledTimes(1);
			// expect(broker.tracer.restartScope).toHaveBeenCalledTimes(1);

			expect(optStarted).toHaveBeenCalledTimes(0);
			expect(broker.transit.connect).toHaveBeenCalledTimes(1);
			expect(schema.started).toHaveBeenCalledTimes(1);
			expect(broker.started).toBe(false);
			expect(broker.localBus.emit).toHaveBeenCalledTimes(0);

			expect(broker.metrics.set).toHaveBeenCalledTimes(0);

			expect(broker.transit.ready).toHaveBeenCalledTimes(0);

			expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(2);
			expect(broker.callMiddlewareHook).toHaveBeenCalledWith("starting", [broker]);
		});
	});
});

describe("Test broker.stop", () => {
	describe("without transporter", () => {
		const schema = {
			name: "test",
			stopped: jest.fn()
		};

		const optStopped = jest.fn();

		const broker = new ServiceBroker({
			logger: false,
			transporter: null,
			stopped: optStopped
		});

		const svc = broker.createService(schema);

		broker.callMiddlewareHook = jest.fn();
		broker.broadcastLocal = jest.fn();
		broker.metrics.set = jest.fn();
		broker.metrics.stop = jest.fn();
		broker.tracer.stop = jest.fn();
		broker.loggerFactory.stop = jest.fn();
		// broker.scope.stop = jest.fn();

		broker.cacher = {
			close: jest.fn(() => Promise.resolve())
		};

		beforeAll(() => broker.start());

		it("should call stopped of services", () => {
			broker.services.forEach(svc => (svc._stop = jest.fn()));
			broker.broadcastLocal.mockClear();
			broker.metrics.set.mockClear();
			broker.callMiddlewareHook.mockClear();
			broker.registry.regenerateLocalRawInfo = jest.fn();
			broker.registry.discoverer.sendLocalNodeInfo = jest.fn();

			return broker.stop().then(() => {
				expect(broker.registry.regenerateLocalRawInfo).toBeCalledTimes(0);
				expect(broker.registry.discoverer.sendLocalNodeInfo).toBeCalledTimes(0);

				expect(optStopped).toHaveBeenCalledTimes(1);
				expect(svc._stop).toHaveBeenCalledTimes(1);
				expect(broker.cacher.close).toHaveBeenCalledTimes(1);
				expect(broker.metrics.stop).toHaveBeenCalledTimes(1);
				expect(broker.tracer.stop).toHaveBeenCalledTimes(1);
				expect(broker.loggerFactory.stop).toHaveBeenCalledTimes(1);

				expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(2);
				expect(broker.callMiddlewareHook).toHaveBeenCalledWith("stopping", [broker], {
					reverse: true
				});
				expect(broker.callMiddlewareHook).toHaveBeenCalledWith("stopped", [broker], {
					reverse: true
				});

				expect(broker.started).toBe(false);

				expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
				expect(broker.broadcastLocal).toHaveBeenCalledWith("$broker.stopped");

				// expect(broker.scope.stop).toHaveBeenCalledTimes(1);

				expect(broker.metrics.set).toHaveBeenCalledTimes(1);
				expect(broker.metrics.set).toHaveBeenCalledWith("moleculer.broker.started", 0);
			});
		});
	});

	describe("if stopped return with Promise", () => {
		const schema = {
			name: "test",
			stopped: jest.fn(() => Promise.resolve())
		};

		const optStopped = jest.fn(() => Promise.resolve());
		const broker = new ServiceBroker({
			logger: false,
			metrics: true,
			transporter: "Fake",
			stopped: optStopped
		});

		const svc = broker.createService(schema);

		broker.transit.connect = jest.fn(() => Promise.resolve());
		broker.transit.disconnect = jest.fn(() => Promise.resolve());
		broker.callMiddlewareHook = jest.fn();
		broker.broadcastLocal = jest.fn();
		broker.metrics.stop = jest.fn();
		broker.metrics.set = jest.fn();
		broker.tracer.stop = jest.fn();
		broker.loggerFactory.stop = jest.fn();
		// broker.scope.stop = jest.fn();

		broker.cacher = {
			close: jest.fn(() => Promise.resolve())
		};

		beforeAll(() => broker.start());

		it("should call stopped of services", () => {
			broker.services.forEach(svc => (svc._stop = jest.fn()));
			broker.broadcastLocal.mockClear();
			broker.metrics.set.mockClear();
			broker.callMiddlewareHook.mockClear();
			broker.registry.regenerateLocalRawInfo = jest.fn();
			broker.registry.discoverer.sendLocalNodeInfo = jest.fn();

			return broker.stop().then(() => {
				expect(broker.registry.regenerateLocalRawInfo).toBeCalledTimes(1);
				expect(broker.registry.regenerateLocalRawInfo).toBeCalledWith(true, true);
				expect(broker.registry.discoverer.sendLocalNodeInfo).toBeCalledTimes(1);

				expect(optStopped).toHaveBeenCalledTimes(1);
				expect(svc._stop).toHaveBeenCalledTimes(1);
				expect(broker.transit.disconnect).toHaveBeenCalledTimes(1);
				expect(broker.cacher.close).toHaveBeenCalledTimes(1);
				expect(broker.metrics.stop).toHaveBeenCalledTimes(1);
				expect(broker.tracer.stop).toHaveBeenCalledTimes(1);
				expect(broker.loggerFactory.stop).toHaveBeenCalledTimes(1);

				expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(2);
				expect(broker.callMiddlewareHook).toHaveBeenCalledWith("stopping", [broker], {
					reverse: true
				});
				expect(broker.callMiddlewareHook).toHaveBeenCalledWith("stopped", [broker], {
					reverse: true
				});

				expect(broker.started).toBe(false);

				expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
				expect(broker.broadcastLocal).toHaveBeenCalledWith("$broker.stopped");

				// expect(broker.scope.stop).toHaveBeenCalledTimes(1);

				expect(broker.metrics.set).toHaveBeenCalledTimes(1);
				expect(broker.metrics.set).toHaveBeenCalledWith("moleculer.broker.started", 0);
			});
		});
	});

	describe("if stopped throw error", () => {
		let broker;
		const schema = {
			name: "test",
			stopped: jest.fn(() => Promise.reject("Can't stop!"))
		};

		const optStopped = jest.fn();
		broker = new ServiceBroker({
			logger: false,
			metrics: true,
			transporter: "Fake",
			stopped: optStopped
		});

		broker.createService(schema);

		broker.transit.connect = jest.fn(() => Promise.resolve());
		broker.transit.disconnect = jest.fn(() => Promise.resolve());
		broker.broadcastLocal = jest.fn();
		broker.metrics.stop = jest.fn();
		broker.metrics.set = jest.fn();
		broker.tracer.stop = jest.fn();
		broker.loggerFactory.stop = jest.fn();
		broker.callMiddlewareHook = jest.fn();
		// broker.scope.stop = jest.fn();

		broker.cacher = {
			close: jest.fn(() => Promise.resolve())
		};

		beforeAll(() => broker.start());

		it("should call stopped of services", () => {
			broker.broadcastLocal.mockClear();
			broker.callMiddlewareHook.mockClear();
			broker.metrics.set.mockClear();
			return broker.stop().then(() => {
				expect(optStopped).toHaveBeenCalledTimes(1);
				expect(schema.stopped).toHaveBeenCalledTimes(1);
				expect(broker.transit.disconnect).toHaveBeenCalledTimes(1);
				expect(broker.cacher.close).toHaveBeenCalledTimes(1);
				expect(broker.metrics.stop).toHaveBeenCalledTimes(1);
				expect(broker.tracer.stop).toHaveBeenCalledTimes(1);
				expect(broker.loggerFactory.stop).toHaveBeenCalledTimes(1);

				expect(broker.callMiddlewareHook).toHaveBeenCalledTimes(5);
				expect(broker.callMiddlewareHook).toHaveBeenCalledWith("stopping", [broker], {
					reverse: true
				});
				expect(broker.callMiddlewareHook).toHaveBeenCalledWith("stopped", [broker], {
					reverse: true
				});

				expect(broker.started).toBe(false);

				expect(broker.broadcastLocal).toHaveBeenCalledTimes(2);
				expect(broker.broadcastLocal).toHaveBeenNthCalledWith(1, "$broker.error", {
					error: "Can't stop!",
					module: "broker",
					type: C.FAILED_STOPPING_SERVICES
				});
				expect(broker.broadcastLocal).toHaveBeenNthCalledWith(2, "$broker.stopped");

				// expect(broker.scope.stop).toHaveBeenCalledTimes(1);

				expect(broker.metrics.set).toHaveBeenCalledTimes(1);
				expect(broker.metrics.set).toHaveBeenCalledWith("moleculer.broker.started", 0);
			});
		});
	});

	describe("Test throw error during service stop", () => {
		let broker = new ServiceBroker({ logger: false });

		const schema = {
			name: "test",
			actions: {
				test: {
					handler() {
						return test;
					}
				}
			}
		};

		const service = broker.createService(schema);

		service._stop = jest.fn(() => Promise.reject(new Error(`${service.name}`)));

		it("should broadcast an error when stop", async () => {
			broker.broadcastLocal = jest.fn();

			await broker.stop(service);

			expect(broker.broadcastLocal).toHaveBeenCalledTimes(2);
			expect(broker.broadcastLocal).toHaveBeenNthCalledWith(1, "$broker.error", {
				error: new Error("test"),
				module: "broker",
				type: C.FAILED_STOPPING_SERVICES
			});
			expect(broker.broadcastLocal).toHaveBeenNthCalledWith(2, "$broker.stopped");
		});
	});
});

describe("Test broker.repl", () => {
	jest.mock("moleculer-repl", () => jest.fn());
	const repl = require("moleculer-repl");

	it("should switch to repl mode", () => {
		let broker = new ServiceBroker({ logger: false });
		broker.repl();

		expect(repl).toHaveBeenCalledTimes(1);
		expect(repl).toHaveBeenCalledWith(broker, null);
	});

	it("should switch to repl mode with custom commands", () => {
		repl.mockClear();
		let broker = new ServiceBroker({
			logger: false,
			replCommands: []
		});
		broker.repl();

		expect(repl).toHaveBeenCalledTimes(1);
		expect(repl).toHaveBeenCalledWith(broker, { customCommands: broker.options.replCommands });
	});
	it("should switch to repl mode with delimiter", () => {
		repl.mockClear();
		let broker = new ServiceBroker({
			logger: false,
			replDelimiter: "mol # "
		});
		broker.repl();

		expect(repl).toHaveBeenCalledTimes(1);
		expect(repl).toHaveBeenCalledWith(broker, { delimiter: broker.options.replDelimiter });
	});
});

describe("Test broker.errorHandler", () => {
	it("should throw further error if not errorHandler", () => {
		const broker = new ServiceBroker({ logger: false });
		const error = new MoleculerError("Some error");
		const info = {};

		expect(() => broker.errorHandler(error, info)).toThrowError(error);
	});

	it("should call errorHandler and not throw further", () => {
		const errorHandler = jest.fn();
		const broker = new ServiceBroker({
			logger: false,
			errorHandler
		});
		const error = new MoleculerError("Some error");
		const info = {};

		broker.errorHandler(error, info);

		expect(errorHandler).toHaveBeenCalledTimes(1);
		expect(errorHandler).toHaveBeenCalledWith(error, info);
	});

	it("should call errorHandler and throw further", () => {
		const errorHandler = jest.fn(err => {
			throw err;
		});
		const broker = new ServiceBroker({
			logger: false,
			errorHandler
		});
		const error = new MoleculerError("Some error");
		const info = {};

		expect(() => broker.errorHandler(error, info)).toThrowError(error);

		expect(errorHandler).toHaveBeenCalledTimes(1);
		expect(errorHandler).toHaveBeenCalledWith(error, info);
	});
});

describe("Test wrapMethod, callMiddlewareHook & callMiddlewareHookSync methods", () => {
	it("should call middleware.wrapMethod", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.middlewares.wrapMethod = jest.fn();
		const handler = jest.fn();
		const o = {};

		broker.wrapMethod("emit", handler);

		expect(broker.middlewares.wrapMethod).toHaveBeenCalledTimes(1);
		expect(broker.middlewares.wrapMethod).toHaveBeenCalledWith(
			"emit",
			handler,
			undefined,
			undefined
		);

		broker.middlewares.wrapMethod.mockClear();
		broker.wrapMethod("emit", handler, o, { reverse: true });

		expect(broker.middlewares.wrapMethod).toHaveBeenCalledTimes(1);
		expect(broker.middlewares.wrapMethod).toHaveBeenCalledWith("emit", handler, o, {
			reverse: true
		});
	});

	it("should call middleware.callHandlers", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.middlewares.callHandlers = jest.fn();

		broker.callMiddlewareHook("started", [1, 2, 3]);

		expect(broker.middlewares.callHandlers).toHaveBeenCalledTimes(1);
		expect(broker.middlewares.callHandlers).toHaveBeenCalledWith(
			"started",
			[1, 2, 3],
			undefined
		);

		broker.middlewares.callHandlers.mockClear();
		broker.callMiddlewareHook("started", [1, 2, 3], { reverse: true });

		expect(broker.middlewares.callHandlers).toHaveBeenCalledTimes(1);
		expect(broker.middlewares.callHandlers).toHaveBeenCalledWith("started", [1, 2, 3], {
			reverse: true
		});
	});

	it("should call middleware.callSyncHandlers", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.middlewares.callSyncHandlers = jest.fn();

		broker.callMiddlewareHookSync("started", [1, 2, 3]);

		expect(broker.middlewares.callSyncHandlers).toHaveBeenCalledTimes(1);
		expect(broker.middlewares.callSyncHandlers).toHaveBeenCalledWith(
			"started",
			[1, 2, 3],
			undefined
		);

		broker.middlewares.callSyncHandlers.mockClear();
		broker.callMiddlewareHookSync("started", [1, 2, 3], { reverse: true });

		expect(broker.middlewares.callSyncHandlers).toHaveBeenCalledTimes(1);
		expect(broker.middlewares.callSyncHandlers).toHaveBeenCalledWith("started", [1, 2, 3], {
			reverse: true
		});
	});
});

describe("Test isMetricsEnabled", () => {
	it("should call metrics.isEnabled", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.metrics.isEnabled = jest.fn(() => true);

		expect(broker.isMetricsEnabled()).toBe(true);

		expect(broker.metrics.isEnabled).toHaveBeenCalledTimes(1);
		expect(broker.metrics.isEnabled).toHaveBeenCalledWith();
	});
});

describe("Test isTracingEnabled", () => {
	it("should call tracer.isEnabled", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.tracer.isEnabled = jest.fn(() => true);

		expect(broker.isTracingEnabled()).toBe(true);

		expect(broker.tracer.isEnabled).toHaveBeenCalledTimes(1);
		expect(broker.tracer.isEnabled).toHaveBeenCalledWith();
	});
});

describe("Test broker.getLogger", () => {
	const broker = new ServiceBroker({ namespace: "test-ns", logger: false });

	it("should call loggerFactory with module name", () => {
		broker.loggerFactory.getLogger = jest.fn();

		broker.getLogger("svc-1");

		expect(broker.loggerFactory.getLogger).toHaveBeenCalledTimes(1);
		expect(broker.loggerFactory.getLogger).toHaveBeenCalledWith({
			mod: "svc-1",
			nodeID: "node-1234",
			ns: "test-ns"
		});
	});

	it("should call loggerFactory with props", () => {
		broker.loggerFactory.getLogger = jest.fn();

		broker.getLogger("svc-2", { ver: 2, other: "a" });

		expect(broker.loggerFactory.getLogger).toHaveBeenCalledTimes(1);
		expect(broker.loggerFactory.getLogger).toHaveBeenCalledWith({
			mod: "svc-2",
			nodeID: "node-1234",
			ns: "test-ns",
			ver: 2,
			other: "a"
		});
	});
});

describe("Test broker.fatal", () => {
	const broker = new ServiceBroker({ logger: false });

	broker.logger.fatal = jest.fn();
	broker.logger.debug = jest.fn();
	console.error = jest.fn();
	process.exit = jest.fn();

	it("should log the message to console & logger", () => {
		console.error.mockClear();
		broker.fatal("Fatal error happened!");

		expect(broker.logger.fatal).toHaveBeenCalledTimes(1);
		expect(broker.logger.fatal).toHaveBeenCalledWith("Fatal error happened!", undefined);
		expect(process.exit).toHaveBeenCalledTimes(1);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it("should log the message & error and doesn't call exit", () => {
		broker.logger.fatal.mockClear();
		console.error.mockClear();
		process.exit.mockClear();
		const err = new Error("Fatal");
		broker.fatal("Fatal error happened!", err, false);

		expect(broker.logger.fatal).toHaveBeenCalledTimes(1);
		expect(broker.logger.fatal).toHaveBeenCalledWith("Fatal error happened!", err);
		expect(process.exit).toHaveBeenCalledTimes(0);
	});
});

describe("Test loadServices", () => {
	const broker = new ServiceBroker({ logger: false });
	broker.loadService = jest.fn();

	it("should load 5 services", () => {
		const count = broker.loadServices("./test/services");
		expect(count).toBe(5);
		expect(broker.loadService).toHaveBeenCalledTimes(5);
		expect(broker.loadService).toHaveBeenCalledWith("test/services/users.service.js");
		expect(broker.loadService).toHaveBeenCalledWith("test/services/posts.service.js");
		expect(broker.loadService).toHaveBeenCalledWith("test/services/math.service.js");
		expect(broker.loadService).toHaveBeenCalledWith("test/services/utils/util.service.js");
		expect(broker.loadService).toHaveBeenCalledWith("test/services/greeter.es6.service.js");
	});

	it("should load 1 services", () => {
		broker.loadService.mockClear();
		const count = broker.loadServices("./test/services", "users.*.js");
		expect(count).toBe(1);
		expect(broker.loadService).toHaveBeenCalledTimes(1);
		expect(broker.loadService).toHaveBeenCalledWith("test/services/users.service.js");
	});

	it("should load 0 services", () => {
		broker.loadService.mockClear();
		const count = broker.loadServices();
		expect(count).toBe(0);
		expect(broker.loadService).toHaveBeenCalledTimes(0);
	});

	it("should load selected services", () => {
		broker.loadService.mockClear();
		const count = broker.loadServices("./test/services", ["users.service", "math.service"]);
		expect(count).toBe(2);
		expect(broker.loadService).toHaveBeenCalledTimes(2);
		expect(broker.loadService).toHaveBeenCalledWith(
			path.join("test", "services", "users.service")
		);
		expect(broker.loadService).toHaveBeenCalledWith(
			path.join("test", "services", "math.service")
		);
	});
});

describe("Test broker.loadService", () => {
	const broker = new ServiceBroker({ logger: false, hotReload: true });
	broker.createService = jest.fn(svc => svc);
	broker._restartService = jest.fn();

	it("should load service from schema", () => {
		// Load schema
		const service = broker.loadService("./test/services/math.service.js");
		expect(service).toBeDefined();
		expect(service.__filename).toBeDefined();
		expect(broker.createService).toHaveBeenCalledTimes(1);
		expect(broker._restartService).toHaveBeenCalledTimes(0);
	});

	it("should call function which returns Service instance", () => {
		broker.createService.mockClear();
		broker._restartService.mockClear();
		const service = broker.loadService("./test/services/users.service.js");
		expect(service).toBeInstanceOf(broker.ServiceFactory);
		expect(broker.createService).toHaveBeenCalledTimes(0);
		expect(broker._restartService).toHaveBeenCalledTimes(0);
	});

	it("should call function which returns schema", () => {
		broker.createService.mockClear();
		broker._restartService.mockClear();
		const service = broker.loadService("./test/services/posts.service.js");
		expect(service).toBeDefined();
		expect(broker.createService).toHaveBeenCalledTimes(1);
		expect(broker._restartService).toHaveBeenCalledTimes(0);
	});

	it("should load ES6 class", () => {
		broker.createService.mockClear();
		broker._restartService.mockClear();
		const service = broker.loadService("./test/services/greeter.es6.service.js");
		expect(service).toBeDefined();
		expect(broker.createService).toHaveBeenCalledTimes(0);
		expect(broker._restartService).toHaveBeenCalledTimes(0);
	});

	it("should broadcast error when loading service", () => {
		broker.broadcastLocal = jest.fn();

		jest.spyOn(broker, "normalizeSchemaConstructor").mockImplementation(() => {
			throw new Error("Ups!");
		});

		expect(() => {
			broker.loadService("./test/services/math.service.js");
		}).toThrow();

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$broker.error", {
			error: new Error("Ups!"),
			module: "broker",
			type: C.FAILED_LOAD_SERVICE
		});
	});
});

describe("Test broker.loadService after broker started", () => {
	const broker = new ServiceBroker({ logger: false, hotReload: true });
	broker.createService = jest.fn(svc => svc);
	broker._restartService = jest.fn();

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should load service from schema", () => {
		// Load schema
		const service = broker.loadService("./test/services/math.service.js");
		expect(service).toBeDefined();
		expect(service.__filename).toBeDefined();
		expect(broker.createService).toHaveBeenCalledTimes(1);
		expect(broker._restartService).toHaveBeenCalledTimes(0);
	});

	it("should call function which returns Service instance", () => {
		broker.createService.mockClear();
		broker._restartService.mockClear();
		const service = broker.loadService("./test/services/users.service.js");
		expect(service).toBeInstanceOf(broker.ServiceFactory);
		expect(broker.createService).toHaveBeenCalledTimes(0);
		expect(broker._restartService).toHaveBeenCalledTimes(1);
		expect(broker._restartService).toHaveBeenCalledWith(service);
	});

	it("should call function which returns schema", () => {
		broker.createService.mockClear();
		broker._restartService.mockClear();
		const service = broker.loadService("./test/services/posts.service.js");
		expect(service).toBeDefined();
		expect(broker.createService).toHaveBeenCalledTimes(1);
		expect(broker._restartService).toHaveBeenCalledTimes(0);
	});

	it("should load ES6 class", () => {
		broker.createService.mockClear();
		broker._restartService.mockClear();
		const service = broker.loadService("./test/services/greeter.es6.service.js");
		expect(service).toBeDefined();
		expect(broker.createService).toHaveBeenCalledTimes(0);
		expect(broker._restartService).toHaveBeenCalledTimes(1);
		expect(broker._restartService).toHaveBeenCalledWith(service);
	});
});

describe("Test broker.createService", () => {
	const broker = new ServiceBroker({ logger: false });
	broker.ServiceFactory = jest.fn((broker, schema) => schema);

	it("should load math service", () => {
		const schema = {
			name: "test",
			actions: {
				empty() {}
			}
		};

		const service = broker.createService(schema);
		expect(service).toBe(schema);
		expect(broker.ServiceFactory).toHaveBeenCalledTimes(1);
		expect(broker.ServiceFactory).toHaveBeenCalledWith(broker, schema, undefined);
	});

	it("should can't call mergeSchema if not give schema mods param", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.ServiceFactory.prototype.mergeSchemas = jest.fn(schema => schema);
		const schema = {
			name: "test",
			actions: {
				empty() {}
			}
		};

		broker.createService(schema);
		expect(broker.ServiceFactory.prototype.mergeSchemas).toHaveBeenCalledTimes(0);
	});

	it("should call mergeSchema if give schema mods param", () => {
		const broker = new ServiceBroker({ logger: false });
		broker.ServiceFactory.prototype.mergeSchemas = jest.fn(schema => schema);
		const schema = {
			name: "test",
			actions: {
				empty() {}
			}
		};

		const mods = {
			name: "other",
			version: 2
		};

		broker.createService(schema, mods);
		expect(broker.ServiceFactory.prototype.mergeSchemas).toHaveBeenCalledTimes(1);
		expect(broker.ServiceFactory.prototype.mergeSchemas).toHaveBeenCalledWith(schema, mods);
	});

	it("should load es6 class service", () => {
		const es6Service = require("../services/greeter.es6.service");
		es6Service.prototype.parseServiceSchema = jest.fn();

		Object.setPrototypeOf(es6Service, broker.ServiceFactory);
		let service = broker.createService(es6Service);
		expect(service).toBeInstanceOf(es6Service);
	});
});

describe("Test broker.__restartService", () => {
	const broker = new ServiceBroker({ logger: false });

	const schema = {
		name: "test",
		actions: {
			test: {
				handler() {
					return test;
				}
			}
		}
	};

	const service = broker.createService(schema);

	service._start = jest.fn(() => Promise.reject(new Error("Ups!")));

	it("should broadcast an error when restarting", async () => {
		broker.broadcastLocal = jest.fn();

		await broker._restartService(service);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$broker.error", {
			error: new Error("Ups!"),
			module: "broker",
			type: C.FAILED_RESTART_SERVICE
		});
	});
});

describe("Test broker.addLocalService", () => {
	let broker = new ServiceBroker({ logger: false, internalServices: false });
	broker.metrics.set = jest.fn();

	it("should add service to local services list", () => {
		let svc = { name: "test" };

		expect(broker.services.length).toBe(0);
		broker.addLocalService(svc);
		expect(broker.services.length).toBe(1);
		expect(broker.services[0]).toBe(svc);

		expect(broker.metrics.set).toHaveBeenCalledTimes(1);
		expect(broker.metrics.set).toHaveBeenCalledWith("moleculer.broker.local.services.total", 1);
	});
});

describe("Test broker.registerLocalService", () => {
	let broker = new ServiceBroker({ logger: false, internalServices: false });

	it("should call registry.registerLocalService", () => {
		let svc = { name: "test" };
		broker.registry.registerLocalService = jest.fn();

		broker.registerLocalService(svc);
		expect(broker.registry.registerLocalService).toHaveBeenCalledTimes(1);
		expect(broker.registry.registerLocalService).toHaveBeenCalledWith(svc);
	});
});

describe("Test broker.destroyService", () => {
	describe("For not versioned services", () => {
		let stopped = jest.fn();
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		let schema = {
			name: "greeter",
			actions: {
				hello() {},
				welcome() {}
			},
			stopped
		};
		let service = broker.createService(schema);

		broker.metrics.set = jest.fn();
		jest.spyOn(broker, "getLocalService");

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should destroy service", () => {
			broker.registry.unregisterService = jest.fn();
			broker.servicesChanged = jest.fn();
			broker.metrics.set.mockClear();

			expect(broker.services.length).toBe(1);

			return broker
				.destroyService(service)
				.catch(protectReject)
				.then(() => {
					expect(stopped).toHaveBeenCalledTimes(1);

					expect(broker.getLocalService).toHaveBeenCalledTimes(0);

					expect(broker.registry.unregisterService).toHaveBeenCalledTimes(1);
					expect(broker.registry.unregisterService).toHaveBeenCalledWith(
						"greeter",
						"node-1234"
					);

					expect(broker.servicesChanged).toHaveBeenCalledTimes(1);
					expect(broker.servicesChanged).toHaveBeenCalledWith(true);

					expect(broker.services.length).toBe(0);

					expect(broker.metrics.set).toHaveBeenCalledTimes(1);
					expect(broker.metrics.set).toHaveBeenCalledWith(
						"moleculer.broker.local.services.total",
						0
					);
				});
		});

		it("should find service by name", () => {
			broker.createService(schema);

			broker.registry.unregisterService.mockClear();
			broker.servicesChanged.mockClear();
			broker.metrics.set.mockClear();
			broker.getLocalService.mockClear();
			schema.stopped.mockClear();

			expect(broker.services.length).toBe(1);

			return broker
				.destroyService("greeter")
				.catch(protectReject)
				.then(() => {
					expect(stopped).toHaveBeenCalledTimes(1);

					expect(broker.getLocalService).toHaveBeenCalledTimes(1);
					expect(broker.getLocalService).toHaveBeenCalledWith("greeter");

					expect(broker.registry.unregisterService).toHaveBeenCalledTimes(1);
					expect(broker.registry.unregisterService).toHaveBeenCalledWith(
						"greeter",
						"node-1234"
					);

					expect(broker.servicesChanged).toHaveBeenCalledTimes(1);
					expect(broker.servicesChanged).toHaveBeenCalledWith(true);

					expect(broker.services.length).toBe(0);

					expect(broker.metrics.set).toHaveBeenCalledTimes(1);
					expect(broker.metrics.set).toHaveBeenCalledWith(
						"moleculer.broker.local.services.total",
						0
					);
				});
		});

		it("should broadcast error while destroying service", async () => {
			broker.broadcastLocal = jest.fn();

			jest.spyOn(service, "_stop").mockImplementation(() => {
				throw new Error("Ups!");
			});

			await broker.destroyService(service);

			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenCalledWith("$broker.error", {
				error: new Error("Ups!"),
				module: "broker",
				type: C.FAILED_DESTRUCTION_SERVICE
			});
		});
	});

	describe("For versioned services", () => {
		let stopped = jest.fn();
		let broker = new ServiceBroker({ logger: false, internalServices: false });
		let schema = {
			name: "greeter",
			version: 2,
			actions: {
				hello() {},
				welcome() {}
			},
			stopped
		};
		let service = broker.createService(schema);

		broker.metrics.set = jest.fn();
		jest.spyOn(broker, "getLocalService");

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should destroy service by providing service instance", () => {
			broker.registry.unregisterService = jest.fn();
			broker.servicesChanged = jest.fn();
			broker.metrics.set.mockClear();

			expect(broker.services.length).toBe(1);

			return broker
				.destroyService(service)
				.catch(protectReject)
				.then(() => {
					expect(stopped).toHaveBeenCalledTimes(1);

					expect(broker.getLocalService).toHaveBeenCalledTimes(0);

					expect(broker.registry.unregisterService).toHaveBeenCalledTimes(1);
					expect(broker.registry.unregisterService).toHaveBeenCalledWith(
						"v2.greeter",
						"node-1234"
					);

					expect(broker.servicesChanged).toHaveBeenCalledTimes(1);
					expect(broker.servicesChanged).toHaveBeenCalledWith(true);

					expect(broker.services.length).toBe(0);

					expect(broker.metrics.set).toHaveBeenCalledTimes(1);
					expect(broker.metrics.set).toHaveBeenCalledWith(
						"moleculer.broker.local.services.total",
						0
					);
				});
		});

		it("should destroy service by providing full service name", () => {
			broker.createService(schema);

			broker.registry.unregisterService.mockClear();
			broker.servicesChanged.mockClear();
			broker.metrics.set.mockClear();
			broker.getLocalService.mockClear();
			schema.stopped.mockClear();

			expect(broker.services.length).toBe(1);

			return broker
				.destroyService("v2.greeter")
				.catch(protectReject)
				.then(() => {
					expect(stopped).toHaveBeenCalledTimes(1);

					expect(broker.getLocalService).toHaveBeenCalledTimes(1);
					expect(broker.getLocalService).toHaveBeenCalledWith("v2.greeter");

					expect(broker.registry.unregisterService).toHaveBeenCalledTimes(1);
					expect(broker.registry.unregisterService).toHaveBeenCalledWith(
						"v2.greeter",
						"node-1234"
					);

					expect(broker.servicesChanged).toHaveBeenCalledTimes(1);
					expect(broker.servicesChanged).toHaveBeenCalledWith(true);

					expect(broker.services.length).toBe(0);

					expect(broker.metrics.set).toHaveBeenCalledTimes(1);
					expect(broker.metrics.set).toHaveBeenCalledWith(
						"moleculer.broker.local.services.total",
						0
					);
				});
		});

		it("should NOT find service by string name", () => {
			broker.createService(schema);

			return broker.destroyService("greeter").catch(err => {
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Service 'greeter' not found.");
				// remove service for next tests
				return broker.destroyService("v2.greeter");
			});
		});

		it("should NOT find service by object with name", () => {
			broker.createService(schema);

			return broker.destroyService({ name: "greeter" }).catch(err => {
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Service 'greeter' not found.");

				// remove service for next tests
				return broker.destroyService({ name: "greeter", version: 2 });
			});
		});

		it("should NOT find service by object with name", () => {
			broker.createService(schema);

			return broker.destroyService({ name: "greeter", version: 123 }).catch(err => {
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Service '123.greeter' not found.");

				// remove service for next tests
				return broker.destroyService({ name: "greeter", version: 2 });
			});
		});
	});
});

describe("Test broker.servicesChanged", () => {
	let broker;

	// Un-debounce the function
	// Make it a regular function again
	_.debounce = jest.fn(param => param);

	broker = new ServiceBroker({
		logger: false,
		transporter: "Fake"
	});

	broker.broadcastLocal = jest.fn();
	broker.registry.discoverer.sendLocalNodeInfo = jest.fn();

	beforeAll(() => broker.start());

	it("should call broadcastLocal without transit.sendNodeInfo because remote changes", () => {
		broker.broadcastLocal.mockClear();
		broker.registry.discoverer.sendLocalNodeInfo.mockClear();

		broker.servicesChanged(false);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$services.changed", {
			localService: false
		});

		expect(broker.registry.discoverer.sendLocalNodeInfo).toHaveBeenCalledTimes(0);
	});

	it("should call broadcastLocal & transit.sendNodeInfo", () => {
		broker.broadcastLocal.mockClear();
		broker.stopping = false;
		broker.registry.discoverer.sendLocalNodeInfo.mockClear();
		broker.servicesChanged(true);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$services.changed", {
			localService: true
		});

		expect(broker.registry.discoverer.sendLocalNodeInfo).toHaveBeenCalledTimes(1);
	});

	it("should not call transit.sendNodeInfo if broker is stopping", () => {
		broker.broadcastLocal.mockClear();
		broker.stopping = true;
		broker.registry.discoverer.sendLocalNodeInfo.mockClear();
		broker.servicesChanged(true);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$services.changed", {
			localService: true
		});

		expect(broker.registry.discoverer.sendLocalNodeInfo).toHaveBeenCalledTimes(0);
	});
});

describe("Test broker.registerInternalServices", () => {
	it("should register internal action", () => {
		let broker = new ServiceBroker({
			logger: false,
			internalServices: false
		});

		broker.createService = jest.fn();
		broker.registerInternalServices();

		expect(broker.createService).toHaveBeenCalledTimes(1);
		expect(broker.createService).toHaveBeenCalledWith({
			name: "$node",
			actions: {
				list: expect.any(Object),
				services: expect.any(Object),
				actions: expect.any(Object),
				events: expect.any(Object),
				health: expect.any(Object),
				options: expect.any(Object),
				metrics: expect.any(Object)
			}
		});
	});

	it("should register internal action with mixins", () => {
		let broker = new ServiceBroker({
			logger: false,
			internalServices: false
		});

		broker.createService = jest.fn();
		broker.registerInternalServices({
			$node: {
				metadata: {
					a: 5
				}
			}
		});

		expect(broker.createService).toHaveBeenCalledTimes(1);
		expect(broker.createService).toHaveBeenCalledWith({
			metadata: {
				a: 5
			},
			mixins: [
				{
					name: "$node",
					actions: {
						list: expect.any(Object),
						services: expect.any(Object),
						actions: expect.any(Object),
						events: expect.any(Object),
						health: expect.any(Object),
						options: expect.any(Object),
						metrics: expect.any(Object)
					}
				}
			]
		});
	});
});

describe("Test broker.getLocalService", () => {
	describe("without version", () => {
		let broker = new ServiceBroker({ logger: false });
		let service = broker.createService({
			name: "posts"
		});

		it("should find the service by name", () => {
			expect(broker.getLocalService("posts")).toBe(service);
			expect(broker.getLocalService("other")).toBeUndefined();
		});
	});

	describe("with version", () => {
		let broker = new ServiceBroker({ logger: false });
		let service1 = broker.createService({
			name: "posts",
			version: 1
		});

		let service2 = broker.createService({
			name: "posts",
			version: 2
		});

		it("should not find the service by name", () => {
			expect(broker.getLocalService("posts")).toBeUndefined();
		});

		it("should find the service by full name", () => {
			expect(broker.getLocalService("v2.posts")).toBe(service2);
		});

		it("should find the service by obj", () => {
			expect(broker.getLocalService({ name: "posts" })).toBeUndefined();
			expect(broker.getLocalService({ name: "posts", version: 1 })).toBe(service1);
			expect(broker.getLocalService({ name: "posts", version: 2 })).toBe(service2);
		});

		it("should find the service by name & version (deprecated)", () => {
			expect(broker.getLocalService("posts", 2)).toBe(service2);
			expect(broker.getLocalService("posts", 1)).toBe(service1);
		});
	});
});

describe("Test broker.waitForServices", () => {
	let broker = new ServiceBroker({ logger: false });
	let res = false;

	beforeEach(() => {
		broker.registry.hasService = jest.fn(() => res);
	});

	let clock;
	beforeAll(() => (clock = lolex.install()));
	afterAll(() => clock.uninstall());

	it("should wait service", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices("posts", 10 * 1000, 100)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["posts"],
					statuses: [{ name: "posts", available: true }]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(6);
				expect(broker.registry.hasService).toHaveBeenLastCalledWith("posts");
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should wait for service when service is passed as an array of string", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices(["posts"], 10 * 1000, 100)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["posts"],
					statuses: [{ name: "posts", available: true }]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(6);
				expect(broker.registry.hasService).toHaveBeenLastCalledWith("posts");
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should wait for service when service is passed as an array of object", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices([{ name: "posts" }], 10 * 1000, 100)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["posts"],
					statuses: [{ name: "posts", available: true }]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(6);
				expect(broker.registry.hasService).toHaveBeenLastCalledWith("posts");
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should wait for service when service is passed as an object", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices({ name: "posts" }, 10 * 1000, 100)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["posts"],
					statuses: [{ name: "posts", available: true }]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(6);
				expect(broker.registry.hasService).toHaveBeenLastCalledWith("posts");
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should wait for service when service is passed as an array of object with version", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices([{ name: "posts", version: 1 }], 10 * 1000, 100)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["v1.posts"],
					statuses: [{ name: "v1.posts", available: true }]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(6);
				expect(broker.registry.hasService).toHaveBeenLastCalledWith("v1.posts");
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should wait for service when service is passed as an array of object with version and unrelated property", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices([{ name: "posts", version: 1, meta: true }], 10 * 1000, 100)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["v1.posts"],
					statuses: [{ name: "v1.posts", available: true }]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(6);
				expect(broker.registry.hasService).toHaveBeenLastCalledWith("v1.posts");
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should wait for service when service is passed as a versioned string", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices("v1.posts", 10 * 1000, 100)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["v1.posts"],
					statuses: [{ name: "v1.posts", available: true }]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(6);
				expect(broker.registry.hasService).toHaveBeenLastCalledWith("v1.posts");
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should wait for service when service is passed as an array of versioned strings", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices(["v1.posts"], 10 * 1000, 100)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["v1.posts"],
					statuses: [{ name: "v1.posts", available: true }]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(6);
				expect(broker.registry.hasService).toHaveBeenLastCalledWith("v1.posts");
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should wait for a single service when passed multi-version service", () => {
		broker.registry.hasService = jest.fn();
		broker.registry.hasService.mockImplementation(name => name === "v1.posts");
		let p = broker
			.waitForServices([{ name: "posts", version: [1, 2] }], 10 * 1000, 50)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["v1.posts", "v2.posts"],
					statuses: [
						{ name: "v1.posts", available: true },
						{ name: "v2.posts", available: false }
					]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(2);
			});

		clock.tick(500);

		return p;
	});

	it("should skip duplicated services", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices(["v2.posts", "users", { name: "posts", version: 2 }], 10 * 1000, 100)
			.catch(protectReject)
			.then(result => {
				expect(result).toEqual({
					services: ["v2.posts", "users"],
					statuses: [
						{ name: "v2.posts", available: true },
						{ name: "users", available: true }
					]
				});
				expect(broker.registry.hasService).toHaveBeenCalledTimes(12);
				expect(broker.registry.hasService).toHaveBeenCalledWith("v2.posts");
				expect(broker.registry.hasService).toHaveBeenCalledWith("users");
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should not wait for service when service is passed as an array of object without name", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices([{ svcName: "posts", version: 1, meta: true }], 10 * 1000, 100)
			.catch(protectReject)
			.then(() => {
				expect(broker.registry.hasService).toHaveBeenCalledTimes(0);
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should not wait for service when passed an empty array", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices([], 10 * 1000, 100)
			.catch(protectReject)
			.then(() => {
				expect(broker.registry.hasService).toHaveBeenCalledTimes(0);
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});

	it("should reject if timed out", () => {
		res = false;
		broker.registry.hasService.mockClear();
		let p = broker
			.waitForServices("posts", 300, 100)
			.then(protectReject)
			.catch(err => {
				expect(err).toBeInstanceOf(MoleculerError);
				expect(err.data).toEqual({
					services: ["posts"],
					statuses: [{ name: "posts", available: false }]
				});
			});

		clock.tick(450);
		res = true;
		clock.tick(150);

		return p;
	});
});

describe("Test waitForServices using dependencyInterval & dependencyTimeout from options", () => {
	it("should call waitForServices with dependencyInterval from settings", async () => {
		let broker = new ServiceBroker({ logger: false, dependencyInterval: 100 });
		jest.spyOn(broker, "createService");
		jest.spyOn(broker, "waitForServices");

		[
			{ name: "users" },
			{ name: "auth" },
			{ name: "posts", dependencies: ["users", "auth"] }
		].map(svc => broker.createService(svc));

		await broker.start();

		expect(broker.createService).toHaveBeenCalledTimes(3);
		expect(broker.waitForServices).toHaveBeenCalledTimes(1);
		expect(broker.waitForServices).toHaveBeenLastCalledWith(
			["users", "auth"],
			0,
			100,
			broker.logger
		);
	});

	it("should throw after dependencyTimeout is exceeded if dependencies still unavailable", async () => {
		let broker = new ServiceBroker({
			logger: false,
			dependencyInterval: 100,
			dependencyTimeout: 500
		});

		let started = false;
		let timeoutErr = null;

		const service = {
			name: "posts",
			async started() {
				await this.waitForServices(["users"]).catch(err => (timeoutErr = err));

				started = true;
			}
		};
		broker.createService(service);

		await broker.start();

		expect(started).toEqual(true);
		expect(timeoutErr).toBeInstanceOf(MoleculerServerError);
	});

	it("should start fast despite multiple levels of dependencies", async () => {
		let broker = new ServiceBroker({ logger: false, dependencyInterval: 10 });

		jest.spyOn(broker, "createService");
		jest.spyOn(broker, "waitForServices");

		// create multiple levels of dependencies, starting to "max level" and down to 1
		// each level has to wait for the previous one
		// 10 levels ensure a test timeout if dependencyInterval is not set to a lower value
		let nb_levels = 10;
		for (let i = nb_levels; i > 0; i--) {
			broker.createService({
				name: `level_${i}`,
				dependencies: i > 1 ? [`level_${i - 1}`] : null,
				$dependencyTimeout: 1000
			});
		}

		await broker.start();

		expect(broker.createService).toHaveBeenCalledTimes(nb_levels);
		expect(broker.waitForServices).toHaveBeenCalledTimes(nb_levels - 1);
		expect(broker.waitForServices).toHaveBeenLastCalledWith(
			["level_1"],
			0,
			broker.options.dependencyInterval,
			broker.logger
		);
	});
});

describe("Test broker.findNextActionEndpoint", () => {
	let broker = new ServiceBroker({ logger: false, internalServices: false });
	let actionHandler = jest.fn(ctx => ctx);
	broker.createService({
		name: "posts",
		actions: {
			find: actionHandler,
			noHandler: jest.fn(),
			slow() {
				return Promise.delay(5000).then(() => "OK");
			}
		}
	});

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should return actionName if it is not String", () => {
		let ep = {};
		expect(broker.findNextActionEndpoint(ep, {})).toBe(ep);
	});

	it("should reject if no action", () => {
		const err = broker.findNextActionEndpoint("posts.noaction");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(ServiceNotFoundError);
		expect(err.message).toBe("Service 'posts.noaction' is not found.");
		expect(err.data).toEqual({ action: "posts.noaction", nodeID: undefined });
	});

	it("should reject if no handler", () => {
		broker.registry.unregisterAction({ id: broker.nodeID }, "posts.noHandler");
		const err = broker.findNextActionEndpoint("posts.noHandler");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(ServiceNotAvailableError);
		expect(err.message).toBe("Service 'posts.noHandler' is not available.");
		expect(err.data).toEqual({ action: "posts.noHandler", nodeID: undefined });
	});

	it("should reject if no action on node", () => {
		const err = broker.findNextActionEndpoint("posts.noHandler", { nodeID: "node-123" });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(ServiceNotFoundError);
		expect(err.message).toBe("Service 'posts.noHandler' is not found on 'node-123' node.");
		expect(err.data).toEqual({ action: "posts.noHandler", nodeID: "node-123" });
	});

	it("should find the endpoint with nodeID", () => {
		let ep = broker.findNextActionEndpoint("posts.find", { nodeID: broker.nodeID });
		expect(ep).toBeDefined();
		expect(ep.action).toBeDefined();
		expect(ep.id).toBe(broker.nodeID);
	});

	it("should find the endpoint", () => {
		let ep = broker.findNextActionEndpoint("posts.find");
		expect(ep).toBeDefined();
		expect(ep.action).toBeDefined();
		expect(ep.id).toBe(broker.nodeID);
	});
});

describe("Test broker.call", () => {
	let broker = new ServiceBroker({ logger: false, internalServices: false, metrics: true });

	let service = {
		name: "posts"
	};

	let action = {
		name: "posts.find",
		service,
		handler: jest.fn(ctx => Promise.resolve(ctx))
	};

	let ep = {
		id: broker.nodeID,
		local: true,
		action
	};
	broker.findNextActionEndpoint = jest.fn(() => ep);

	let oldContextCreate;

	beforeAll(() => (oldContextCreate = broker.ContextFactory.create));
	afterAll(() => (broker.ContextFactory.create = oldContextCreate));

	it("should default params on context to empty object if undefined", () => {
		let context = {
			action,
			endpoint: ep,
			setEndpoint: jest.fn()
		};
		broker.ContextFactory.create = jest.fn(() => context);

		let p = broker.call("posts.find");
		return p.catch(protectReject).then(() => {
			expect(broker.ContextFactory.create).toHaveBeenCalledWith(broker, null, {}, {});
			context.setEndpoint.mockClear();
		});
	});

	it("should set params on context to passed in value", () => {
		let context = {
			action,
			endpoint: ep,
			setEndpoint: jest.fn()
		};
		broker.ContextFactory.create = jest.fn(() => context);

		let params = { userId: "userId-value" };
		let p = broker.call("posts.find", params);
		return p.catch(protectReject).then(() => {
			expect(broker.ContextFactory.create).toHaveBeenCalledWith(broker, null, params, {});
			context.setEndpoint.mockClear();
		});
	});

	it("should set params on context to null if passed in value is null", () => {
		let context = {
			action,
			endpoint: ep,
			setEndpoint: jest.fn()
		};
		broker.ContextFactory.create = jest.fn(() => context);

		let p = broker.call("posts.find", null);
		return p.catch(protectReject).then(() => {
			expect(broker.ContextFactory.create).toHaveBeenCalledWith(broker, null, null, {});
			context.setEndpoint.mockClear();
		});
	});

	it("should create new Context & call handler", () => {
		action.handler.mockClear();
		broker.ContextFactory.create.mockClear();
		broker.findNextActionEndpoint.mockClear();

		let context = {
			action,
			endpoint: ep,
			setEndpoint: jest.fn()
		};
		broker.ContextFactory.create = jest.fn(() => context);

		let p = broker.call("posts.find");
		return p.catch(protectReject).then(ctx => {
			expect(ctx).toBe(context);

			expect(broker.ContextFactory.create).toHaveBeenCalledTimes(1);
			expect(broker.ContextFactory.create).toHaveBeenCalledWith(broker, null, {}, {});
			expect(context.setEndpoint).toHaveBeenCalledWith(ep);

			expect(broker.findNextActionEndpoint).toHaveBeenCalledTimes(1);
			expect(broker.findNextActionEndpoint).toHaveBeenCalledWith("posts.find", {}, ctx);

			expect(action.handler).toHaveBeenCalledTimes(1);
			expect(action.handler).toHaveBeenCalledWith(ctx);

			context.setEndpoint.mockClear();
		});
	});

	it("should create new Context & call handler if remote endpoint", () => {
		action.handler.mockClear();
		ep.local = false;
		broker.ContextFactory.create.mockClear();
		broker.findNextActionEndpoint.mockClear();

		let p = broker.call("posts.find");
		return p.catch(protectReject).then(ctx => {
			expect(p.ctx).toBe(ctx);
			expect(broker.ContextFactory.create).toHaveBeenCalledTimes(1);
			expect(broker.ContextFactory.create).toHaveBeenCalledWith(broker, null, {}, {});
			expect(ctx.setEndpoint).toHaveBeenCalledWith(ep);

			expect(broker.findNextActionEndpoint).toHaveBeenCalledTimes(1);
			expect(broker.findNextActionEndpoint).toHaveBeenCalledWith("posts.find", {}, ctx);

			expect(action.handler).toHaveBeenCalledTimes(1);
			expect(action.handler).toHaveBeenCalledWith(ctx);
		});
	});

	it("should call action handler with a reused Context", () => {
		broker.findNextActionEndpoint.mockClear();
		action.handler.mockClear();
		let preCtx = new Context(broker, { name: "posts.find" });
		preCtx.params = { a: 5 };
		preCtx.requestID = "555";
		preCtx.meta = { a: 123 };
		preCtx.metrics = true;

		let opts = { ctx: preCtx };
		return broker
			.call("posts.find", { b: 10 }, opts)
			.catch(protectReject)
			.then(ctx => {
				expect(ctx).toBe(preCtx);
				expect(ctx.broker).toBe(broker);
				expect(ctx.endpoint).toBe(ep);
				expect(ctx.service).toBe(service);
				expect(ctx.nodeID).toBe(broker.nodeID);
				expect(ctx.level).toBe(1);
				expect(ctx.parentID).toBeNull();
				expect(ctx.requestID).toBe("555");
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual({ a: 5 }); // params from reused context
				expect(ctx.meta).toEqual({ a: 123 });
				expect(ctx.metrics).toBe(true);

				expect(broker.findNextActionEndpoint).toHaveBeenCalledTimes(1);
				expect(broker.findNextActionEndpoint).toHaveBeenCalledWith(
					"posts.find",
					opts,
					preCtx
				);

				expect(action.handler).toHaveBeenCalledTimes(1);
				expect(action.handler).toHaveBeenCalledWith(ctx);
			});
	});
});

describe("Test broker.callWithoutBalancer", () => {
	let broker = new ServiceBroker({ logger: false, internalServices: false, metrics: true });
	let action = {
		name: "posts.find",
		remoteHandler: jest.fn(ctx => Promise.resolve(ctx))
	};

	let ep = {
		id: "node-11",
		local: false,
		action
	};
	broker.registry.getActionEndpoints = jest.fn(() => []);

	it("should call remoteHandler if actionName is an endpoint", () => {
		let p = broker.callWithoutBalancer(ep);
		return p.catch(protectReject).then(ctx => {
			expect(ctx).toBeDefined();
			expect(ctx.nodeID).toBe("node-11");
			expect(ctx.level).toBe(1);
			expect(ctx.action.name).toBe("posts.find");
			expect(ctx.params).toEqual({});

			expect(action.remoteHandler).toHaveBeenCalledTimes(1);
			expect(action.remoteHandler).toHaveBeenCalledWith(ctx);
		});
	});

	it("should reject if no action", () => {
		broker.registry.getActionEndpoints = jest.fn();
		return broker
			.callWithoutBalancer("posts.noaction", {})
			.then(protectReject)
			.catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Service 'posts.noaction' is not found.");
				expect(err.data).toEqual({ action: "posts.noaction", nodeID: undefined });
			});
	});

	it("should reject if no endpoint", () => {
		broker.registry.getActionEndpoints = jest.fn(() => ({
			getFirst: () => null
		}));
		return broker
			.callWithoutBalancer("posts.noaction", {})
			.then(protectReject)
			.catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ServiceNotAvailableError);
				expect(err.message).toBe("Service 'posts.noaction' is not available.");
				expect(err.data).toEqual({ action: "posts.noaction", nodeID: undefined });
			});
	});

	it("should call _remoteCall with new Context without params", () => {
		action.remoteHandler.mockClear();
		broker.registry.getActionEndpoints = jest.fn(() => ({
			getFirst: () => ep
		}));

		let p = broker.callWithoutBalancer("posts.find");
		return p.catch(protectReject).then(ctx => {
			expect(ctx).toBeDefined();
			expect(ctx.broker).toBe(broker);
			expect(ctx.nodeID).toBe(null);
			expect(ctx.level).toBe(1);
			expect(ctx.action.name).toBe("posts.find");
			expect(ctx.params).toEqual({});

			expect(action.remoteHandler).toHaveBeenCalledTimes(1);
			expect(action.remoteHandler).toHaveBeenCalledWith(ctx);
		});
	});

	it("should call _remoteCall with new Context with params", () => {
		action.remoteHandler.mockClear();
		let params = { limit: 5, search: "John" };
		return broker
			.callWithoutBalancer("posts.find", params)
			.catch(protectReject)
			.then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual(params);

				expect(action.remoteHandler).toHaveBeenCalledTimes(1);
				expect(action.remoteHandler).toHaveBeenCalledWith(ctx);
			});
	});

	it("should call _remoteCall with specified nodeID", () => {
		action.remoteHandler.mockClear();
		let params = { limit: 5, search: "John" };
		let opts = { nodeID: "node-10" };
		broker.registry.getActionEndpointByNodeId = jest.fn(() => ep);
		return broker
			.callWithoutBalancer("posts.find", params, opts)
			.catch(protectReject)
			.then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual(params);
				expect(ctx.nodeID).toBe("node-10");

				expect(broker.registry.getActionEndpointByNodeId).toHaveBeenCalledTimes(1);
				expect(broker.registry.getActionEndpointByNodeId).toHaveBeenCalledWith(
					"posts.find",
					"node-10"
				);

				expect(action.remoteHandler).toHaveBeenCalledTimes(1);
				expect(action.remoteHandler).toHaveBeenCalledWith(ctx);
			});
	});

	it("should reject if no endpoint on specified node", () => {
		broker.registry.getActionEndpointByNodeId = jest.fn(() => null);

		let params = { limit: 5, search: "John" };
		let opts = { nodeID: "node-10" };
		return broker
			.callWithoutBalancer("posts.find", params, opts)
			.then(protectReject)
			.catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Service 'posts.find' is not found on 'node-10' node.");
				expect(err.data).toEqual({ action: "posts.find", nodeID: "node-10" });
			});
	});

	it("should call _remoteCall with new Context with requestID & meta", () => {
		action.remoteHandler.mockClear();
		let params = { limit: 5, search: "John" };
		let opts = { requestID: "123", meta: { a: 5 } };
		return broker
			.callWithoutBalancer("posts.find", params, opts)
			.catch(protectReject)
			.then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.requestID).toBe("123"); // need enabled `metrics`
				expect(ctx.meta).toEqual({ a: 5 });

				expect(action.remoteHandler).toHaveBeenCalledTimes(1);
				expect(action.remoteHandler).toHaveBeenCalledWith(ctx);
			});
	});

	it("should call _remoteCall with a sub Context", () => {
		action.remoteHandler.mockClear();
		let parentCtx = new Context(broker);
		parentCtx.params = { a: 5 };
		parentCtx.requestID = "555";
		parentCtx.meta = { a: 123 };
		parentCtx.tracing = true;

		let opts = { parentCtx, meta: { b: "Adam" } };
		return broker
			.callWithoutBalancer("posts.find", { b: 10 }, opts)
			.catch(protectReject)
			.then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBeNull();
				expect(ctx.level).toBe(2);
				expect(ctx.parentID).toBe(parentCtx.id);
				expect(ctx.requestID).toBe("555");
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual({ b: 10 });
				expect(ctx.meta).toEqual({ a: 123, b: "Adam" });
				expect(ctx.tracing).toBe(true);

				expect(action.remoteHandler).toHaveBeenCalledTimes(1);
				expect(action.remoteHandler).toHaveBeenCalledWith(ctx);
			});
	});

	it("should call _remoteCall with a reused Context", () => {
		action.remoteHandler.mockClear();
		let preCtx = new Context(broker, { name: "posts.find" });
		preCtx.params = { a: 5 };
		preCtx.requestID = "555";
		preCtx.meta = { a: 123 };
		preCtx.metrics = true;

		let opts = { ctx: preCtx };
		return broker
			.callWithoutBalancer("posts.find", { b: 10 }, opts)
			.catch(protectReject)
			.then(ctx => {
				expect(ctx).toBe(preCtx);
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBeNull();
				expect(ctx.level).toBe(1);
				expect(ctx.parentID).toBeNull();
				expect(ctx.requestID).toBe("555");
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual({ a: 5 }); // params from reused context
				expect(ctx.meta).toEqual({ a: 123 });
				expect(ctx.metrics).toBe(true);

				expect(action.remoteHandler).toHaveBeenCalledTimes(1);
				expect(action.remoteHandler).toHaveBeenCalledWith(ctx);
			});
	});
});

describe("Test broker._getLocalActionEndpoint", () => {
	let broker = new ServiceBroker({ logger: false, internalServices: false, metrics: true });

	let ep = {
		id: broker.nodeID,
		local: true,
		action: {
			name: "posts.find"
		}
	};

	let epList = {
		hasLocal: () => true,
		nextLocal: () => ep
	};

	broker.registry.getActionEndpoints = jest.fn(() => epList);

	it("should call getActionEndpoints", () => {
		const res = broker._getLocalActionEndpoint("posts.find");
		expect(res).toBe(ep);
	});

	it("should throw ServiceNotFoundError if there is no endpoint list", () => {
		broker.registry.getActionEndpoints = jest.fn();

		expect(() => broker._getLocalActionEndpoint("posts.find")).toThrowError(
			ServiceNotFoundError
		);
	});

	it("should throw ServiceNotFoundError if there is no local endpoint", () => {
		broker.registry.getActionEndpoints = jest.fn(() => ({ hasLocal: () => false }));

		expect(() => broker._getLocalActionEndpoint("posts.find")).toThrowError(
			ServiceNotFoundError
		);
	});

	it("should throw ServiceNotAvailableError if there is no next endpoint", () => {
		const ctx = {};
		const epList = { hasLocal: () => true, nextLocal: jest.fn(() => null) };
		broker.registry.getActionEndpoints = jest.fn(() => epList);

		expect(() => broker._getLocalActionEndpoint("posts.find", ctx)).toThrowError(
			ServiceNotAvailableError
		);
		expect(epList.nextLocal).toHaveBeenCalledTimes(1);
		expect(epList.nextLocal).toHaveBeenCalledWith(ctx);
	});
});

describe("Test broker.mcall", () => {
	let broker = new ServiceBroker({ logger: false, internalServices: false });
	broker.call = jest.fn(action => Promise.resolve(action));

	it("should call both action & return an array", () => {
		return broker
			.mcall(
				[
					{
						action: "posts.find",
						params: { limit: 2, offset: 0 },
						options: { timeout: 500 }
					},
					{ action: "users.find", params: { limit: 2, sort: "username" } }
				],
				{ timeout: 200 }
			)
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual(["posts.find", "users.find"]);

				expect(broker.call).toHaveBeenCalledTimes(2);
				expect(broker.call).toHaveBeenCalledWith(
					"posts.find",
					{ limit: 2, offset: 0 },
					{ timeout: 500 }
				);
				expect(broker.call).toHaveBeenCalledWith(
					"users.find",
					{ limit: 2, sort: "username" },
					{ timeout: 200 }
				);
			});
	});

	it("should call both action & return an object", () => {
		broker.call.mockClear();

		return broker
			.mcall(
				{
					posts: {
						action: "posts.find",
						params: { limit: 2, offset: 0 },
						options: { timeout: 500 }
					},
					users: { action: "users.find", params: { limit: 2, sort: "username" } }
				},
				{ timeout: 200 }
			)
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual({ posts: "posts.find", users: "users.find" });

				expect(broker.call).toHaveBeenCalledTimes(2);
				expect(broker.call).toHaveBeenCalledWith(
					"posts.find",
					{ limit: 2, offset: 0 },
					{ timeout: 500 }
				);
				expect(broker.call).toHaveBeenCalledWith(
					"users.find",
					{ limit: 2, sort: "username" },
					{ timeout: 200 }
				);
			});
	});

	it("should throw error", () => {
		return broker.mcall(6).catch(err => {
			expect(err).toBeInstanceOf(MoleculerServerError);
		});
	});

	if (process.versions.node.split(".")[0] >= 12) {
		it("should call both action & return an array with settled", () => {
			return broker
				.mcall(
					[
						{
							action: "posts.find",
							params: { limit: 2, offset: 0 },
							options: { timeout: 500 }
						},
						{ action: "users.find", params: { limit: 2, sort: "username" } },
						{ action: "service.notfound", params: { notfound: 1 } }
					],
					{ timeout: 200, settled: true }
				)
				.then(res => {
					expect(res).toEqual([
						{ status: "fulfilled", value: "posts.find" },
						{ status: "fulfilled", value: "users.find" },
						{ status: "fulfilled", value: "service.notfound" }
					]);
					expect(broker.call).toHaveBeenCalledTimes(5);
					expect(broker.call).toHaveBeenCalledWith(
						"posts.find",
						{ limit: 2, offset: 0 },
						{ timeout: 500 }
					);
					expect(broker.call).toHaveBeenCalledWith(
						"users.find",
						{
							limit: 2,
							sort: "username"
						},
						{ timeout: 200 }
					);
				});
		});
	}
});

describe("Test broker.emit", () => {
	let broker = new ServiceBroker({ logger: false, transporter: null });
	let handler = jest.fn();
	broker.registry.events.getBalancedEndpoints = jest.fn(() => [
		[
			{
				id: broker.nodeID,
				event: { handler }
			},
			"users"
		],
		[
			{
				id: "node-2"
			},
			"payment"
		]
	]);
	broker.localBus.emit = jest.fn();
	broker.registry.events.callEventHandler = jest.fn();

	it("should call the local handler", () => {
		expect(broker.transit).toBeUndefined();

		broker.emit("test.event");

		expect(broker.localBus.emit).toHaveBeenCalledTimes(0);

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledWith(
			"test.event",
			undefined,
			expect.any(Context)
		);

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(1);
		const ctx = broker.registry.events.callEventHandler.mock.calls[0][0];
		expect(broker.registry.events.callEventHandler).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "test.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1234",
			options: {},
			params: null,
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
	});

	it("should call the localBus.emit if it starts with '$'", () => {
		broker.registry.events.callEventHandler.mockClear();
		broker.localBus.emit.mockClear();
		broker.registry.events.getBalancedEndpoints.mockClear();

		broker.emit("$test.event", { a: 5 });

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(1);
		const ctx = broker.registry.events.callEventHandler.mock.calls[0][0];
		expect(broker.registry.events.callEventHandler).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "$test.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1234",
			options: {},
			params: { a: 5 },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.localBus.emit).toHaveBeenCalledTimes(1);
		expect(broker.localBus.emit).toHaveBeenCalledWith("$test.event", { a: 5 });

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledWith(
			"$test.event",
			undefined,
			expect.any(Context)
		);
	});

	it("should call getBalancedEndpoints with object payload", () => {
		broker.registry.events.callEventHandler.mockClear();
		broker.registry.events.getBalancedEndpoints.mockClear();

		broker.emit("test.event", { a: 5 });

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(1);
		const ctx = broker.registry.events.callEventHandler.mock.calls[0][0];
		expect(broker.registry.events.callEventHandler).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "test.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1234",
			options: {},
			params: { a: 5 },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledWith(
			"test.event",
			undefined,
			expect.any(Context)
		);
	});

	it("should call getBalancedEndpoints with a group", () => {
		broker.registry.events.callEventHandler.mockClear();
		broker.registry.events.getBalancedEndpoints.mockClear();

		broker.emit("test.event", { a: 5 }, "users");

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledWith(
			"test.event",
			["users"],
			expect.any(Context)
		);

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(1);
		const ctx = broker.registry.events.callEventHandler.mock.calls[0][0];
		expect(broker.registry.events.callEventHandler).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["users"],
			eventName: "test.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1234",
			options: {
				groups: ["users"]
			},
			params: { a: 5 },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
	});

	it("should call getBalancedEndpoints with multiple groups", () => {
		broker.registry.events.callEventHandler.mockClear();
		broker.registry.events.getBalancedEndpoints.mockClear();

		broker.emit("test.event", { a: 5 }, ["users", "payments"]);

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledWith(
			"test.event",
			["users", "payments"],
			expect.any(Context)
		);

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(1);
		const ctx = broker.registry.events.callEventHandler.mock.calls[0][0];
		expect(broker.registry.events.callEventHandler).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["users", "payments"],
			eventName: "test.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1234",
			options: {
				groups: ["users", "payments"]
			},
			params: { a: 5 },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
	});

	it("should call getBalancedEndpoints with opts", () => {
		broker.registry.events.callEventHandler.mockClear();
		broker.registry.events.getBalancedEndpoints.mockClear();

		broker.emit("test.event", { a: 5 }, { groups: ["users", "payments"], b: 6 });

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledWith(
			"test.event",
			["users", "payments"],
			expect.any(Context)
		);

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(1);
		const ctx = broker.registry.events.callEventHandler.mock.calls[0][0];
		expect(broker.registry.events.callEventHandler).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["users", "payments"],
			eventName: "test.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1234",
			options: {
				groups: ["users", "payments"],
				b: 6
			},
			params: { a: 5 },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
	});
});

describe("Test broker.emit with transporter", () => {
	let broker = new ServiceBroker({ nodeID: "node-1", logger: false, transporter: "Fake" });
	broker.transit.sendEvent = jest.fn();
	let handler = jest.fn();
	broker.registry.events.getBalancedEndpoints = jest.fn(() => [
		[
			{
				id: "node-1",
				event: { handler }
			},
			"users"
		],
		[
			{
				id: "node-2"
			},
			"payment"
		],
		[
			{
				id: "node-3"
			},
			"users"
		],
		[
			{
				id: "node-2"
			},
			"mail"
		]
	]);
	broker.localBus.emit = jest.fn();
	broker.registry.events.callEventHandler = jest.fn();
	broker.getEventGroups = jest.fn(() => ["mail", "payment"]);

	it("should call sendEvent with ctx", () => {
		broker.transit.sendEvent.mockClear();
		broker.emit("user.event", { name: "John" });

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(1);
		let ctx = broker.registry.events.callEventHandler.mock.calls[0][0];
		expect(broker.registry.events.callEventHandler).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "user.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.transit.sendEvent).toHaveBeenCalledTimes(2);
		ctx = broker.transit.sendEvent.mock.calls[0][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(1, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["payment", "mail"],
			eventName: "user.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-2",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		ctx = broker.transit.sendEvent.mock.calls[1][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(2, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["users"],
			eventName: "user.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-3",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledWith(
			"user.event",
			undefined,
			expect.any(Context)
		);
	});

	it("should call sendEvent if no registry balancing", () => {
		broker.registry.events.callEventHandler.mockClear();
		broker.getEventGroups.mockClear();
		broker.transit.sendEvent.mockClear();
		broker.registry.events.getBalancedEndpoints.mockClear();

		broker.options.disableBalancer = true;

		broker.emit("user.event", { name: "John" });

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(0);

		expect(broker.getEventGroups).toHaveBeenCalledTimes(1);
		expect(broker.getEventGroups).toHaveBeenCalledWith("user.event");

		expect(broker.transit.sendEvent).toHaveBeenCalledTimes(1);
		const ctx = broker.transit.sendEvent.mock.calls[0][0];
		expect(broker.transit.sendEvent).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["mail", "payment"],
			eventName: "user.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
		expect(ctx.endpoint).toBeNull();

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(0);
	});

	it("should call sendEvent if no registry balancing with groups", () => {
		broker.registry.events.callEventHandler.mockClear();
		broker.getEventGroups.mockClear();
		broker.transit.sendEvent.mockClear();
		broker.registry.events.getBalancedEndpoints.mockClear();

		broker.options.disableBalancer = true;

		broker.emit("user.event", { name: "John" }, ["users", "mail"]);

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(0);
		expect(broker.getEventGroups).toHaveBeenCalledTimes(0);

		expect(broker.transit.sendEvent).toHaveBeenCalledTimes(1);
		const ctx = broker.transit.sendEvent.mock.calls[0][0];
		expect(broker.transit.sendEvent).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["users", "mail"],
			eventName: "user.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1",
			options: {
				groups: ["users", "mail"]
			},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
		expect(ctx.endpoint).toBeNull();

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(0);
	});

	it("should call sendEvent if it is an internal event", () => {
		broker.registry.events.callEventHandler.mockClear();
		broker.localBus.emit.mockClear();
		broker.transit.sendEvent.mockClear();
		broker.registry.events.getBalancedEndpoints.mockClear();

		broker.options.disableBalancer = true;

		broker.emit("$user.event", { name: "John" }, ["users", "mail"]);

		expect(broker.localBus.emit).toHaveBeenCalledTimes(1);
		expect(broker.localBus.emit).toHaveBeenCalledWith("$user.event", { name: "John" });

		expect(broker.registry.events.callEventHandler).toHaveBeenCalledTimes(0);
		expect(broker.transit.sendEvent).toHaveBeenCalledTimes(1);
		const ctx = broker.transit.sendEvent.mock.calls[0][0];
		expect(broker.transit.sendEvent).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["users", "mail"],
			eventName: "$user.event",
			eventType: "emit",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-1",
			options: {
				groups: ["users", "mail"]
			},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
		expect(ctx.endpoint).toBeNull();

		expect(broker.registry.events.getBalancedEndpoints).toHaveBeenCalledTimes(0);
	});
});

describe("Test broker broadcast", () => {
	let broker = new ServiceBroker({ logger: false, nodeID: "server-1", transporter: "Fake" });
	broker.broadcastLocal = jest.fn();
	broker.transit.sendEvent = jest.fn();
	broker.getEventGroups = jest.fn();

	broker.registry.events.getAllEndpoints = jest.fn(() => [{ id: "node-2" }, { id: "node-3" }]);

	it("should call sendEvent & broadcastLocal without payload", () => {
		broker.broadcast("user.event");

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("user.event", undefined, {});

		expect(broker.transit.sendEvent).toHaveBeenCalledTimes(2);
		let ctx = broker.transit.sendEvent.mock.calls[0][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(1, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-2",
			options: {},
			params: null,
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		ctx = broker.transit.sendEvent.mock.calls[1][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(2, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-3",
			options: {},
			params: null,
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledWith(
			"user.event",
			undefined
		);
	});

	it("should call sendEvent & broadcastLocal with object payload", () => {
		broker.broadcastLocal.mockClear();
		broker.transit.sendEvent.mockClear();
		broker.registry.events.getAllEndpoints.mockClear();

		broker.broadcast("user.event", { name: "John" });

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("user.event", { name: "John" }, {});

		expect(broker.transit.sendEvent).toHaveBeenCalledTimes(2);
		let ctx = broker.transit.sendEvent.mock.calls[0][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(1, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-2",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		ctx = broker.transit.sendEvent.mock.calls[1][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(2, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-3",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledWith(
			"user.event",
			undefined
		);
	});

	it("should call sendEvent & broadcastLocal with groups", () => {
		broker.broadcastLocal.mockClear();
		broker.transit.sendEvent.mockClear();
		broker.registry.events.getAllEndpoints.mockClear();

		broker.broadcast("user.event", { name: "John" }, ["mail", "payment"]);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith(
			"user.event",
			{ name: "John" },
			{ groups: ["mail", "payment"] }
		);

		expect(broker.transit.sendEvent).toHaveBeenCalledTimes(2);
		let ctx = broker.transit.sendEvent.mock.calls[0][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(1, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["mail", "payment"],
			eventName: "user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-2",
			options: { groups: ["mail", "payment"] },
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		ctx = broker.transit.sendEvent.mock.calls[1][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(2, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["mail", "payment"],
			eventName: "user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-3",
			options: { groups: ["mail", "payment"] },
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledWith("user.event", [
			"mail",
			"payment"
		]);
	});

	it("should call sendEvent if internal event", () => {
		broker.broadcastLocal.mockClear();
		broker.transit.sendEvent.mockClear();
		broker.registry.events.getAllEndpoints.mockClear();

		broker.broadcast("$user.event", { name: "John" });

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$user.event", { name: "John" }, {});

		expect(broker.transit.sendEvent).toHaveBeenCalledTimes(2);
		let ctx = broker.transit.sendEvent.mock.calls[0][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(1, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "$user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-2",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		ctx = broker.transit.sendEvent.mock.calls[1][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(2, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "$user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-3",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledWith(
			"$user.event",
			undefined
		);
	});

	it("should call sendEvent without nodeID if no registry balancing", () => {
		broker.registry.events.getAllEndpoints.mockClear();
		broker.getEventGroups.mockClear();
		broker.broadcastLocal.mockClear();
		broker.transit.sendEvent.mockClear();
		broker.getEventGroups = jest.fn(() => ["payments"]);

		broker.options.disableBalancer = true;

		broker.broadcast("$user.event", { name: "John" });

		expect(broker.getEventGroups).toHaveBeenCalledTimes(1);
		expect(broker.getEventGroups).toHaveBeenCalledWith("$user.event");

		expect(broker.transit.sendEvent).toHaveBeenCalledTimes(2);

		let ctx = broker.transit.sendEvent.mock.calls[0][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(1, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["payments"],
			eventName: "$user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-2",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
		expect(ctx.endpoint).toEqual({ id: "node-2" });

		ctx = broker.transit.sendEvent.mock.calls[1][0];
		expect(broker.transit.sendEvent).toHaveBeenNthCalledWith(2, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: ["payments"],
			eventName: "$user.event",
			eventType: "broadcast",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "node-3",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});
		expect(ctx.endpoint).toEqual({ id: "node-3" });

		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledTimes(1);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(0);
	});
});

describe("Test broker broadcastLocal", () => {
	let broker = new ServiceBroker({ logger: false, nodeID: "server-1" });
	broker.emitLocalServices = jest.fn();
	broker.localBus.emit = jest.fn();

	it("should call emitLocalServices without payload", () => {
		broker.broadcastLocal("user.event");

		expect(broker.emitLocalServices).toHaveBeenCalledTimes(1);
		const ctx = broker.emitLocalServices.mock.calls[0][0];
		expect(broker.emitLocalServices).toHaveBeenNthCalledWith(1, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "user.event",
			eventType: "broadcastLocal",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "server-1",
			options: {},
			params: null,
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.localBus.emit).toHaveBeenCalledTimes(0);
	});

	it("should call emitLocalServices with object payload", () => {
		broker.localBus.emit.mockClear();
		broker.emitLocalServices.mockClear();

		broker.broadcastLocal("user.event", { name: "John" });

		expect(broker.emitLocalServices).toHaveBeenCalledTimes(1);
		const ctx = broker.emitLocalServices.mock.calls[0][0];
		expect(broker.emitLocalServices).toHaveBeenNthCalledWith(1, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "user.event",
			eventType: "broadcastLocal",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "server-1",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.localBus.emit).toHaveBeenCalledTimes(0);
	});

	it("should call emitLocalServices with object payload", () => {
		broker.localBus.emit.mockClear();
		broker.emitLocalServices.mockClear();

		broker.broadcastLocal("$user.event", { name: "John" });

		expect(broker.emitLocalServices).toHaveBeenCalledTimes(1);
		const ctx = broker.emitLocalServices.mock.calls[0][0];
		expect(broker.emitLocalServices).toHaveBeenNthCalledWith(1, ctx);
		expect(ctx.toJSON()).toEqual({
			id: "1",
			ackID: null,
			cachedResult: false,
			caller: null,
			eventGroups: undefined,
			eventName: "$user.event",
			eventType: "broadcastLocal",
			level: 1,
			meta: {},
			needAck: null,
			nodeID: "server-1",
			options: {},
			params: { name: "John" },
			parentID: null,
			requestID: "1",
			span: null,
			tracing: null
		});

		expect(broker.localBus.emit).toHaveBeenCalledTimes(1);
		expect(broker.localBus.emit).toHaveBeenCalledWith("$user.event", { name: "John" });
	});
});

describe("Test broker ping", () => {
	let broker = new ServiceBroker({ logger: false, nodeID: "node-1", transporter: "Fake" });

	let clock;
	beforeAll(() => {
		return broker.start().then(() => (clock = lolex.install()));
	});
	afterAll(() => {
		clock.uninstall();
		return broker.stop();
	});

	broker.transit.sendPing = jest.fn();
	broker.transit.connected = true;

	it("should ping one node", () => {
		let p = broker.ping("node-2").catch(protectReject);

		broker.localBus.emit("$node.pong", { nodeID: "node-2", elapsedTime: 5, timeDiff: 3 });

		return p.then(res => {
			expect(res).toEqual({ nodeID: "node-2", elapsedTime: 5, timeDiff: 3 });
			expect(broker.transit.sendPing).toHaveBeenCalledTimes(1);
			expect(broker.transit.sendPing).toHaveBeenCalledWith("node-2");
		});
	});

	it("should ping one node with timeout", () => {
		broker.transit.sendPing.mockClear();

		let p = broker.ping("node-2", 500).catch(protectReject);

		clock.tick(600);

		return p.then(res => {
			expect(res).toEqual(null);
			expect(broker.transit.sendPing).toHaveBeenCalledTimes(1);
			expect(broker.transit.sendPing).toHaveBeenCalledWith("node-2");
		});
	});

	it("should ping multiple node", () => {
		broker.transit.sendPing.mockClear();

		let p = broker.ping(["node-2", "node-3"]).catch(protectReject);

		broker.localBus.emit("$node.pong", { nodeID: "node-2", elapsedTime: 5, timeDiff: 3 });
		broker.localBus.emit("$node.pong", { nodeID: "node-3", elapsedTime: 50, timeDiff: 30 });

		return p.then(res => {
			expect(res).toEqual({
				"node-2": { elapsedTime: 5, nodeID: "node-2", timeDiff: 3 },
				"node-3": { elapsedTime: 50, nodeID: "node-3", timeDiff: 30 }
			});
			expect(broker.transit.sendPing).toHaveBeenCalledTimes(2);
			expect(broker.transit.sendPing).toHaveBeenCalledWith("node-2");
			expect(broker.transit.sendPing).toHaveBeenCalledWith("node-3");
		});
	});

	it("should ping multiple node with timeout", () => {
		broker.transit.sendPing.mockClear();

		let p = broker.ping(["node-2", "node-3"], 1000).catch(protectReject);

		broker.localBus.emit("$node.pong", { nodeID: "node-3", elapsedTime: 50, timeDiff: 30 });

		clock.tick(1100);

		return p.then(res => {
			expect(res).toEqual({
				"node-2": null,
				"node-3": { elapsedTime: 50, nodeID: "node-3", timeDiff: 30 }
			});
			expect(broker.transit.sendPing).toHaveBeenCalledTimes(2);
			expect(broker.transit.sendPing).toHaveBeenCalledWith("node-2");
			expect(broker.transit.sendPing).toHaveBeenCalledWith("node-3");
		});
	});

	it("should ping all available nodes (except local)", () => {
		broker.transit.sendPing.mockClear();

		broker.registry.getNodeList = jest.fn(() => [
			{ id: "node-1", local: true, available: true },
			{ id: "node-3", local: false, available: true },
			{ id: "node-4", local: false, available: true }
		]);

		let p = broker.ping().catch(protectReject);

		broker.localBus.emit("$node.pong", { nodeID: "node-3", elapsedTime: 30, timeDiff: 33 });
		broker.localBus.emit("$node.pong", { nodeID: "node-4", elapsedTime: 40, timeDiff: 44 });

		return p.then(res => {
			expect(res).toEqual({
				"node-3": { elapsedTime: 30, nodeID: "node-3", timeDiff: 33 },
				"node-4": { elapsedTime: 40, nodeID: "node-4", timeDiff: 44 }
			});
			expect(broker.transit.sendPing).toHaveBeenCalledTimes(2);
			expect(broker.transit.sendPing).toHaveBeenCalledWith("node-3");
			expect(broker.transit.sendPing).toHaveBeenCalledWith("node-4");
		});
	});
});

describe("Test broker getHealthStatus", () => {
	let broker = new ServiceBroker({ logger: false });

	it("should call H.getHealthStatus", () => {
		broker.getHealthStatus();

		expect(H.getHealthStatus).toHaveBeenCalledTimes(1);
		expect(H.getHealthStatus).toHaveBeenCalledWith(broker);
	});
});

describe("Test broker generateUid", () => {
	it("should call the original generateToken", () => {
		let broker = new ServiceBroker({ logger: false });
		utils.generateToken.mockClear();

		expect(broker.generateUid()).toBe("1");

		expect(utils.generateToken).toHaveBeenCalledTimes(1);
		expect(utils.generateToken).toHaveBeenCalledWith();
	});

	it("should call the original generateToken", () => {
		let counter = 1;
		const customUidGenerator = jest.fn(broker => `${broker.nodeID}-${counter++}`);
		let broker = new ServiceBroker({
			nodeID: "node-100",
			logger: false,
			uidGenerator: customUidGenerator
		});
		utils.generateToken.mockClear();

		expect(broker.generateUid()).toBe("node-100-1");

		expect(utils.generateToken).toHaveBeenCalledTimes(0);
		expect(customUidGenerator).toHaveBeenCalledTimes(1);
		expect(customUidGenerator).toHaveBeenCalledWith(broker);

		customUidGenerator.mockClear();
		expect(broker.generateUid()).toBe("node-100-2");

		expect(utils.generateToken).toHaveBeenCalledTimes(0);
		expect(customUidGenerator).toHaveBeenCalledTimes(1);
		expect(customUidGenerator).toHaveBeenCalledWith(broker);
	});
});

describe("Test registry links", () => {
	let broker = new ServiceBroker({ logger: false, transporter: "Fake" });

	broker.registry.getLocalNodeInfo = jest.fn();
	broker.registry.events.getGroups = jest.fn();
	broker.registry.events.getAllEndpoints = jest.fn(() => [{}]);
	broker.registry.events.emitLocalServices = jest.fn();

	it("should call registry.getLocalNodeInfo", () => {
		broker.getLocalNodeInfo();

		expect(broker.registry.getLocalNodeInfo).toHaveBeenCalledTimes(1);
	});

	it("should call registry.getGroups", () => {
		broker.getEventGroups("event.name");

		expect(broker.registry.events.getGroups).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getGroups).toHaveBeenCalledWith("event.name");
	});

	it("should call registry.getAllEndpoints", () => {
		const res = broker.hasEventListener("event.name");

		expect(res).toBe(true);

		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledWith("event.name");
	});

	it("should call registry.getAllEndpoints", () => {
		broker.registry.events.getAllEndpoints.mockClear();

		const res = broker.getEventListeners("event.name");

		expect(res).toEqual([{}]);

		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.getAllEndpoints).toHaveBeenCalledWith("event.name");
	});

	it("should call registry.events.emitLocalServices", () => {
		const ctx = { id: "123" };
		broker.emitLocalServices(ctx);

		expect(broker.registry.events.emitLocalServices).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.emitLocalServices).toHaveBeenCalledWith(ctx);
	});
});

/*
describe("Test setCurrentContext & getCurrentContext", () => {

	let broker = new ServiceBroker({ logger: false, internalServices: false });

	broker.scope.setSessionData = jest.fn();
	broker.scope.getSessionData = jest.fn();

	it("should call scope store", () => {
		const ctx = new Context(broker);

		broker.setCurrentContext(ctx);

		expect(broker.scope.setSessionData).toHaveBeenCalledTimes(1);
		expect(broker.scope.setSessionData).toHaveBeenCalledWith(ctx);
	});

	it("should call scope store", () => {
		const ctx = new Context(broker);

		broker.getCurrentContext(ctx);

		expect(broker.scope.getSessionData).toHaveBeenCalledTimes(1);
		expect(broker.scope.getSessionData).toHaveBeenCalledWith();
	});

});

*/
