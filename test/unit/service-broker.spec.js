/*eslint-disable no-console */
"use strict";

const chalk = require("chalk");
chalk.enabled = false;

const path = require("path");
const Promise = require("bluebird");
const lolex = require("lolex");
const ServiceBroker = require("../../src/service-broker");
const Service = require("../../src/service");
const ServiceRegistry = require("../../src/service-registry");
const Context = require("../../src/context");
const Transit = require("../../src/transit");
const Cachers = require("../../src/cachers");
const Serializers = require("../../src/serializers");
const JSONSerializer = require("../../src/serializers/json");
const Transporters = require("../../src/transporters");
const FakeTransporter = require("../../src/transporters/fake");
const { MoleculerError, ServiceNotFoundError, RequestTimeoutError, MaxCallLevelError } = require("../../src/errors");

jest.mock("../../src/utils", () => ({
	getNodeID() { return "node-1234"; },
	generateToken() { return "1"; }
}));

// Registry strategies
const Strategies = require("../../src/strategies");

describe("Test ServiceBroker constructor", () => {

	it("should set default options", () => {
		let broker = new ServiceBroker();
		let strategy = new Strategies.RoundRobin();
		strategy.init(broker);
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({
			namespace: "",
			nodeID: null,

			logger: null,
			logLevel: null,

			transporter: null,
			requestTimeout: 0,
			requestRetry: 0,
			maxCallLevel: 0,
			heartbeatInterval: 10,
			heartbeatTimeout : 30,

			registry: {
				strategy,
				preferLocal: true
			},

			circuitBreaker: {
				enabled: false,
				maxFailures: 5,
				halfOpenTime: 10 * 1000,
				failureOnTimeout: true,
				failureOnReject: true
			},

			cacher: null,
			serializer: null,

			validation: true,
			metrics: false,
			metricsRate: 1,
			statistics: false,
			internalActions: true
		});

		expect(broker.Promise).toBe(Promise);

		expect(broker.ServiceFactory).toBe(Service);
		expect(broker.ContextFactory).toBe(Context);

		expect(broker.namespace).toBe("");
		expect(broker.nodeID).toBe("node-1234");

		expect(broker.logger).toBeDefined();

		expect(broker.bus).toBeDefined();

		expect(broker.services).toBeInstanceOf(Array);
		expect(broker.serviceRegistry).toBeInstanceOf(ServiceRegistry);

		expect(broker.middlewares).toBeInstanceOf(Array);

		expect(broker.cacher).toBeNull();
		expect(broker.serializer).toBeInstanceOf(JSONSerializer);
		expect(broker.validator).toBeDefined();
		expect(broker.transit).toBeUndefined();
		expect(broker.statistics).toBeUndefined();

		expect(broker.hasAction("$node.list")).toBe(true);
		expect(broker.hasAction("$node.services")).toBe(true);
		expect(broker.hasAction("$node.actions")).toBe(true);
		expect(broker.hasAction("$node.health")).toBe(true);

		expect(ServiceBroker.defaultConfig).toBeDefined();
		expect(ServiceBroker.MOLECULER_VERSION).toBeDefined();
		expect(broker.MOLECULER_VERSION).toBeDefined();
	});

	it("should merge options", () => {

		let strategy = new Strategies.Random();

		let broker = new ServiceBroker( {
			namespace: "test",
			heartbeatTimeout: 20,
			metrics: true,
			metricsRate: 0.5,
			statistics: true,
			logLevel: "debug",
			requestRetry: 3,
			requestTimeout: 5000,
			maxCallLevel: 10,
			registry: {
				strategy,
				preferLocal: false
			},
			circuitBreaker: {
				enabled: true,
				maxFailures: 2,
				failureOnReject: false
			},
			validation: false,
			internalActions: false });

		expect(broker).toBeDefined();
		expect(broker.options).toEqual({
			namespace: "test",
			nodeID: null,
			logger: null,
			logLevel: "debug",
			cacher: null,
			serializer: null,
			transporter: null,
			metrics: true,
			metricsRate: 0.5,
			statistics: true,
			heartbeatTimeout : 20,
			heartbeatInterval: 10,

			registry: {
				strategy,
				preferLocal: false
			},

			circuitBreaker: {
				enabled: true,
				maxFailures: 2,
				halfOpenTime: 10 * 1000,
				failureOnTimeout: true,
				failureOnReject: false
			},
			requestRetry: 3,
			requestTimeout: 5000,
			maxCallLevel: 10,
			validation: false,
			internalActions: false });
		expect(broker.services).toBeInstanceOf(Array);
		expect(broker.serviceRegistry).toBeInstanceOf(ServiceRegistry);
		expect(broker.transit).toBeUndefined();
		expect(broker.statistics).toBeDefined();
		expect(broker.validator).toBeUndefined();
		expect(broker.serializer).toBeInstanceOf(JSONSerializer);
		expect(broker.namespace).toBe("test");
		expect(broker.nodeID).toBe("node-1234");

		expect(broker.hasAction("$node.list")).toBe(false);
		expect(broker.hasAction("$node.services")).toBe(false);
		expect(broker.hasAction("$node.actions")).toBe(false);
		expect(broker.hasAction("$node.health")).toBe(false);
	});

	it("should create transit if transporter into options", () => {
		let broker = new ServiceBroker( {
			transporter: new FakeTransporter()
		});

		expect(broker).toBeDefined();
		expect(broker.transit).toBeInstanceOf(Transit);
		expect(broker.nodeID).toBe("node-1234");
	});

	it("should create cacher and call init", () => {
		let cacher = new Cachers.Memory();
		cacher.init = jest.fn();
		let broker = new ServiceBroker( {
			cacher
		});

		expect(broker).toBeDefined();
		expect(broker.cacher).toBe(cacher);
		expect(cacher.init).toHaveBeenCalledTimes(1);
		expect(cacher.init).toHaveBeenCalledWith(broker);
	});

	it("should set serializer and call init", () => {
		let serializer = new JSONSerializer();
		serializer.init = jest.fn();
		let broker = new ServiceBroker( {
			serializer
		});

		expect(broker).toBeDefined();
		expect(broker.serializer).toBe(serializer);
		expect(serializer.init).toHaveBeenCalledTimes(1);
		expect(serializer.init).toHaveBeenCalledWith(broker);
	});

});

describe("Test option resolvers", () => {

	describe("Test _resolveTransporter", () => {

		let broker = new ServiceBroker();

		it("should resolve null from undefined", () => {
			let trans = broker._resolveTransporter();
			expect(trans).toBeNull();
		});

		it("should resolve NATSTransporter from connection string", () => {
			let trans = broker._resolveTransporter("nats://localhost:4222");
			expect(trans).toBeInstanceOf(Transporters.NATS);
		});

		it("should resolve NATSTransporter from string", () => {
			let trans = broker._resolveTransporter("NATS");
			expect(trans).toBeInstanceOf(Transporters.NATS);
		});

		it("should resolve AMQPTransporter from connection string", () => {
			let trans = broker._resolveTransporter("amqp://localhost:5672");
			expect(trans).toBeInstanceOf(Transporters.AMQP);
		});

		it("should resolve MQTTTransporter from connection string", () => {
			let trans = broker._resolveTransporter("mqtt://localhost");
			expect(trans).toBeInstanceOf(Transporters.MQTT);
		});

		it("should resolve MQTTTransporter from string", () => {
			let trans = broker._resolveTransporter("MQTT");
			expect(trans).toBeInstanceOf(Transporters.MQTT);
		});

		it("should resolve RedisTransporter from connection string", () => {
			let trans = broker._resolveTransporter("redis://localhost");
			expect(trans).toBeInstanceOf(Transporters.Redis);
		});

		it("should resolve RedisTransporter from string", () => {
			let trans = broker._resolveTransporter("Redis");
			expect(trans).toBeInstanceOf(Transporters.Redis);
		});

		it("should resolve NATSTransporter from obj without type", () => {
			let options = { nats: { url: "nats://localhost:4222" } };
			let trans = broker._resolveTransporter({ options });
			expect(trans).toBeInstanceOf(Transporters.NATS);
			expect(trans.opts).toEqual({"nats": {"preserveBuffers": true, "url": "nats://localhost:4222"}});
		});

		it("should resolve AMQPTransporter from obj", () => {
			let options = { amqp: { url: "amqp://localhost" } };
			let trans = broker._resolveTransporter({ type: "AMQP", options });
			expect(trans).toBeInstanceOf(Transporters.AMQP);
			expect(trans.opts).toEqual({
				amqp: {
					prefetch: 1,
					eventTimeToLive: 5000,
					url: "amqp://localhost"
				},
			});
		});

		it("should resolve NATSTransporter from obj", () => {
			let options = { mqtt: "mqtt://localhost" };
			let trans = broker._resolveTransporter({ type: "MQTT", options });
			expect(trans).toBeInstanceOf(Transporters.MQTT);
			expect(trans.opts).toEqual({ mqtt: "mqtt://localhost" });
		});

		it("should resolve RedisTransporter from obj with Redis type", () => {
			let options = { redis: { db: 3 } };
			let trans = broker._resolveTransporter({ type: "Redis", options });
			expect(trans).toBeInstanceOf(Transporters.Redis);
			expect(trans.opts).toEqual({ redis: { db: 3 } });
		});

		it("should throw error if type if not correct", () => {
			expect(() => {
				broker._resolveTransporter({ type: "xyz" });
			}).toThrowError(MoleculerError);

			expect(() => {
				broker._resolveTransporter("xyz");
			}).toThrowError(MoleculerError);
		});

	});

	describe("Test _resolveCacher", () => {

		let broker = new ServiceBroker();

		it("should resolve null from undefined", () => {
			let cacher = broker._resolveCacher();
			expect(cacher).toBeNull();
		});

		it("should resolve MemoryCacher from true", () => {
			let cacher = broker._resolveCacher(true);
			expect(cacher).toBeInstanceOf(Cachers.Memory);
		});

		it("should resolve MemoryCacher from string", () => {
			let cacher = broker._resolveCacher("Memory");
			expect(cacher).toBeInstanceOf(Cachers.Memory);
		});

		it("should resolve RedisCacher from string", () => {
			let cacher = broker._resolveCacher("Redis");
			expect(cacher).toBeInstanceOf(Cachers.Redis);
		});

		it("should resolve MemoryCacher from obj without type", () => {
			let options = { ttl: 100 };
			let cacher = broker._resolveCacher({ options });
			expect(cacher).toBeInstanceOf(Cachers.Memory);
			expect(cacher.opts).toEqual({ ttl: 100});
		});

		it("should resolve MemoryCacher from obj", () => {
			let options = { ttl: 100 };
			let cacher = broker._resolveCacher({ type: "Memory", options });
			expect(cacher).toBeInstanceOf(Cachers.Memory);
			expect(cacher.opts).toEqual({ ttl: 100});
		});

		it("should resolve RedisCacher from obj with Redis type", () => {
			let options = { ttl: 100 };
			let cacher = broker._resolveCacher({ type: "Redis", options });
			expect(cacher).toBeInstanceOf(Cachers.Redis);
			expect(cacher.opts).toEqual({ ttl: 100});
		});

		it("should resolve RedisCacher from obj with Redis type", () => {
			let options = { ttl: 80, redis: { db: 3 } };
			let cacher = broker._resolveCacher({ type: "Redis", options });
			expect(cacher).toBeInstanceOf(Cachers.Redis);
			expect(cacher.opts).toEqual({ ttl: 80, redis: { db: 3 } });
		});

		it("should resolve RedisCacher from connection string", () => {
			let cacher = broker._resolveCacher("redis://localhost");
			expect(cacher).toBeInstanceOf(Cachers.Redis);
		});

		it("should throw error if type if not correct", () => {
			expect(() => {
				broker._resolveCacher({ type: "xyz" });
			}).toThrowError(MoleculerError);

			expect(() => {
				broker._resolveCacher("xyz");
			}).toThrowError(MoleculerError);
		});

	});

	describe("Test _resolveSerializer", () => {

		let broker = new ServiceBroker();

		it("should resolve null from undefined", () => {
			let serializer = broker._resolveSerializer();
			expect(serializer).toBeInstanceOf(Serializers.JSON);
		});

		it("should resolve JSONSerializer from obj without type", () => {
			let serializer = broker._resolveSerializer({});
			expect(serializer).toBeInstanceOf(Serializers.JSON);
		});

		it("should resolve JSONSerializer from obj", () => {
			let serializer = broker._resolveSerializer({ type: "JSON" });
			expect(serializer).toBeInstanceOf(Serializers.JSON);
		});

		it("should resolve AvroSerializer from string with Avro type", () => {
			let serializer = broker._resolveSerializer("Avro");
			expect(serializer).toBeInstanceOf(Serializers.Avro);
		});

		it("should throw error if type if not correct", () => {
			expect(() => {
				broker._resolveSerializer("xyz");
			}).toThrowError(MoleculerError);

			expect(() => {
				broker._resolveSerializer({ type: "xyz" });
			}).toThrowError(MoleculerError);
		});

	});
});

describe("Test broker.start", () => {

	describe("if started success", () => {

		let broker;
		let schema = {
			name: "test",
			started: jest.fn()
		};

		broker = new ServiceBroker({
			metrics: true,
			statistics: true,
			transporter: new FakeTransporter()
		});

		broker.createService(schema);

		broker.transit.connect = jest.fn(() => Promise.resolve());

		beforeAll(() => broker.start());

		it("should call started of services", () => {
			expect(schema.started).toHaveBeenCalledTimes(1);
			expect(broker.transit.connect).toHaveBeenCalledTimes(1);
		});
	});

	describe("if started return with Promise", () => {

		let broker;
		let schema = {
			name: "test",
			started: jest.fn(() => Promise.resolve())
		};

		broker = new ServiceBroker({
			metrics: true,
			statistics: true,
			transporter: new FakeTransporter()
		});

		broker.createService(schema);

		broker.transit.connect = jest.fn(() => Promise.resolve());

		beforeAll(() => broker.start());

		it("should call started of services", () => {
			expect(schema.started).toHaveBeenCalledTimes(1);
			expect(broker.transit.connect).toHaveBeenCalledTimes(1);
		});
	});

	describe("if started throw error", () => {

		let broker;
		let schema = {
			name: "test",
			started: jest.fn(() => Promise.reject("Can't start!"))
		};

		broker = new ServiceBroker({
			metrics: true,
			statistics: true,
			transporter: new FakeTransporter()
		});

		broker.createService(schema);

		broker.transit.connect = jest.fn(() => Promise.resolve());

		it("should reject", () => {
			return expect(broker.start()).rejects.toBeDefined();
		});

		it("should call started of services", () => {
			expect(schema.started).toHaveBeenCalledTimes(1);
			expect(broker.transit.connect).toHaveBeenCalledTimes(0);
		});
	});

});

describe("Test broker.stop", () => {

	describe("if stopped success", () => {


		let broker;

		let schema = {
			name: "test",
			stopped: jest.fn()
		};

		beforeAll(() => {
			broker = new ServiceBroker({
				metrics: true,
				statistics: true,
				transporter: new FakeTransporter()
			});

			broker.createService(schema);

			broker.transit.connect = jest.fn(() => Promise.resolve());
			broker.transit.disconnect = jest.fn(() => Promise.resolve());

			broker.cacher = {
				close: jest.fn(() => Promise.resolve())
			};

			return broker.start().then(() => broker.stop());
		});

		it("should call stopped of services", () => {
			expect(schema.stopped).toHaveBeenCalledTimes(1);
			expect(broker.transit.disconnect).toHaveBeenCalledTimes(1);
			expect(broker.cacher.close).toHaveBeenCalledTimes(1);
		});

	});

	describe("if stopped return with Promise", () => {

		let broker;
		let schema = {
			name: "test",
			stopped: jest.fn(() => Promise.resolve())
		};

		broker = new ServiceBroker({
			metrics: true,
			statistics: true,
			transporter: new FakeTransporter()
		});

		broker.createService(schema);

		broker.transit.connect = jest.fn(() => Promise.resolve());
		broker.transit.disconnect = jest.fn(() => Promise.resolve());

		broker.cacher = {
			close: jest.fn(() => Promise.resolve())
		};

		beforeAll(() => broker.start().then(() => broker.stop()));

		it("should call stopped of services", () => {
			expect(schema.stopped).toHaveBeenCalledTimes(1);
			expect(broker.transit.disconnect).toHaveBeenCalledTimes(1);
			expect(broker.cacher.close).toHaveBeenCalledTimes(1);
		});
	});

	describe("if stopped throw error", () => {

		let broker;
		let schema = {
			name: "test",
			stopped: jest.fn(() => Promise.reject("Can't start!"))
		};

		broker = new ServiceBroker({
			metrics: true,
			statistics: true,
			transporter: new FakeTransporter()
		});

		broker.createService(schema);

		broker.transit.connect = jest.fn(() => Promise.resolve());
		broker.transit.disconnect = jest.fn(() => Promise.resolve());

		broker.cacher = {
			close: jest.fn(() => Promise.resolve())
		};

		beforeAll(() => broker.start().then(() => broker.stop()));

		it("should call stopped of services", () => {
			expect(schema.stopped).toHaveBeenCalledTimes(1);
			expect(broker.transit.disconnect).toHaveBeenCalledTimes(1);
			expect(broker.cacher.close).toHaveBeenCalledTimes(1);
		});
	});

});

describe("Test broker.repl", () => {

	jest.mock("moleculer-repl");
	let repl = require("moleculer-repl");
	repl.mockImplementation(() => jest.fn());

	let broker = new ServiceBroker();

	it("should switch to repl mode", () => {
		broker.repl();

		expect(repl).toHaveBeenCalledTimes(1);
		expect(repl).toHaveBeenCalledWith(broker);
	});
});

describe("Test broker.getLogger", () => {
	let clock;
	beforeAll(() => clock = lolex.install());
	afterAll(() => clock.uninstall());

	console.info = jest.fn();
	console.error = jest.fn();

	it("should not use any logger", () => {
		let broker = new ServiceBroker();

		console.info.mockClear();
		broker.logger.info("Teszt");

		expect(console.info).toHaveBeenCalledTimes(0);
	});

	it("should create default console logger", () => {
		let broker = new ServiceBroker({ logger: console });

		console.info.mockClear();
		broker.logger.info("Teszt");

		expect(console.info).toHaveBeenCalledTimes(1);
		expect(console.info).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "INFO ", "node-1234/BROKER:", "Teszt");
	});

	it("should create default console logger with logLevel", () => {
		let broker = new ServiceBroker({ logger: true, logLevel: "error" });

		console.info.mockClear();
		console.error.mockClear();
		broker.logger.info("Teszt");
		broker.logger.error("Error", { a: 5 });

		expect(console.info).toHaveBeenCalledTimes(0);
		expect(console.error).toHaveBeenCalledTimes(1);
		expect(console.error).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "ERROR", "node-1234/BROKER:", "Error", "{ a: 5 }");
	});

	it("should create default console logger with logFormatter", () => {
		let logFormatter = jest.fn();
		let broker = new ServiceBroker({ logger: true, logFormatter });

		console.info.mockClear();
		broker.logger.info("Teszt", { a: 5 });

		expect(logFormatter).toHaveBeenCalledTimes(1);
		expect(logFormatter).toHaveBeenCalledWith("info", ["Teszt", { a: 5 }], {"mod": "broker", "nodeID": "node-1234", "ns": ""});
	});

	describe("Test logger creator", () => {
		let logger = jest.fn();
		let broker;

		it("should call logger function with broker bindings", () => {
			broker = new ServiceBroker({ logger, namespace: "testing", nodeID: "test-pc" });

			expect(logger).toHaveBeenCalledTimes(1);
			expect(logger).toHaveBeenCalledWith({"mod": "broker", "nodeID": "test-pc", "ns": "testing"});
		});

		it("should call creator function with service bindings", () => {
			logger.mockClear();
			broker.getLogger("service", "posts");

			expect(logger).toHaveBeenCalledTimes(1);
			expect(logger).toHaveBeenCalledWith({"svc": "posts", "nodeID": "test-pc", "ns": "testing"});
		});

		it("should call creator function with versioned service bindings", () => {
			logger.mockClear();
			broker.getLogger("service", "posts", 2);

			expect(logger).toHaveBeenCalledTimes(1);
			expect(logger).toHaveBeenCalledWith({"svc": "posts", "ver": 2, "nodeID": "test-pc", "ns": "testing"});
		});

	});

	it("should extend an external logger", () => {
		let logger = {
			info: jest.fn()
		};
		let broker = new ServiceBroker({ logger });

		expect(logger.fatal).toBeDefined();
		expect(logger.error).toBeDefined();
		expect(logger.warn).toBeDefined();
		expect(logger.info).toBeDefined();
		expect(logger.debug).toBeDefined();
		expect(logger.trace).toBeDefined();

		broker.logger.info("Info message");
		broker.logger.error("Error message");

		expect(logger.info).toHaveBeenCalledTimes(2);
	});

});

describe("Test broker.fatal", () => {

	let broker = new ServiceBroker();

	broker.logger.fatal = jest.fn();
	broker.logger.debug = jest.fn();
	console.error = jest.fn();
	process.exit = jest.fn();

	it("should log the message to console & logger", () => {
		console.error.mockClear();
		broker.fatal("Fatal error happened!");

		expect(broker.logger.fatal).toHaveBeenCalledTimes(1);
		expect(broker.logger.fatal).toHaveBeenCalledWith("Fatal error happened!");
		expect(console.error).toHaveBeenCalledTimes(1);
		expect(console.error).toHaveBeenCalledWith("Fatal error happened!");
		expect(broker.logger.debug).toHaveBeenCalledTimes(0);
		expect(process.exit).toHaveBeenCalledTimes(1);
		expect(process.exit).toHaveBeenCalledWith(2);
	});

	it("should log the message & error and doesn't call exit", () => {
		broker.logger.fatal.mockClear();
		console.error.mockClear();
		process.exit.mockClear();
		const err = new Error("Fatal");
		broker.fatal("Fatal error happened!", err, false);

		expect(broker.logger.fatal).toHaveBeenCalledTimes(1);
		expect(broker.logger.fatal).toHaveBeenCalledWith("Fatal error happened!");
		expect(console.error).toHaveBeenCalledTimes(1);
		expect(console.error).toHaveBeenCalledWith("Fatal error happened!");
		expect(broker.logger.debug).toHaveBeenCalledTimes(1);
		expect(broker.logger.debug).toHaveBeenCalledWith("ERROR", err);
		expect(process.exit).toHaveBeenCalledTimes(0);
	});
});

describe("Test loadServices", () => {

	let broker = new ServiceBroker();
	broker.loadService = jest.fn();

	it("should load 3 services", () => {
		let count = broker.loadServices("./test/services");
		expect(count).toBe(3);
		expect(broker.loadService).toHaveBeenCalledTimes(3);
		expect(broker.loadService).toHaveBeenCalledWith("test/services/user.service.js");
		expect(broker.loadService).toHaveBeenCalledWith("test/services/post.service.js");
		expect(broker.loadService).toHaveBeenCalledWith("test/services/math.service.js");
	});

	it("should load 1 services", () => {
		broker.loadService.mockClear();
		let count = broker.loadServices("./test/services", "user.*.js");
		expect(count).toBe(1);
		expect(broker.loadService).toHaveBeenCalledTimes(1);
		expect(broker.loadService).toHaveBeenCalledWith("test/services/user.service.js");
	});

	it("should load 0 services", () => {
		broker.loadService.mockClear();
		let count = broker.loadServices();
		expect(count).toBe(0);
		expect(broker.loadService).toHaveBeenCalledTimes(0);
	});

	it("should load selected services", () => {
		broker.loadService.mockClear();
		let count = broker.loadServices("./test/services", ["user.service", "math.service"]);
		expect(count).toBe(2);
		expect(broker.loadService).toHaveBeenCalledTimes(2);
		expect(broker.loadService).toHaveBeenCalledWith(path.join("test", "services", "user.service"));
		expect(broker.loadService).toHaveBeenCalledWith(path.join("test", "services", "math.service"));
	});

});

describe("Test broker.loadService", () => {

	let broker = new ServiceBroker();
	broker.createService = jest.fn(svc => svc);

	it("should load service from schema", () => {
		// Load schema
		let service = broker.loadService("./test/services/math.service.js");
		expect(service).toBeDefined();
		expect(broker.createService).toHaveBeenCalledTimes(1);
		//expect(broker.createService).toHaveBeenCalledWith({ name: "math" });
	});

	it("should call function which returns Service instance", () => {
		broker.createService.mockClear();
		let service = broker.loadService("./test/services/user.service.js");
		expect(service).toBeInstanceOf(Service);
		expect(broker.createService).toHaveBeenCalledTimes(0);
	});

	it("should call function which returns schema", () => {
		broker.createService.mockClear();
		let service = broker.loadService("./test/services/post.service.js");
		expect(service).toBeDefined();
		expect(broker.createService).toHaveBeenCalledTimes(1);
	});

});

describe("Test broker.createService", () => {

	let broker = new ServiceBroker();
	broker.ServiceFactory = jest.fn((broker, schema) => schema);

	it("should load math service", () => {
		let schema = {
			name: "test",
			actions: {
				empty() {}
			}
		};

		let service = broker.createService(schema);
		expect(service).toBe(schema);
		expect(broker.ServiceFactory).toHaveBeenCalledTimes(1);
		expect(broker.ServiceFactory).toHaveBeenCalledWith(broker, schema);
	});

	it("should call mergeSchema if give schema mods param", () => {
		let utils = require("../../src/utils");

		utils.mergeSchemas = jest.fn((s1, s2) => s1);
		let schema = {
			name: "test",
			actions: {
				empty() {}
			}
		};

		let mods = {
			name: "other",
			version: 2
		};

		broker.createService(schema, mods);
		expect(utils.mergeSchemas).toHaveBeenCalledTimes(1);
		expect(utils.mergeSchemas).toHaveBeenCalledWith(schema, mods);
	});

});


describe("Test broker.destroyService", () => {

	let stopped = jest.fn();
	let broker = new ServiceBroker();
	let service = broker.createService({
		name: "greeter",
		actions: {
			hello() {},
			welcome() {}
		},
		stopped
	});

	it("should destroy service", () => {
		broker.serviceRegistry.unregisterService = jest.fn();
		broker.servicesChanged = jest.fn();

		expect(broker.services.length).toBe(1);

		return broker.destroyService(service).then(() => {

			expect(stopped).toHaveBeenCalledTimes(1);

			expect(broker.serviceRegistry.unregisterService).toHaveBeenCalledTimes(1);
			expect(broker.serviceRegistry.unregisterService).toHaveBeenCalledWith(null, "greeter");

			expect(broker.servicesChanged).toHaveBeenCalledTimes(1);

			expect(broker.services.length).toBe(0);
		});
	});
});

describe("Test broker.servicesChanged", () => {

	let broker;

	broker = new ServiceBroker({
		transporter: new FakeTransporter()
	});

	broker.emitLocal = jest.fn();
	broker.transit.sendNodeInfo = jest.fn();

	beforeAll(() => broker.start());

	it("should call emitLocal & transit.sendNodeInfo", () => {
		broker.transit.sendNodeInfo.mockClear();

		broker.servicesChanged();

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("services.changed");

		expect(broker.transit.sendNodeInfo).toHaveBeenCalledTimes(1);
	});

	it("should call emitLocal without transit.sendNodeInfo because it is disconnected", () => {
		broker.transit.connected = false;

		broker.emitLocal.mockClear();
		broker.transit.sendNodeInfo.mockClear();

		broker.servicesChanged();

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("services.changed");

		expect(broker.transit.sendNodeInfo).toHaveBeenCalledTimes(0);
	});
});

describe("Test broker.registerLocalService", () => {

	let broker = new ServiceBroker();
	broker.emitLocal = jest.fn();
	broker.serviceRegistry.registerService = jest.fn();

	it("should push to the services & call service registry", () => {
		let service = {
			name: "test"
		};

		broker.registerLocalService(service);
		expect(broker.services.length).toBe(1);
		expect(broker.services[0]).toBe(service);
		expect(broker.serviceRegistry.registerService).toHaveBeenCalledTimes(1);
		expect(broker.serviceRegistry.registerService).toHaveBeenCalledWith(null, service);
	});

});

describe("Test broker.registerRemoteService", () => {

	let broker = new ServiceBroker();
	broker.serviceRegistry.registerService = jest.fn();
	broker.registerAction = jest.fn();

	it("should save service & actions", () => {
		let service = {
			name: "test",
			actions: {
				hello: {
					name: "test.hello",
					params: {}
				},
				hi: {
					name: "test.hi"
				}
			}
		};

		broker.registerRemoteService("node-2", service);
		expect(broker.services.length).toBe(0);
		expect(broker.serviceRegistry.registerService).toHaveBeenCalledTimes(1);
		expect(broker.serviceRegistry.registerService).toHaveBeenCalledWith("node-2", service);
		expect(broker.registerAction).toHaveBeenCalledTimes(2);
		expect(broker.registerAction).toHaveBeenCalledWith("node-2", { name: "test.hello", service, params: {} });
		expect(broker.registerAction).toHaveBeenCalledWith("node-2", { name: "test.hi", service });
	});

});

describe("Test broker.registerAction", () => {

	let broker = new ServiceBroker();
	broker.wrapAction = jest.fn();
	broker.emitLocal = jest.fn();
	broker.serviceRegistry.registerAction = jest.fn(() => true);

	it("should push to the actions & emit an event without nodeID", () => {
		let action = {
			name: "user.list",
			service: { name: "user" }
		};

		broker.registerAction(null, action);
		expect(broker.wrapAction).toHaveBeenCalledTimes(1);

		expect(broker.serviceRegistry.registerAction).toHaveBeenCalledTimes(1);
		expect(broker.serviceRegistry.registerAction).toHaveBeenCalledWith(null, action);

		// expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		// expect(broker.emitLocal).toHaveBeenCalledWith("register.action.user.list", { action, nodeID: null });
	});

	it("should push to the actions & emit an event with nodeID", () => {
		broker.serviceRegistry.registerAction.mockClear();
		broker.wrapAction.mockClear();
		broker.emitLocal.mockClear();
		let action = {
			name: "user.update",
			service: { name: "user" }
		};

		broker.registerAction("server-2", action);
		expect(broker.wrapAction).toHaveBeenCalledTimes(0);

		expect(broker.serviceRegistry.registerAction).toHaveBeenCalledTimes(1);
		expect(broker.serviceRegistry.registerAction).toHaveBeenCalledWith("server-2", action);

		// expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		// expect(broker.emitLocal).toHaveBeenCalledWith("register.action.user.update", { action, nodeID: "server-2" });
	});

});

describe("Test broker.wrapAction", () => {

	let broker = new ServiceBroker();

	it("should not change handler if no middlewares", () => {
		let origHandler = jest.fn();
		let action = {
			name: "list",
			handler: origHandler
		};

		broker.wrapAction(action);
		expect(action.handler).toBe(origHandler);
	});

	it("should wrap middlewares", () => {
		let action = {
			name: "list",
			handler: jest.fn()
		};

		let mw1 = jest.fn(handler => handler);
		let mw2 = jest.fn(handler => handler);

		broker.use(mw1);
		broker.use(mw2);

		broker.wrapAction(action);
		expect(mw1).toHaveBeenCalledTimes(1);
		expect(mw1).toHaveBeenCalledWith(action.handler, action);

		expect(mw2).toHaveBeenCalledTimes(1);
		expect(mw2).toHaveBeenCalledWith(action.handler, action);
	});

});

/*
describe("Test broker.wrapContextInvoke", () => {

	describe("Test wrapping", () => {
		let broker = new ServiceBroker();

		let origHandler = jest.fn(() => Promise.resolve());
		let action = {
			name: "list",
			handler: origHandler
		};

		it("should wrap the handler and set to the action", () => {
			broker.wrapContextInvoke(action, origHandler);
			expect(action.handler).not.toBe(origHandler);
		});
	});

	describe("Test with success response", () => {

		let broker = new ServiceBroker();

		let origHandler = jest.fn(() => Promise.resolve());
		let action = {
			name: "list",
			handler: origHandler
		};
		broker.wrapContextInvoke(action, origHandler);

		it("should call only origHandler", () => {
			let ctx = new Context(broker, action);
			ctx._metricStart = jest.fn();
			ctx._metricFinish = jest.fn();

			return action.handler(ctx).then(() => {
				expect(ctx._metricStart).toHaveBeenCalledTimes(0);
				expect(ctx._metricFinish).toHaveBeenCalledTimes(0);

				expect(origHandler).toHaveBeenCalledTimes(1);
				expect(origHandler).toHaveBeenCalledWith(ctx);
			});
		});

	});

	describe("Test with success resolve & statistics & metrics", () => {

		let broker = new ServiceBroker({
			metrics: true,
			statistics: true
		});
		broker.statistics.addRequest = jest.fn();

		let origHandler = jest.fn(() => Promise.resolve());
		let action = {
			name: "list",
			handler: origHandler
		};
		broker.wrapContextInvoke(action, origHandler);

		it("should call only origHandler", () => {
			let ctx = new Context(broker, action);
			ctx.metrics = true;
			ctx._metricStart = jest.fn();
			ctx._metricFinish = jest.fn();

			return action.handler(ctx).then(() => {
				expect(ctx._metricStart).toHaveBeenCalledTimes(1);
				expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
				expect(broker.statistics.addRequest).toHaveBeenCalledTimes(1);
				expect(broker.statistics.addRequest).toHaveBeenCalledWith("list", 0, null);

				expect(origHandler).toHaveBeenCalledTimes(1);
				expect(origHandler).toHaveBeenCalledWith(ctx);
			});
		});

	});

	describe("Test with error reject & statistics & metrics", () => {

		let broker = new ServiceBroker({
			metrics: true,
			statistics: true
		});
		broker.statistics.addRequest = jest.fn();

		let origHandler = jest.fn(() => Promise.reject(new MoleculerError("Something went wrong!", 402)));
		let action = {
			name: "list",
			handler: origHandler
		};
		broker.wrapContextInvoke(action, origHandler);

		it("should call metrics & statistics methods & origHandler", () => {
			let ctx = new Context(broker, action);
			ctx.metrics = true;
			ctx._metricStart = jest.fn();
			ctx._metricFinish = jest.fn();

			return action.handler(ctx).catch(err => {
				expect(err).toBeInstanceOf(MoleculerError);
				expect(err.message).toBe("Something went wrong!");
				expect(err.ctx).toBe(ctx);
				expect(ctx._metricStart).toHaveBeenCalledTimes(1);
				expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
				expect(ctx._metricFinish).toHaveBeenCalledWith(err);
				expect(broker.statistics.addRequest).toHaveBeenCalledTimes(1);
				expect(broker.statistics.addRequest).toHaveBeenCalledWith("list", 0, 402);

				expect(origHandler).toHaveBeenCalledTimes(1);
				expect(origHandler).toHaveBeenCalledWith(ctx);
			});
		});

	});

	describe("Test with rejected error message", () => {

		let broker = new ServiceBroker();

		let origHandler = jest.fn(() => Promise.reject("My custom error message"));
		let action = {
			name: "list",
			handler: origHandler
		};
		broker.wrapContextInvoke(action, origHandler);

		it("should convert error message to MoleculerError", () => {
			let ctx = new Context(broker, action);

			return action.handler(ctx).catch(err => {
				expect(err).toBeInstanceOf(MoleculerError);
				expect(err.message).toBe("My custom error message");
				expect(err.code).toBe(500);
				expect(err.ctx).toBe(ctx);
			});
		});

	});

});
*/

describe("Test broker.unregisterAction", () => {

	let broker = new ServiceBroker();

	broker.serviceRegistry.unregisterAction = jest.fn(() => true);

	let action = {
		name: "list"
	};

	it("should call unregister of serviceRegistry without nodeID", () => {
		broker.unregisterAction(null, action);

		expect(broker.serviceRegistry.unregisterAction).toHaveBeenCalledTimes(1);
		expect(broker.serviceRegistry.unregisterAction).toHaveBeenCalledWith(null, action);
	});

	it("should call unregister of serviceRegistry with nodeID", () => {
		broker.serviceRegistry.unregisterAction.mockClear();

		broker.unregisterAction("server-2", action);

		expect(broker.serviceRegistry.unregisterAction).toHaveBeenCalledTimes(1);
		expect(broker.serviceRegistry.unregisterAction).toHaveBeenCalledWith("server-2", action);
	});
});

describe("Test broker.registerInternalActions", () => {

	it("should register internal action without statistics", () => {
		let broker = new ServiceBroker({
			statistics: false,
			internalActions: false
		});
		const service = {"name": "$node"};

		broker.registerAction = jest.fn();
		broker.registerInternalActions();

		expect(broker.registerAction).toHaveBeenCalledTimes(4);
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.list", cache: false, handler: jasmine.any(Function), service });
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.services", cache: false, handler: jasmine.any(Function), service });
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.actions", cache: false, handler: jasmine.any(Function), service });
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.health", cache: false, handler: jasmine.any(Function), service });
	});

	it("should register internal action with statistics", () => {
		let broker = new ServiceBroker({
			statistics: true,
			internalActions: false
		});
		const service = {"name": "$node"};

		broker.registerAction = jest.fn();
		broker.registerInternalActions();

		expect(broker.registerAction).toHaveBeenCalledTimes(5);
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.stats", cache: false, handler: jasmine.any(Function), service });
	});
});

describe("Test broker.on", () => {
	let broker = new ServiceBroker();
	broker.bus.on = jest.fn();

	it("should register handler on this.bus", () => {
		broker.on("test.event", jest.fn());

		expect(broker.bus.on).toHaveBeenCalledTimes(1);
		expect(broker.bus.on).toHaveBeenCalledWith("test.event", jasmine.any(Function));
	});
});

describe("Test broker.once", () => {
	let broker = new ServiceBroker();
	broker.bus.once = jest.fn();

	it("should register handler once on this.bus", () => {
		broker.once("test.event", jest.fn());

		expect(broker.bus.once).toHaveBeenCalledTimes(1);
		expect(broker.bus.once).toHaveBeenCalledWith("test.event", jasmine.any(Function));
	});
});

describe("Test broker.off", () => {
	let broker = new ServiceBroker();
	broker.bus.off = jest.fn();

	it("should unregister handler on this.bus", () => {
		broker.off("test.event", jest.fn());

		expect(broker.bus.off).toHaveBeenCalledTimes(1);
		expect(broker.bus.off).toHaveBeenCalledWith("test.event", jasmine.any(Function));
	});
});

describe("Test broker.getService & hasService", () => {
	let broker = new ServiceBroker();
	let service = broker.createService({
		name: "posts"
	});

	it("should find the service by name", () => {
		let found = broker.getService("posts");
		expect(found).toBeDefined();
		expect(found).toBe(service);
		expect(broker.hasService("posts")).toBe(true);
	});

	it("should not find the service by name", () => {
		let found = broker.getService("other");
		expect(found).not.toBeDefined();
		expect(broker.hasService("other")).toBe(false);
	});
});

describe("Test broker.hasAction", () => {
	let broker = new ServiceBroker();
	broker.createService({
		name: "posts",
		actions: {
			list: jest.fn()
		}
	});

	it("should find the action by name", () => {
		expect(broker.hasAction("posts.list")).toBe(true);
	});

	it("should not find the action by name", () => {
		expect(broker.hasAction("posts.create")).toBe(false);
	});
});

describe("Test broker.getAction", () => {
	let broker = new ServiceBroker();
	const list = {
		custom: "hello",
		cache: true,
		handler: jest.fn()
	};
	broker.createService({
		name: "posts",
		actions: {
			list
		}
	});

	it("should find the action by name", () => {
		const { action } = broker.getAction("posts.list");
		expect(action.custom).toBe("hello");
		expect(action.cache).toBe(true);
		expect(action.handler).toBeInstanceOf(Function);
	});

	it("should not find the action by name", () => {
		expect(broker.getAction("posts.create")).toBe(null);
	});
});

describe("Test broker.isActionAvailable", () => {
	let broker = new ServiceBroker();
	broker.createService({
		name: "posts",
		actions: {
			list: jest.fn()
		}
	});

	it("should find handler for action by name", () => {
		expect(broker.hasAction("posts.list")).toBe(true);
		expect(broker.isActionAvailable("posts.list")).toBe(true);
	});

	it("should not find handler for action by name", () => {
		broker.unregisterAction(null, { name: "posts.list" });
		expect(broker.hasAction("posts.list")).toBe(true);
		expect(broker.isActionAvailable("posts.list")).toBe(false);
	});
});

describe("Test broker.use (middleware)", () => {
	let broker = new ServiceBroker({
		validation: false
	});

	it("should be empty middlewares", () => {
		expect(broker.middlewares.length).toBe(0);
	});

	it("should be contains 2 middlewares", () => {
		broker.use(jest.fn());
		broker.use();
		broker.use(jest.fn());

		expect(broker.middlewares.length).toBe(2);
	});

	it("should be contains plus 2 middlewares", () => {
		broker.use(jest.fn(), jest.fn(), null);

		expect(broker.middlewares.length).toBe(4);
	});
});

describe("Test broker.call method", () => {

	describe("Test local call", () => {

		let broker = new ServiceBroker({ internalActions: false, metrics: true });

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

		it("should reject if no action", () => {
			return broker.call("posts.noaction").catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Service 'posts.noaction' is not available!");
				expect(err.data).toEqual({ action: "posts.noaction" });
			});
		});

		it("should reject if no handler", () => {
			broker.unregisterAction(null, { name: "posts.noHandler" });
			return broker.call("posts.noHandler").catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Service 'posts.noHandler' is not available!");
				expect(err.data).toEqual({ action: "posts.noHandler" });
			});
		});

		it("should reject if no action on node", () => {
			broker.unregisterAction(null, { name: "posts.noHandler" });
			return broker.call("posts.noHandler", {}, { nodeID: "node-123"}).catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Service 'posts.noHandler' is not available on 'node-123' node!");
				expect(err.data).toEqual({ action: "posts.noHandler", nodeID: "node-123" });
			});
		});

		it("should call handler with new Context without params", () => {
			let p = broker.call("posts.find");
			return p.then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBeNull();
				expect(ctx.level).toBe(1);
				expect(ctx.requestID).toBeNull();
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual({});
				expect(ctx.metrics).toBe(true);

				expect(p.ctx).toBe(ctx);

				expect(actionHandler).toHaveBeenCalledTimes(1);
				expect(actionHandler).toHaveBeenCalledWith(ctx);
			});
		});

		it("should call handler with new Context with params", () => {
			actionHandler.mockClear();
			let params = { limit: 5, search: "John" };
			return broker.call("posts.find", params).then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual(params);

				expect(actionHandler).toHaveBeenCalledTimes(1);
				expect(actionHandler).toHaveBeenCalledWith(ctx);
			});
		});

		it("should call handler with new Context with requestID", () => {
			actionHandler.mockClear();
			let params = { limit: 5, search: "John" };
			let opts = { requestID: "123", meta: { a: 5 } };
			return broker.call("posts.find", params, opts).then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.requestID).toBe("123"); // need enabled `metrics`
				expect(ctx.meta).toEqual({ a: 5 });

				expect(actionHandler).toHaveBeenCalledTimes(1);
				expect(actionHandler).toHaveBeenCalledWith(ctx);
			});
		});

		it("should call handler with a sub Context", () => {
			actionHandler.mockClear();
			let parentCtx = new Context(broker);
			parentCtx.params = { a: 5 };
			parentCtx.requestID = "555";
			parentCtx.meta = { a: 123 };
			parentCtx.metrics = true;

			return broker.call("posts.find", { b: 10 }, { parentCtx, meta: { b: "Adam" } }).then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBeNull();
				expect(ctx.level).toBe(2);
				expect(ctx.parentID).toBe(parentCtx.id);
				expect(ctx.requestID).toBe("555");
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual({ b: 10 });
				expect(ctx.meta).toEqual({ a: 123, b: "Adam" });
				expect(ctx.metrics).toBe(true);

				expect(actionHandler).toHaveBeenCalledTimes(1);
				expect(actionHandler).toHaveBeenCalledWith(ctx);
			});
		});

		it("should throw Error if reached the 'maxCallLevel'", () => {
			actionHandler.mockClear();
			broker.options.maxCallLevel = 5;
			let parentCtx = new Context(broker);
			parentCtx.level = 5;

			return broker.call("posts.find", { b: 10 }, { parentCtx }).then(() => {
				expect(false).toBe(true);
			}).catch(err => {
				expect(err).toBeInstanceOf(MaxCallLevelError);
				expect(err.code).toBe(500);
				expect(err.data).toEqual({"action": "posts.find", "level": 6});
				expect(actionHandler).toHaveBeenCalledTimes(0);
			});
		});

		it("should call handler with a reused Context", () => {
			actionHandler.mockClear();
			let preCtx = new Context(broker, { name: "posts.find" });
			preCtx.params = { a: 5 };
			preCtx.requestID = "555";
			preCtx.meta = { a: 123 };
			preCtx.metrics = true;

			preCtx._metricStart = jest.fn();
			preCtx._metricFinish = jest.fn();

			return broker.call("posts.find", { b: 10 }, { ctx: preCtx }).then(ctx => {
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

				expect(actionHandler).toHaveBeenCalledTimes(1);
				expect(actionHandler).toHaveBeenCalledWith(ctx);

				expect(preCtx._metricStart).toHaveBeenCalledTimes(1);
				expect(preCtx._metricFinish).toHaveBeenCalledTimes(1);
			});
		});

		it("should call if actionName is an object", () => {
			actionHandler.mockClear();
			let params = { search: "John" };
			let actionItem = broker.getAction("posts.find");
			return broker.call(actionItem, params).then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual(params);

				expect(actionHandler).toHaveBeenCalledTimes(1);
				expect(actionHandler).toHaveBeenCalledWith(ctx);
			});
		});

		it("should call circuitClose if endpoint is in 'half-open' state", () => {
			broker.options.circuitBreaker.enabled = true;
			actionHandler.mockClear();
			let params = { search: "John" };
			let actionItem = broker.getAction("posts.find");
			actionItem.circuitHalfOpen();
			actionItem.circuitClose = jest.fn();
			return broker.call(actionItem, params).then(ctx => {
				expect(ctx).toBeDefined();
				expect(actionHandler).toHaveBeenCalledTimes(1);
				expect(actionItem.circuitClose).toHaveBeenCalledTimes(1);
			});
		});


		it("should call _callErrorHandler if call timed out", () => {
			let clock = lolex.install();
			broker._callErrorHandler = jest.fn((err, ctx, endpoint, opts) => ({ err, ctx, endpoint, opts }));

			let p = broker.call("posts.slow", null, { timeout: 1000 });
			clock.tick(2000);

			p.then(({ err, ctx, endpoint, opts }) => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(Promise.TimeoutError);
				expect(ctx).toBeDefined();
				expect(endpoint).toBeDefined();
				expect(opts).toEqual({ retryCount: 0, timeout: 1000 });

				expect(broker._callErrorHandler).toHaveBeenCalledTimes(1);
				//expect(broker._callErrorHandler).toHaveBeenCalledWith(ctx);

				clock.uninstall();
			});
		});

	});



	describe("Test remote call", () => {

		let broker = new ServiceBroker({
			transporter: new FakeTransporter(),
			internalActions: false,
			metrics: true
		});
		broker.registerAction("server-2", {	name: "user.create", service: { name: "user" } });
		broker.transit.request = jest.fn((ctx) => Promise.resolve({ ctx }));

		it("should call transit.request with new Context without params", () => {
			return broker.call("user.create").then(({ ctx }) => {
				expect(ctx).toBeDefined();
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBe("server-2");
				expect(ctx.level).toBe(1);
				expect(ctx.requestID).toBeNull();
				expect(ctx.action.name).toBe("user.create");
				expect(ctx.params).toEqual({});
				expect(ctx.metrics).toBe(true);

				expect(ctx.timeout).toBe(0);
				expect(ctx.retryCount).toBe(0);

				expect(broker.transit.request).toHaveBeenCalledTimes(1);
				expect(broker.transit.request).toHaveBeenCalledWith(ctx);
			});
		});

		it("should call transit.request with new Context with params & opts", () => {
			broker.transit.request.mockClear();
			let params = { limit: 5, search: "John" };
			return broker.call("user.create", params, { timeout: 1000 }).then(({ ctx }) => {
				expect(ctx).toBeDefined();
				expect(ctx.action.name).toBe("user.create");
				expect(ctx.params).toEqual(params);

				expect(ctx.timeout).toBe(1000);
				expect(ctx.retryCount).toBe(0);

				expect(broker.transit.request).toHaveBeenCalledTimes(1);
				expect(broker.transit.request).toHaveBeenCalledWith(ctx);

				// expect(ctx._metricStart).toHaveBeenCalledTimes(1);
				// expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			});
		});

	});


	describe("Test direct remote call", () => {

		let broker = new ServiceBroker({
			transporter: new FakeTransporter(),
			internalActions: false,
			metrics: true
		});
		const service = { name: "user" };
		broker.registerAction("server-1", {	name: "user.create", service });
		broker.registerAction("server-2", {	name: "user.create", service });
		broker.registerAction("server-3", {	name: "user.create", service });
		broker.registerAction("server-4", {	name: "user.create", service });
		broker.transit.request = jest.fn((ctx) => Promise.resolve({ ctx }));

		it("should call transit.request with nodeID 'server-3'", () => {
			return broker.call("user.create", {}, { nodeID: "server-3" }).then(({ ctx }) => {
				expect(ctx).toBeDefined();
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBe("server-3");
				expect(ctx.level).toBe(1);
				expect(ctx.requestID).toBeNull();
				expect(ctx.action.name).toBe("user.create");
				expect(ctx.params).toEqual({});

				expect(broker.transit.request).toHaveBeenCalledTimes(1);
				expect(broker.transit.request).toHaveBeenCalledWith(ctx);
			});
		});

		it("should call transit.request with nodeID 'server-3'", () => {
			broker.transit.request.mockClear();
			return broker.call("user.create", {}, { nodeID: "server-1" }).then(({ ctx }) => {
				expect(ctx).toBeDefined();
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBe("server-1");
				expect(ctx.level).toBe(1);
				expect(ctx.requestID).toBeNull();
				expect(ctx.action.name).toBe("user.create");
				expect(ctx.params).toEqual({});

				expect(broker.transit.request).toHaveBeenCalledTimes(1);
				expect(broker.transit.request).toHaveBeenCalledWith(ctx);
			});
		});

	});
});

describe("Test broker.mcall", () => {

	let broker = new ServiceBroker({ internalActions: false });
	broker.call = jest.fn(action => Promise.resolve(action));

	it("should call both action & return an array", () => {
		return broker.mcall([
			{ action: "posts.find", params: { limit: 2, offset: 0 }, options: { timeout: 500 } },
			{ action: "users.find", params: { limit: 2, sort: "username" } }
		]).then(res => {
			expect(res).toEqual(["posts.find", "users.find"]);

			expect(broker.call).toHaveBeenCalledTimes(2);
			expect(broker.call).toHaveBeenCalledWith("posts.find", { limit: 2, offset: 0}, { timeout: 500 });
			expect(broker.call).toHaveBeenCalledWith("users.find", { limit: 2, sort: "username"}, undefined);
		});
	});

	it("should call both action & return an object", () => {
		broker.call.mockClear();

		return broker.mcall({
			posts: { action: "posts.find", params: { limit: 2, offset: 0 }, options: { timeout: 500 } },
			users: { action: "users.find", params: { limit: 2, sort: "username" } }
		}).then(res => {
			expect(res).toEqual({ posts: "posts.find", users: "users.find"});

			expect(broker.call).toHaveBeenCalledTimes(2);
			expect(broker.call).toHaveBeenCalledWith("posts.find", { limit: 2, offset: 0}, { timeout: 500 });
			expect(broker.call).toHaveBeenCalledWith("users.find", { limit: 2, sort: "username"}, undefined);
		});
	});

	it("should throw error", () => {
		expect(() => {
			return broker.mcall(6);
		}).toThrowError(MoleculerError);
	});
});


describe("Test broker._callErrorHandler", () => {

	let broker = new ServiceBroker({
		transporter: new FakeTransporter(),
		metrics: true,
		circuitBreaker: {
			enabled: true
		}
	});
	broker.call = jest.fn(() => Promise.resolve());
	let transit = broker.transit;

	let ctx = new Context(broker, { name: "user.create" });
	ctx.nodeID = "server-2";
	ctx.metrics = true;

	let customErr = new MoleculerError("Error", 400);
	let timeoutErr = new RequestTimeoutError("user.create", "server-2");
	ctx._metricFinish = jest.fn();
	transit.removePendingRequest = jest.fn();
	let endpoint = new ServiceRegistry.Endpoint(broker, ctx.nodeID, ctx.action);
	endpoint.failure = jest.fn();

	it("should return error without retryCount & fallbackResponse", () => {
		return broker._callErrorHandler(customErr, ctx, endpoint, {}).catch(err => {
			expect(err).toBe(customErr);
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(err, true);
			expect(transit.removePendingRequest).toHaveBeenCalledTimes(1);
			expect(transit.removePendingRequest).toHaveBeenCalledWith(ctx.id);
			expect(endpoint.failure).toHaveBeenCalledTimes(0);
		});
	});

	it("should call endpoint.failure", () => {
		return broker._callErrorHandler(timeoutErr, ctx, endpoint, {}).catch(() => {
			expect(endpoint.failure).toHaveBeenCalledTimes(1);
		});
	});

	it("should call endpoint.failure if errorCode >= 500", () => {
		endpoint.failure.mockClear();
		return broker._callErrorHandler(new MoleculerError("Wrong", 500), ctx, endpoint, {}).catch(() => {
			expect(endpoint.failure).toHaveBeenCalledTimes(1);
		});
	});

	it("should call endpoint.failure if errorCode >= 500", () => {
		endpoint.failure.mockClear();
		broker.options.circuitBreaker.failureOnReject = false;
		return broker._callErrorHandler(new MoleculerError("Wrong", 500), ctx, endpoint, {}).catch(() => {
			expect(endpoint.failure).toHaveBeenCalledTimes(0);
		});
	});

	it("should convert error text to MoleculerError", () => {
		return broker._callErrorHandler("Something happened", ctx, endpoint, {}).catch(err => {
			expect(err).toBeInstanceOf(MoleculerError);
			expect(broker.call).toHaveBeenCalledTimes(0);
		});
	});

	it("should convert Promise.TimeoutError to RequestTimeoutError", () => {
		endpoint.failure.mockClear();
		return broker._callErrorHandler(new Promise.TimeoutError, ctx, endpoint, {}).catch(err => {
			expect(err).toBeInstanceOf(RequestTimeoutError);
			expect(err.message).toBe("Request timed out when call 'user.create' action on 'server-2' node!");
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(endpoint.failure).toHaveBeenCalledTimes(1);
		});
	});

	it("should not call endpoint.failure if failureOnTimeout is false", () => {
		broker.options.circuitBreaker.failureOnTimeout = false;
		endpoint.failure.mockClear();
		return broker._callErrorHandler(timeoutErr, ctx, endpoint, {}).catch(() => {
			expect(endpoint.failure).toHaveBeenCalledTimes(0);
		});
	});

	it("should retry call if retryCount > 0", () => {
		ctx._metricFinish.mockClear();
		ctx.retryCount = 2;

		return broker._callErrorHandler(timeoutErr, ctx, endpoint, {}).then(() => {
			expect(broker.call).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledWith("user.create", {}, { ctx });

			expect(ctx.retryCount).toBe(1);
			expect(ctx._metricFinish).toHaveBeenCalledTimes(0);
		});
	});

	it("should return with the fallbackResponse data", () => {
		ctx._metricFinish.mockClear();
		broker.call.mockClear();

		let otherRes = {};
		return broker._callErrorHandler(customErr, ctx, endpoint, { fallbackResponse: otherRes }).then(res => {
			expect(res).toBe(otherRes);
			expect(broker.call).toHaveBeenCalledTimes(0);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(customErr, true);
		});
	});

	it("should return with the fallbackResponse function returned data", () => {
		broker.call.mockClear();
		ctx.metrics = false;
		ctx._metricFinish.mockClear();

		let otherRes = { a: 5 };
		let otherFn = jest.fn(() => Promise.resolve(otherRes));
		return broker._callErrorHandler(customErr, ctx, endpoint, { fallbackResponse: otherFn }).then(res => {
			expect(res).toBe(otherRes);
			expect(otherFn).toHaveBeenCalledTimes(1);
			expect(otherFn).toHaveBeenCalledWith(ctx, customErr);
			expect(broker.call).toHaveBeenCalledTimes(0);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(0);
		});
	});
});

describe("Test broker._finishCall", () => {

	describe("metrics enabled", () => {
		let broker = new ServiceBroker({ metrics: true });
		let ctx = new Context(broker, { name: "user.create" });
		ctx.nodeID = "server-2";
		ctx.metrics = true;
		ctx._metricFinish = jest.fn();

		it("should call ctx._metricFinish", () => {
			broker._finishCall(ctx, null);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(null, true);
		});

		it("should call ctx._metricFinish with error", () => {
			ctx._metricFinish.mockClear();

			let err = new MoleculerError("");
			broker._finishCall(ctx, err);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(err, true);
		});
	});

	describe("statistics enabled", () => {
		let broker = new ServiceBroker({ metrics: false, statistics: true });
		broker.statistics.addRequest = jest.fn();
		let ctx = new Context(broker, { name: "user.create" });
		ctx.nodeID = "server-2";
		ctx.metrics = false;
		ctx._metricFinish = jest.fn();

		it("should call ctx._metricFinish", () => {
			broker._finishCall(ctx, null);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(null, false);

			expect(broker.statistics.addRequest).toHaveBeenCalledTimes(1);
			expect(broker.statistics.addRequest).toHaveBeenCalledWith("user.create", 0, null);
		});

		it("should call ctx._metricFinish with error", () => {
			ctx._metricFinish.mockClear();
			broker.statistics.addRequest.mockClear();

			let err = new MoleculerError("", 505);
			broker._finishCall(ctx, err);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(err, false);

			expect(broker.statistics.addRequest).toHaveBeenCalledTimes(1);
			expect(broker.statistics.addRequest).toHaveBeenCalledWith("user.create", 0, 505);
		});
	});

	describe("metrics & statistics enabled", () => {
		let broker = new ServiceBroker({ metrics: true, statistics: true });
		broker.statistics.addRequest = jest.fn();
		let ctx = new Context(broker, { name: "user.create" });
		ctx.nodeID = "server-2";
		ctx.metrics = true;
		ctx._metricFinish = jest.fn();

		it("should call statistics.addRequest", () => {
			broker._finishCall(ctx, null);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(null, true);

			expect(broker.statistics.addRequest).toHaveBeenCalledTimes(1);
			expect(broker.statistics.addRequest).toHaveBeenCalledWith("user.create", 0, null);
		});

		it("should call statistics.addRequest with error", () => {
			ctx._metricFinish.mockClear();
			broker.statistics.addRequest.mockClear();
			let err = new MoleculerError("", 505);
			broker._finishCall(ctx, err);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(err, true);

			expect(broker.statistics.addRequest).toHaveBeenCalledTimes(1);
			expect(broker.statistics.addRequest).toHaveBeenCalledWith("user.create", 0, 505);
		});
	});
});

describe("Test broker.emit", () => {
	let broker = new ServiceBroker();
	broker.emitLocal = jest.fn();

	it("should call emitLocal without payload", () => {
		broker.emit("test.event");

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("test.event", undefined);
	});

	it("should call emitLocal with object payload", () => {
		broker.emitLocal.mockClear();
		broker.emit("user.event", { name: "John" });

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("user.event", { name: "John" });
	});
});

describe("Test broker.emit with transporter", () => {
	let broker = new ServiceBroker({ transporter: new FakeTransporter });
	broker.transit.emit = jest.fn();
	broker.emitLocal = jest.fn();

	it("should call transit.emit with object payload", () => {
		broker.transit.emit.mockClear();
		broker.emit("user.event", { name: "John" });

		expect(broker.transit.emit).toHaveBeenCalledTimes(1);
		expect(broker.transit.emit).toHaveBeenCalledWith("user.event", { name: "John" });
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("user.event", { name: "John" });
	});
});

describe("Test broker.shouldMetric", () => {

	describe("Test broker.shouldMetric with 0.25", () => {
		let broker = new ServiceBroker({ transporter: new FakeTransporter, metrics: true, metricsRate: 0.25 });

		it("should return true only all 1/4 calls", () => {
			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(true);

			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(true);
		});
	});

	describe("Test broker.shouldMetric with 1", () => {
		let broker = new ServiceBroker({ transporter: new FakeTransporter, metrics: true, metricsRate: 1 });

		it("should return true all calls", () => {
			expect(broker.shouldMetric()).toBe(true);
			expect(broker.shouldMetric()).toBe(true);
			expect(broker.shouldMetric()).toBe(true);
			expect(broker.shouldMetric()).toBe(true);
			expect(broker.shouldMetric()).toBe(true);
		});
	});

	describe("Test broker.shouldMetric with 0", () => {
		let broker = new ServiceBroker({ transporter: new FakeTransporter, metrics: true, metricsRate: 0 });

		it("should return false all calls", () => {
			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(false);
			expect(broker.shouldMetric()).toBe(false);
		});
	});
});

describe("Test broker.emitLocal", () => {
	let broker = new ServiceBroker();
	broker.bus.emit = jest.fn();

	it("should call bus.emit without payload", () => {
		broker.emit("test.event");

		expect(broker.bus.emit).toHaveBeenCalledTimes(1);
		expect(broker.bus.emit).toHaveBeenCalledWith("test.event", undefined, null);
	});

	it("should call bus.emit with object payload", () => {
		broker.bus.emit.mockClear();
		broker.emit("user.event", { name: "John" });

		expect(broker.bus.emit).toHaveBeenCalledTimes(1);
		expect(broker.bus.emit).toHaveBeenCalledWith("user.event", { name: "John" }, null);
	});
});

