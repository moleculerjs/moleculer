"use strict";

const path = require("path");
const Promise = require("bluebird");
const ServiceBroker = require("../../src/service-broker");
const Service = require("../../src/service");
const ServiceRegistry = require("../../src/service-registry");
const Context = require("../../src/context");
const Transit = require("../../src/transit");
const MemoryCacher = require("../../src/cachers/memory");
const JSONSerializer = require("../../src/serializers/json");
const FakeTransporter = require("../../src/transporters/fake"); 
const { CustomError, ServiceNotFoundError, RequestTimeoutError } = require("../../src/errors");

describe("Test ServiceBroker constructor", () => {

	it("should set default options", () => {
		let broker = new ServiceBroker();
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({ 
			nodeID: null,

			logger: null,
			logLevel: "info",

			transporter: null, 
			requestTimeout: 0, 
			requestRetry: 0, 
			heartbeatInterval: 10, 
			heartbeatTimeout : 30, 
			
			cacher: null,
			serializer: null,
			
			validation: true, 
			metrics: false, 
			metricsRate: 1, 
			metricsSendInterval: 5 * 1000,
			statistics: false,
			internalActions: true 
		});

		expect(broker.Promise).toBe(Promise);

		expect(broker.ServiceFactory).toBe(Service);
		expect(broker.ContextFactory).toBe(Context);

		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());

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
	});

	it("should merge options", () => {
		let broker = new ServiceBroker( { 
			heartbeatTimeout: 20, 
			metrics: true, 
			metricsRate: 0.5,
			metricsSendInterval: 10 * 1000,
			statistics: true,
			logLevel: "debug", 
			requestRetry: 3, 
			requestTimeout: 5000, 
			validation: false, 
			internalActions: false });

		expect(broker).toBeDefined();
		expect(broker.options).toEqual({ 
			nodeID: null,
			logger: null,
			logLevel: "debug", 
			cacher: null,
			serializer: null,
			transporter: null,
			metrics: true, 
			metricsRate: 0.5,
			metricsSendInterval: 10 * 1000,
			statistics: true,
			heartbeatTimeout : 20, 
			heartbeatInterval: 10, 
			requestRetry: 3, 
			requestTimeout: 5000, 
			validation: false, 
			internalActions: false });
		expect(broker.services).toBeInstanceOf(Array);
		expect(broker.serviceRegistry).toBeInstanceOf(ServiceRegistry);
		expect(broker.transit).toBeUndefined();
		expect(broker.statistics).toBeDefined();
		expect(broker.validator).toBeUndefined();
		expect(broker.serializer).toBeInstanceOf(JSONSerializer);
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());

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
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());
	});

	it("should create cacher and call init", () => {
		let cacher = new MemoryCacher();
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

describe("Test broker.start", () => {

	let broker;

	let schema = {
		name: "test",
		started: jest.fn()
	};

	beforeAll(() => {
		broker = new ServiceBroker({
			metrics: true,
			statistics: true,
			transporter: new FakeTransporter()
		});

		broker.createService(schema);

		broker.transit.connect = jest.fn(() => Promise.resolve()); 

		return broker.start();
	});

	it("should call started of services", () => {
		expect(schema.started).toHaveBeenCalledTimes(1);
	});

	it("should create metrics timer", () => {
		expect(broker.metricsTimer).toBeDefined();
	});

	it("should call transit.connect", () => {
		expect(broker.transit.connect).toHaveBeenCalledTimes(1);
	});

});

describe("Test broker.stop", () => {

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

		return broker.start().then(() => broker.stop());
	});

	it("should call stopped of services", () => {
		expect(schema.stopped).toHaveBeenCalledTimes(1);
	});

	it("should destroy metrics timer", () => {
		expect(broker.metricsTimer).toBeNull();
	});

	it("should disconnect transit", () => {
		expect(broker.transit.disconnect).toHaveBeenCalledTimes(1);
	});

});

describe("Test broker.getLogger", () => {

	let broker = new ServiceBroker();

	let logger1 = broker.getLogger("test");
	let logger2 = broker.getLogger("other");
	let logger3 = broker.getLogger("test");

	expect(logger1).not.toBe(logger2);
	expect(logger1).toBe(logger3);

	expect(Object.keys(broker._loggerCache).length).toBe(2 + 1); // +1 logger of broker
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

});

describe("Test broker.registerService", () => {

	let broker = new ServiceBroker();
	broker.emitLocal = jest.fn();
	
	it("should push to the services & emit an event", () => {
		let service = {
			name: "test"
		};

		broker.registerService(service);
		expect(broker.services.length).toBe(1);
		expect(broker.services[0]).toBe(service);
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("register.service.test", service);
	});

});

describe("Test broker.registerAction", () => {

	let broker = new ServiceBroker();
	broker.wrapAction = jest.fn();
	broker.emitLocal = jest.fn();
	
	it("should push to the actions & emit an event", () => {
		let action = {
			name: "list"
		};

		broker.registerAction(null, action);
		expect(broker.wrapAction).toHaveBeenCalledTimes(1);
		expect(broker.hasAction("list")).toBe(true);
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("register.action.list", { action, nodeID: null });
	});

	it("should push to the actions & emit an event with nodeID", () => {
		broker.wrapAction.mockClear();
		broker.emitLocal.mockClear();
		let action = {
			name: "update"
		};

		broker.registerAction("server-2", action);
		expect(broker.wrapAction).toHaveBeenCalledTimes(0);
		expect(broker.hasAction("update")).toBe(true);
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("register.action.update", { action, nodeID: "server-2" });
	});

});

describe("Test broker.wrapAction", () => {

	let broker = new ServiceBroker();
	//broker.wrapContextInvoke = jest.fn();
	
	it("should run middlewares & call wrapContextInvoke method", () => {
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

		// expect(broker.wrapContextInvoke).toHaveBeenCalledTimes(1);
		// expect(broker.wrapContextInvoke).toHaveBeenCalledWith(action, action.handler);
	});

});

describe.skip("Test broker.wrapContextInvoke", () => {

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

		let origHandler = jest.fn(() => Promise.reject(new CustomError("Something went wrong!", 402)));
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
				expect(err).toBeInstanceOf(CustomError);
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
		
		it("should convert error message to CustomError", () => {
			let ctx = new Context(broker, action);

			return action.handler(ctx).catch(err => {
				expect(err).toBeInstanceOf(CustomError);
				expect(err.message).toBe("My custom error message");
				expect(err.code).toBe(500);
				expect(err.ctx).toBe(ctx);
			});
		});

	});

});

describe.skip("Test broker.unregisterAction", () => {

	let broker = new ServiceBroker();

	let action = {
		name: "list"
	};

	broker.registerAction(null, action);
	broker.registerAction("server-2", action);
	
	it("should contains 2 items", () => {
		let item = broker.getAction("list");
		expect(item).toBeDefined();
		expect(item.list.length).toBe(2);
	});

	it("should remove action from list by nodeID", () => {
		broker.unregisterAction(action);
		let item = broker.getAction("list");
		expect(item).toBeDefined();
		expect(item.list.length).toBe(1);
		expect(item.get().nodeID).toBe("server-2");
	});

	it("should remove last item from list", () => {
		broker.unregisterAction(action, "server-2");
		let item = broker.getAction("list");
		expect(item).toBeDefined();
		expect(item.list.length).toBe(0);
	});
});

describe("Test broker.registerInternalActions", () => {

	it("should register internal action without statistics", () => {
		let broker = new ServiceBroker({
			statistics: false,
			internalActions: false
		});
		broker.registerAction = jest.fn();
		broker.registerInternalActions();
		
		expect(broker.registerAction).toHaveBeenCalledTimes(4);
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.list", cache: false, handler: jasmine.any(Function) });
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.services", cache: false, handler: jasmine.any(Function) });
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.actions", cache: false, handler: jasmine.any(Function) });
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.health", cache: false, handler: jasmine.any(Function) });
	});

	it("should register internal action with statistics", () => {
		let broker = new ServiceBroker({
			statistics: true,
			internalActions: false
		});
		broker.registerAction = jest.fn();
		broker.registerInternalActions();
		
		expect(broker.registerAction).toHaveBeenCalledTimes(5);
		expect(broker.registerAction).toHaveBeenCalledWith(null, { name: "$node.stats", cache: false, handler: jasmine.any(Function) });
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
		const action = broker.getAction("posts.list").data;
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
				noHandler: jest.fn()
			}
		});
			
		it("should reject if no action", () => {
			return broker.call("posts.noaction").catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Action 'posts.noaction' is not registered!");
				expect(err.action).toBe("posts.noaction");
			});
		});

		it("should reject if no handler", () => {
			broker.unregisterAction(null, { name: "posts.noHandler" });
			return broker.call("posts.noHandler").catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Not available 'posts.noHandler' action handler!");
				expect(err.action).toBe("posts.noHandler");
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

	});



	describe("Test remote call", () => {

		let broker = new ServiceBroker({ 
			transporter: new FakeTransporter(), 
			internalActions: false, 
			metrics: true
		});
		broker.registerAction("server-2", {	name: "user.create" });
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
});

describe("Test broker._callErrorHandler", () => {

	let broker = new ServiceBroker({ transporter: new FakeTransporter(), metrics: true });
	broker.nodeUnavailable = jest.fn();
	broker.call = jest.fn(() => Promise.resolve());
	let transit = broker.transit;
	
	let ctx = new Context(broker, { name: "user.create" });
	ctx.nodeID = "server-2";
	ctx.metrics = true;

	let customErr = new CustomError("Error", 400);
	let timeoutErr = new RequestTimeoutError("user.create", "server-2");
	ctx._metricFinish = jest.fn();
	transit.removePendingRequest = jest.fn();

	it("should return error without retryCount & fallbackResponse", () => {
		return broker._callErrorHandler(customErr, ctx, {}).catch(err => {
			expect(err).toBe(customErr);
			expect(broker.nodeUnavailable).toHaveBeenCalledTimes(0);
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(err);
			expect(transit.removePendingRequest).toHaveBeenCalledTimes(1);
			expect(transit.removePendingRequest).toHaveBeenCalledWith(ctx.id);
		});
	});

	it("should call nodeUnavailable if error code is greater than 500", () => {
		return broker._callErrorHandler(timeoutErr, ctx, {}).catch(err => {
			expect(err).toBe(timeoutErr);
			expect(broker.nodeUnavailable).toHaveBeenCalledTimes(1);
			expect(broker.nodeUnavailable).toHaveBeenCalledWith("server-2");
			expect(broker.call).toHaveBeenCalledTimes(0);
		});
	});

	it("should convert error text to CustomError", () => {
		broker.nodeUnavailable.mockClear();

		return broker._callErrorHandler("Something happened", ctx, {}).catch(err => {
			expect(err).toBeInstanceOf(CustomError);
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(broker.nodeUnavailable).toHaveBeenCalledTimes(1);
			expect(broker.nodeUnavailable).toHaveBeenCalledWith("server-2");
		});
	});

	it("should convert Promise.TimeoutError to RequestTimeoutError", () => {
		broker.nodeUnavailable.mockClear();

		return broker._callErrorHandler(new Promise.TimeoutError, ctx, {}).catch(err => {
			expect(err).toBeInstanceOf(RequestTimeoutError);
			expect(err.message).toBe("Request timed out when call 'user.create' action on 'server-2' node!");
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(broker.nodeUnavailable).toHaveBeenCalledTimes(1);
			expect(broker.nodeUnavailable).toHaveBeenCalledWith("server-2");
		});
	});	

	it("should retry call if retryCount > 0", () => {
		ctx._metricFinish.mockClear();
		broker.nodeUnavailable.mockClear();
		ctx.retryCount = 2;

		return broker._callErrorHandler(timeoutErr, ctx, {}).then(() => {
			expect(broker.call).toHaveBeenCalledTimes(1);
			expect(broker.call).toHaveBeenCalledWith("user.create", {}, { ctx });
			expect(broker.nodeUnavailable).toHaveBeenCalledTimes(0);

			expect(ctx.retryCount).toBe(1);
			expect(ctx._metricFinish).toHaveBeenCalledTimes(0);
		});
	});

	it("should return with the fallbackResponse data", () => {
		ctx._metricFinish.mockClear();
		broker.nodeUnavailable.mockClear();
		broker.call.mockClear();

		let otherRes = {};
		return broker._callErrorHandler(customErr, ctx, { fallbackResponse: otherRes }).then(res => {
			expect(res).toBe(otherRes);
			expect(broker.nodeUnavailable).toHaveBeenCalledTimes(0);
			expect(broker.call).toHaveBeenCalledTimes(0);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(customErr);
		});
	});

	it("should return with the fallbackResponse function returned data", () => {
		broker.nodeUnavailable.mockClear();
		broker.call.mockClear();
		ctx.metrics = false;
		ctx._metricFinish.mockClear();

		let otherRes = { a: 5 };
		let otherFn = jest.fn(() => Promise.resolve(otherRes));
		return broker._callErrorHandler(customErr, ctx, { fallbackResponse: otherFn }).then(res => {
			expect(res).toBe(otherRes);
			expect(otherFn).toHaveBeenCalledTimes(1);
			expect(otherFn).toHaveBeenCalledWith(ctx);
			expect(broker.nodeUnavailable).toHaveBeenCalledTimes(0);
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
			expect(ctx._metricFinish).toHaveBeenCalledWith(null);
		});

		it("should call ctx._metricFinish with error", () => {
			ctx._metricFinish.mockClear();
			let err = new CustomError("");
			broker._finishCall(ctx, err);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(err);
		});
	});

	describe("metrics & statistics enabled", () => {
		let broker = new ServiceBroker({ metrics: true, statistics: true });
		broker.statistics.addRequest = jest.fn();
		let ctx = new Context(broker, { name: "user.create" });
		ctx.nodeID = "server-2";
		ctx.metrics = true;
		ctx._metricFinish = jest.fn();

		it("should call ctx._metricFinish", () => {
			broker._finishCall(ctx, null);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(null);
		});

		it("should call ctx._metricFinish with error", () => {
			ctx._metricFinish.mockClear();
			let err = new CustomError("", 505);
			broker._finishCall(ctx, err);

			expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
			expect(ctx._metricFinish).toHaveBeenCalledWith(err);
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
		expect(broker.bus.emit).toHaveBeenCalledWith("test.event", undefined, undefined);
	});

	it("should call bus.emit with object payload", () => {
		broker.bus.emit.mockClear();
		broker.emit("user.event", { name: "John" });
		
		expect(broker.bus.emit).toHaveBeenCalledTimes(1);
		expect(broker.bus.emit).toHaveBeenCalledWith("user.event", { name: "John" }, undefined);
	});
});

describe.skip("Test broker.getLocalActionList", () => {
	let broker = new ServiceBroker();

	broker.createService({
		name: "posts",
		version: 2,
		actions: {
			list: {
				cache: true,
				params: { limit: "number" },
				handler: jest.fn()
			}
		}
	});

	broker.loadService("./test/services/math.service.js");
	broker.registerAction("server-2", { name: "remote.action" });

	it("should returns with local action list", () => {
		let res = broker.getLocalActionList();
		
		expect(Object.keys(res).length).toBe(5);

		expect(res["v2.posts.list"].name).toBe("v2.posts.list");
		expect(res["v2.posts.list"].version).toBe(2);
		expect(res["v2.posts.list"].cache).toBe(true);
		expect(res["v2.posts.list"].params).toEqual({ limit: "number" });
		expect(res["v2.posts.list"].handler).toBeUndefined();
		expect(res["v2.posts.list"].service).toBeUndefined();
		
	});
});
