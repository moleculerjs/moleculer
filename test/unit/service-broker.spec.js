"use strict";

const Promise = require("bluebird");
const utils = require("../../src/utils");
const ServiceBroker = require("../../src/service-broker");
const Service = require("../../src/service");
const Context = require("../../src/context");
const Transit = require("../../src/transit");
const MemoryCacher = require("../../src/cachers/memory");
const FakeTransporter = require("../../src/transporters/fake");
const { CustomError, ServiceNotFoundError, RequestTimeoutError, ValidationError } = require("../../src/errors");
const lolex = require("lolex");
const defaults = require("lodash/defaults");

describe("Test ServiceBroker constructor", () => {

	it("should set default options", () => {
		let broker = new ServiceBroker();
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({ 
			nodeID: null,

			logger: null,
			logLevel: "info",

			transporter: null, 
			requestTimeout: 15000, 
			requestRetry: 0, 
			sendHeartbeatTime: 10, 
			nodeHeartbeatTimeout : 30, 
			
			cacher: null,
			
			validation: true, 
			metrics: false, 
			metricsNodeTime: 5 * 1000,
			statistics: false,
			internalActions: true 
		});

		expect(broker.ServiceFactory).toBe(Service);
		expect(broker.ContextFactory).toBe(Context);

		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());

		expect(broker.logger).toBeDefined();
		
		expect(broker.bus).toBeDefined();

		expect(broker.nodes).toBeInstanceOf(Map);
		expect(broker.services).toBeInstanceOf(Array);
		expect(broker.actions).toBeInstanceOf(Map);
		
		expect(broker.middlewares).toBeInstanceOf(Array);

		expect(broker.cacher).toBeNull();
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
			nodeHeartbeatTimeout: 20, 
			metrics: true, 
			metricsNodeTime: 10 * 1000,
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
			transporter: null,
			metrics: true, 
			metricsNodeTime: 10 * 1000,
			statistics: true,
			nodeHeartbeatTimeout : 20, 
			sendHeartbeatTime: 10, 
			requestRetry: 3, 
			requestTimeout: 5000, 
			validation: false, 
			internalActions: false });
		expect(broker.services).toBeInstanceOf(Array);
		expect(broker.actions).toBeInstanceOf(Map);
		expect(broker.transit).toBeUndefined();
		expect(broker.statistics).toBeDefined();
		expect(broker.validator).toBeUndefined();
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

	it("should call transit.connect & create transit timers", () => {
		expect(broker.transit.connect).toHaveBeenCalledTimes(1);
		expect(broker.heartBeatTimer).toBeDefined();
		expect(broker.checkNodesTimer).toBeDefined();
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

	it("should disconnect transit & destroy timers", () => {
		expect(broker.transit.disconnect).toHaveBeenCalledTimes(1);
		expect(broker.heartBeatTimer).toBeNull();
		expect(broker.checkNodesTimer).toBeNull();
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
	
	it("should found 3 services", () => {
		let count = broker.loadServices("./test/services");
		expect(count).toBe(3);
		expect(broker.loadService).toHaveBeenCalledTimes(3);
		expect(broker.loadService).toHaveBeenCalledWith("test/services/user.service.js");
		expect(broker.loadService).toHaveBeenCalledWith("test/services/post.service.js");
		expect(broker.loadService).toHaveBeenCalledWith("test/services/math.service.js");
	});

	it("should found 3 services", () => {
		broker.loadService.mockClear();
		let count = broker.loadServices("./test/services", "user.*.js");
		expect(count).toBe(1);
		expect(broker.loadService).toHaveBeenCalledTimes(1);
		expect(broker.loadService).toHaveBeenCalledWith("test/services/user.service.js");
	});

	it("should found 3 services", () => {
		broker.loadService.mockClear();
		let count = broker.loadServices();
		expect(count).toBe(0);
		expect(broker.loadService).toHaveBeenCalledTimes(0);
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

		broker.registerAction(action);
		expect(broker.wrapAction).toHaveBeenCalledTimes(1);
		expect(broker.actions.get("list")).toBeDefined();
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("register.action.list", { action, nodeID: undefined });
	});

	it("should push to the actions & emit an event with nodeID", () => {
		broker.wrapAction.mockClear();
		broker.emitLocal.mockClear();
		let action = {
			name: "update"
		};

		broker.registerAction(action, "server-2");
		expect(broker.wrapAction).toHaveBeenCalledTimes(0);
		expect(broker.actions.get("update")).toBeDefined();
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("register.action.update", { action, nodeID: "server-2" });
	});

});

describe("Test broker.wrapAction", () => {

	let broker = new ServiceBroker();
	broker.wrapContextInvoke = jest.fn();
	
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

		expect(broker.wrapContextInvoke).toHaveBeenCalledTimes(1);
		expect(broker.wrapContextInvoke).toHaveBeenCalledWith(action, action.handler);
	});

});

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
			let ctx = new Context({ broker, action });
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
			let ctx = new Context({ broker, action });
			ctx._metricStart = jest.fn();
			ctx._metricFinish = jest.fn();

			return action.handler(ctx).then(() => {
				expect(ctx._metricStart).toHaveBeenCalledTimes(1);
				expect(ctx._metricFinish).toHaveBeenCalledTimes(1);
				expect(broker.statistics.addRequest).toHaveBeenCalledTimes(1);
				expect(broker.statistics.addRequest).toHaveBeenCalledWith("list", undefined, null);

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
			let ctx = new Context({ broker, action });
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
				expect(broker.statistics.addRequest).toHaveBeenCalledWith("list", undefined, 402);

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
			let ctx = new Context({ broker, action });

			return action.handler(ctx).catch(err => {
				expect(err).toBeInstanceOf(CustomError);
				expect(err.message).toBe("My custom error message");
				expect(err.code).toBe(500);
				expect(err.ctx).toBe(ctx);
			});
		});

	});

});

describe("Test broker.unregisterAction", () => {

	let broker = new ServiceBroker();

	let action = {
		name: "list"
	};

	broker.registerAction(action);
	broker.registerAction(action, "server-2");
	
	it("should contains 2 items", () => {
		let item = broker.actions.get("list");
		expect(item).toBeDefined();
		expect(item.list.length).toBe(2);
	});

	it("should remove action from list by nodeID", () => {
		broker.unregisterAction(action);
		let item = broker.actions.get("list");
		expect(item).toBeDefined();
		expect(item.list.length).toBe(1);
		expect(item.get().nodeID).toBe("server-2");
	});

	it("should remove last item from list", () => {
		broker.unregisterAction(action, "server-2");
		let item = broker.actions.get("list");
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
		expect(broker.registerAction).toHaveBeenCalledWith({ name: "$node.list", cache: false, handler: jasmine.any(Function) });
		expect(broker.registerAction).toHaveBeenCalledWith({ name: "$node.services", cache: false, handler: jasmine.any(Function) });
		expect(broker.registerAction).toHaveBeenCalledWith({ name: "$node.actions", cache: false, handler: jasmine.any(Function) });
		expect(broker.registerAction).toHaveBeenCalledWith({ name: "$node.health", cache: false, handler: jasmine.any(Function) });
	});

	it("should register internal action with statistics", () => {
		let broker = new ServiceBroker({
			statistics: true,
			internalActions: false
		});
		broker.registerAction = jest.fn();
		broker.registerInternalActions();
		
		expect(broker.registerAction).toHaveBeenCalledTimes(5);
		expect(broker.registerAction).toHaveBeenCalledWith({ name: "$node.stats", cache: false, handler: jasmine.any(Function) });
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
		broker.unregisterAction({ name: "posts.list" });
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
			});
		});

		it("should reject if no handler", () => {
			broker.unregisterAction({ name: "posts.noHandler" });
			return broker.call("posts.noHandler").catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(ServiceNotFoundError);
				expect(err.message).toBe("Not available 'posts.noHandler' action handler!");
			});
		});

		it("should call handler with new Context without params", () => {
			return broker.call("posts.find").then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBeUndefined();
				expect(ctx.level).toBe(1);
				expect(ctx.parent).toBeUndefined();
				expect(ctx.requestID).toBe(ctx.id);
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual({});
				expect(ctx.metrics).toBe(true);

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
			let opts = { requestID: "123" };
			return broker.call("posts.find", params, opts).then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.requestID).toBe("123"); // need enabled `metrics`

				expect(actionHandler).toHaveBeenCalledTimes(1);
				expect(actionHandler).toHaveBeenCalledWith(ctx);
			});
		});

		it("should call handler with a sub Context", () => {
			actionHandler.mockClear();
			let parentCtx = new Context({ broker, params: { a: 5 }, requestID: "555", metrics: true });
			return broker.call("posts.find", { b: 10 }, { parentCtx }).then(ctx => {
				expect(ctx).toBeDefined();
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBeUndefined();
				expect(ctx.level).toBe(2);
				expect(ctx.parent).toBe(parentCtx);
				expect(ctx.requestID).toBe("555");
				expect(ctx.action.name).toBe("posts.find");
				expect(ctx.params).toEqual({ b: 10 });
				expect(ctx.metrics).toBe(true);

				expect(actionHandler).toHaveBeenCalledTimes(1);
				expect(actionHandler).toHaveBeenCalledWith(ctx);
			});
		});

	});
	describe("Test remote call", () => {

		let broker = new ServiceBroker({ internalActions: false, metrics: true });
		broker.registerAction({	name: "user.create" }, "server-2");
		broker._remoteCall = jest.fn((ctx, opts) => Promise.resolve({ ctx, opts }));
			
		it("should call remoteCall with new Context without params", () => {
			return broker.call("user.create").then(({ ctx, opts}) => {
				expect(ctx).toBeDefined();
				expect(ctx.broker).toBe(broker);
				expect(ctx.nodeID).toBe("server-2");
				expect(ctx.level).toBe(1);
				expect(ctx.parent).toBeUndefined();
				expect(ctx.requestID).toBe(ctx.id);
				expect(ctx.action.name).toBe("user.create");
				expect(ctx.params).toEqual({});
				expect(ctx.metrics).toBe(true);
				
				expect(opts).toEqual({});

				expect(broker._remoteCall).toHaveBeenCalledTimes(1);
				expect(broker._remoteCall).toHaveBeenCalledWith(ctx, opts);
			});
		});
		
		it("should call handler with new Context with params & opts", () => {
			broker._remoteCall.mockClear();
			let params = { limit: 5, search: "John" };
			return broker.call("user.create", params, { timeout: 5000 }).then(({ ctx, opts}) => {
				expect(ctx).toBeDefined();
				expect(ctx.action.name).toBe("user.create");
				expect(ctx.params).toEqual(params);

				expect(opts).toEqual({ timeout: 5000 });

				expect(broker._remoteCall).toHaveBeenCalledTimes(1);
				expect(broker._remoteCall).toHaveBeenCalledWith(ctx, opts);
			});
		});

	});
});

/*
describe("Test broker.registerInternalActions", () => {
	let broker = new ServiceBroker({
		statistics: true,
		internalActions: true 			
	});

	it("should register $node.stats internal action", () => {
		expect(broker.hasAction("$node.list")).toBe(true);
		expect(broker.hasAction("$node.services")).toBe(true);
		expect(broker.hasAction("$node.actions")).toBe(true);
		expect(broker.hasAction("$node.health")).toBe(true);
		expect(broker.hasAction("$node.stats")).toBe(true);
	});

	broker.loadService("./test/services/math.service");
	broker.loadService("./test/services/post.service");

	it("should return list of services", () => {
		return broker.call("$node.services").then(res => {
			expect(res).toEqual([
				{"name": "math", "version": undefined}, 
				{"name": "posts", "version": undefined}
			]);
		});
	});

	it("should return list of actions", () => {
		return broker.call("$node.actions").then(res => {
			expect(res).toEqual([
				{"name": "$node.list"}, 
				{"name": "$node.services"}, 
				{"name": "$node.actions"}, 
				{"name": "$node.health"}, 
				{"name": "$node.stats"}, 

				{"name": "math.add"}, 
				{"name": "math.sub"}, 
				{"name": "math.mult"}, 
				{"name": "math.div"}, 
				
				{"name": "posts.find"}, 
				{"name": "posts.delayed"}, 
				{"name": "posts.get"}, 
				{"name": "posts.author"}
			]);
		});
	});

	it("should return health of node", () => {
		return broker.call("$node.health").then(res => {
			expect(res).toBeDefined();
			expect(res.cpu).toBeDefined();
			expect(res.mem).toBeDefined();
			expect(res.net).toBeDefined();
			expect(res.os).toBeDefined();
			expect(res.process).toBeDefined();
			expect(res.time).toBeDefined();
		});
	});

	it("should return statistics of node", () => {
		return broker.call("$node.stats").then(res => {
			expect(res).toBeDefined();
			expect(res.requests).toBeDefined();
		});
	});

	it("should return list of remote nodes", () => {
		let info = {
			nodeID: "server-2",
			actions: {}
		};
		broker.processNodeInfo(info.nodeID, info);

		return broker.call("$node.list").then(res => {
			expect(res).toBeDefined();
			expect(res).toEqual([
				{"available": true, "nodeID": "server-2"}
			]);
		});
	});

});

describe("Test Factories", () => {

	it("should register a ServiceFactory", () => {
		let broker = new ServiceBroker({
			ServiceFactory: require("./__factories/my-service-factory")
		});
		let service = broker.loadService(__dirname + "/__factories/my.service");

		expect(service).toBeInstanceOf(broker.ServiceFactory);
		expect(service.myProp).toBe(123);
	});

	it("should register a ContextFactory", () => {
		let broker = new ServiceBroker({
			ContextFactory: require("./__factories/my-context-factory")
		});

		let mockAction = {
			name: "posts.find",
			service: { broker },
			handler: jest.fn(ctx => Promise.resolve(ctx))
		};	

		broker.registerAction(mockAction);		

		return broker.call("posts.find").then(ctx => {
			expect(ctx).toBeInstanceOf(broker.ContextFactory);
			expect(ctx.myProp).toBe("a");
		});
	});

	it("should create a sub-ContextFactory", () => {
		let broker = new ServiceBroker({
			ContextFactory: require("./__factories/my-context-factory")
		});

		let ctx = new broker.ContextFactory({ broker });
		expect(ctx).toBeInstanceOf(broker.ContextFactory);
		let subCtx = ctx.createSubContext();
		expect(subCtx).toBeInstanceOf(broker.ContextFactory);
	});

});


describe("Test on/once/off event emitter", () => {

	let broker = new ServiceBroker();
	let handler = jest.fn();

	it("register event handler", () => {
		broker.on("test.event.**", handler);

		broker.emitLocal("test");
		expect(handler).toHaveBeenCalledTimes(0);

		let p = { a: 5 };
		broker.emitLocal("test.event", p);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(p);

		broker.emitLocal("test.event.demo", "data");
		expect(handler).toHaveBeenCalledTimes(2);
		expect(handler).toHaveBeenCalledWith("data");
	});

	it("unregister event handler", () => {
		handler.mockClear();
		broker.off("test.event.**", handler);

		broker.emitLocal("test");
		broker.emitLocal("test.event");
		broker.emitLocal("test.event.demo");
		expect(handler).toHaveBeenCalledTimes(0);
	});

	it("register once event handler", () => {
		handler.mockClear();
		broker.once("request", handler);

		broker.emitLocal("request");
		expect(handler).toHaveBeenCalledTimes(1);

		broker.emitLocal("request");
		expect(handler).toHaveBeenCalledTimes(1);
	});	

});

describe("Test service registration", () => {

	let broker = new ServiceBroker();

	let service;

	let registerServiceCB = jest.fn();
	broker.on("register.service.posts", registerServiceCB);

	it("no service yet", () => {
		expect(broker.services.length).toBe(0);
	});

	it("test register service", () => {
		service = broker.createService({
			name: "posts"
		});
		expect(broker.services.length).toBe(1);
		expect(registerServiceCB).toHaveBeenCalledWith(service);
		expect(registerServiceCB).toHaveBeenCalledTimes(1);
	});

	it("test has & get service", () => {
		expect(broker.hasService("noservice")).toBe(false);
		expect(broker.hasService("posts")).toBe(true);

		expect(broker.getService("noservice")).toBeUndefined();
		expect(broker.getService("posts")).toBe(service);		
	});

});

describe("Test action registration", () => {

	let broker = new ServiceBroker({ internalActions: false });

	let mockAction = {
		name: "posts.find",
		service: { broker },
		handler: Promise.method(jest.fn(ctx => ctx))
	};	

	broker.wrapAction = jest.fn();

	it("should call a register event", () => {
		let registerActionCB = jest.fn();
		broker.on("register.action.posts.find", registerActionCB);

		broker.registerAction(mockAction);
		expect(broker.actions.size).toBe(1);
		expect(registerActionCB).toHaveBeenCalledWith({ action: mockAction, nodeID: undefined });
		expect(registerActionCB).toHaveBeenCalledTimes(1);

		expect(broker.wrapAction).toHaveBeenCalledWith(mockAction);
		expect(broker.wrapAction).toHaveBeenCalledTimes(1);
	});

	it("should return with the action", () => {
		expect(broker.hasAction("noaction")).toBe(false);
		expect(broker.hasAction("posts.find")).toBe(true);
	});
});

describe("Test broker.call context", () => {

	let broker = new ServiceBroker({ internalActions: false });

	let actionHandler = jest.fn(ctx => ctx);

	broker.createService({
		name: "posts",
		actions: {
			find: actionHandler
		}
	});
		
	it("should reject if no action", () => {
		return broker.call("noaction").catch(err => {
			expect(err).toBeDefined();
			expect(err).toBeInstanceOf(ServiceNotFoundError);
		});
	});

	it("should return context & call the action handler", () => {
		return broker.call("posts.find").then(ctx => {
			expect(ctx).toBeDefined();
			expect(ctx.broker).toBe(broker);
			expect(ctx.action.name).toBe("posts.find");
			expect(ctx.nodeID).toBeUndefined();
			expect(ctx.params).toBeDefined();
			expect(actionHandler).toHaveBeenCalledTimes(1);
			expect(actionHandler).toHaveBeenCalledWith(ctx);
		});
	});
		
	it("should set params to context", () => {
		let params = { a: 1 };
		return broker.call("posts.find", params).then(ctx => {
			expect(ctx.params).toBe(params);
			expect(ctx.params.a).toBe(params.a);
		});
	});

	it("should create a sub context of parent context", () => {
		let parentCtx = new Context({
			params: {
				a: 5,
				b: 2
			}
		});		
		let params = { a: 1 };

		return broker.call("posts.find", params, { parentCtx }).then(ctx => {
			expect(ctx.params).toBe(params);
			expect(ctx.params.a).toBe(1);
			expect(ctx.params.b).not.toBeDefined();
			expect(ctx.level).toBe(2);
			expect(ctx.parent).toBe(parentCtx);
		});

	});
});

describe("Test versioned action registration", () => {

	let broker = new ServiceBroker({ internalActions: false });

	let registerActionv1 = jest.fn();
	broker.on("register.action.v1.posts.find", registerActionv1);

	let registerActionv2 = jest.fn();
	broker.on("register.action.v2.posts.find", registerActionv2);

	let findV1 = jest.fn(ctx => ctx);
	let findV2 = jest.fn(ctx => ctx);

	broker.wrapAction = jest.fn(handler => handler);

	broker.createService({
		name: "posts",
		version: 1,

		actions: {
			find: findV1
		}
	});

	broker.createService({
		name: "posts",
		version: 2,
		latestVersion: true,

		actions: {
			find: findV2
		}
	});	

	it("should registered both versioned service", () => {
		expect(broker.actions.size).toBe(2);

		expect(registerActionv1).toHaveBeenCalledWith({ action: jasmine.any(Object), nodeID: undefined });
		expect(registerActionv1).toHaveBeenCalledTimes(1);

		expect(registerActionv2).toHaveBeenCalledWith({ action: jasmine.any(Object), nodeID: undefined });
		expect(registerActionv2).toHaveBeenCalledTimes(1);

		expect(broker.wrapAction).toHaveBeenCalledTimes(2);		
	});
	
	it("should return with the correct action", () => {
		expect(broker.hasAction("v1.posts.find")).toBe(true);
		expect(broker.hasAction("v2.posts.find")).toBe(true);

		expect(broker.hasAction("v3.posts.find")).toBe(false);
	});

	it("should call the v1 handler", () => {
		return broker.call("v1.posts.find").then(ctx => {
			expect(findV1).toHaveBeenCalledTimes(1);
		});
	});

	it("should call the v2 handler", () => {
		return broker.call("v2.posts.find").then(ctx => {
			expect(findV2).toHaveBeenCalledTimes(1);
		});
	});
		
});

describe("Test broker.call", () => {
	let broker = new ServiceBroker();

	broker.loadService("./test/services/math.service.js");

	broker.registerAction({
		name: "posts.find"
	}, "server-2");

	broker._remoteCall = jest.fn((ctx, opts) => ({ ctx, opts }));

	it("should call the remoteCall method", () => {
		let res = broker.call("posts.find", { a: 5 });
		expect(res.ctx).toBeDefined();
		expect(res.ctx.action.name).toBe("posts.find");
		expect(res.ctx.nodeID).toBe("server-2");
		expect(res.ctx.params).toEqual({ a: 5});

		expect(broker._remoteCall).toHaveBeenCalledTimes(1);
		expect(broker._remoteCall).toHaveBeenCalledWith(res.ctx, res.opts);
	});
});

describe.skip("Test localCall", () => {
	let broker = new ServiceBroker({
		statistics: true
	});

	let handler1 = jest.fn(ctx => Promise.resolve(ctx));
	let handler2 = jest.fn(ctx => Promise.reject(new ValidationError("Ohh, no")));

	let actionSuccess = {
		name: "posts.success",
		handler: handler1
	};

	let actionError = {
		name: "posts.dangerous",
		handler: handler2
	};

	broker.statistics.addRequest = jest.fn();

	it("should call statistics.addRequest if success", () => {
		let ctx = new Context({ broker, action: actionSuccess });
		return broker._localCall(ctx, actionSuccess).then(() => {
			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler1).toHaveBeenCalledWith(ctx);

			expect(broker.statistics.addRequest).toHaveBeenCalledTimes(1);
			expect(broker.statistics.addRequest).toHaveBeenCalledWith("posts.success", ctx.duration, null);
		});
	});

	it("should call statistics.addRequest if error", () => {
		broker.statistics.addRequest.mockClear();
		let ctx = new Context({ broker, action: actionError });
		return broker._localCall(ctx, actionError).catch(() => {
			expect(handler2).toHaveBeenCalledTimes(1);
			expect(handler2).toHaveBeenCalledWith(ctx);

			expect(broker.statistics.addRequest).toHaveBeenCalledTimes(1);
			expect(broker.statistics.addRequest).toHaveBeenCalledWith("posts.dangerous", ctx.duration, 422);
		});
	});
});

describe("Test remoteCall", () => {

	function createBroker(opts) {
		return new ServiceBroker(defaults(opts, {
			transporter: new FakeTransporter(),
			requestTimeout: 5 * 1000,
			requestRetry: 0
		}));
	}

	describe("with normal call", () => {
		let broker = createBroker();
		broker.transit.request = jest.fn(ctx => Promise.resolve(ctx)); 
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should call transporter.request", () => {
			return broker._remoteCall(ctx).then(ctx => {
				expect(ctx).toBeDefined();
				expect(broker.transit.request).toHaveBeenCalledTimes(1);
				expect(broker.transit.request).toHaveBeenCalledWith(ctx, { timeout: 5000, retryCount: 0});
			});
		});
	});

	describe("with timeout", () => {
		let broker = createBroker();
		broker.transit.request = jest.fn(() => Promise.reject(new RequestTimeoutError("Timeout!", "server-1"))); 
		broker.nodeUnavailable = jest.fn();
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should throw RequestTimeout exception", () => {
			return broker._remoteCall(ctx).catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(RequestTimeoutError);
				expect(broker.transit.request).toHaveBeenCalledTimes(1);
				expect(broker.transit.request).toHaveBeenCalledWith(ctx, { timeout: 5000, retryCount: -1});
				expect(broker.nodeUnavailable).toHaveBeenCalledWith(ctx.nodeID);
			});
		});
	});

	describe("with timeout & requestRetry", () => {
		let broker = createBroker();
		broker.transit.request = jest.fn(() => Promise.reject(new RequestTimeoutError("Timeout!", "server-1"))); 
		broker.call = jest.fn((actionName, ctx, opts) => ({ actionName, ctx, opts }));
		broker.nodeUnavailable = jest.fn();
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should throw RequestTimeout exception", () => {
			return broker._remoteCall(ctx, { retryCount: 2 }).then(res => {
				expect(res.opts.retryCount).toBe(1);
				expect(broker.transit.request).toHaveBeenCalledTimes(1);
				expect(broker.transit.request).toHaveBeenCalledWith(ctx, { timeout: 5000, retryCount: 1});
				expect(broker.nodeUnavailable).toHaveBeenCalledTimes(0);
				expect(broker.call).toHaveBeenCalledTimes(1);
				expect(broker.call).toHaveBeenCalledWith("posts.find", ctx.params, res.opts);
			});
		});
	});

	describe("with fallbackResponse as object", () => {
		let fallbackResponse = { a: 8 };
		let broker = createBroker();
		broker.transit.request = jest.fn(() => Promise.reject(new RequestTimeoutError("Timeout!", "server-1"))); 
		broker.nodeUnavailable = jest.fn();
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should throw RequestTimeout exception", () => {
			return broker._remoteCall(ctx, { fallbackResponse }).then(res => {
				expect(res).toBeDefined();
				expect(res).toBe(fallbackResponse);
				expect(broker.transit.request).toHaveBeenCalledTimes(1);
				expect(broker.nodeUnavailable).toHaveBeenCalledWith(ctx.nodeID);
			});
		});
	});

	describe("with fallbackResponse as Promise", () => {
		let fallbackResponse = () => Promise.resolve({ a: 10 });
		let broker = createBroker();
		broker.transit.request = jest.fn(() => Promise.reject(new RequestTimeoutError("Timeout!", "server-1"))); 
		broker.nodeUnavailable = jest.fn();
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should throw RequestTimeout exception", () => {
			return broker._remoteCall(ctx, { fallbackResponse }).then(res => {
				expect(res).toBeDefined();
				expect(res).toEqual({ a: 10 });
				expect(broker.transit.request).toHaveBeenCalledTimes(1);
				expect(broker.nodeUnavailable).toHaveBeenCalledWith(ctx.nodeID);
			});
		});
	});

});

describe("Test getLocalActionList", () => {

	let broker = new ServiceBroker({ internalActions: true });

	broker.createService({
		name: "posts",
		actions: {
			find: {
				cache: true,
				publish: false,
				handler: jest.fn(ctx => ctx)
			}
		}
	});

	it("should contain the local registered action", () => {
		let list = broker.getLocalActionList();
		expect(Object.keys(list).length).toBe(1);
		expect(list["posts.find"]).toEqual({
			name: "posts.find",
			cache: true,
			publish: false
		});
	});

	it("should not contain the remote registered action", () => {

		let actionRemote = {
			name: "users.get",
			handler: jest.fn()
		};

		broker.registerAction(actionRemote, "node");
		let list = broker.getLocalActionList();
		expect(Object.keys(list).length).toBe(1);
	});

	it("should contain both registered local action", () => {

		let actionLocal = {
			name: "device.find",
			params: {
				a: "required|number"
			},
			handler: jest.fn()
		};

		broker.registerAction(actionLocal);
		let list = broker.getLocalActionList();
		expect(Object.keys(list).length).toBe(2);
		expect(list["device.find"]).toEqual({
			name: "device.find",
			params: {
				a: "required|number"
			}
		});
	});
});
	
describe("Test emit & emitLocal", () => {

	let broker = new ServiceBroker();
	broker.bus.emit = jest.fn();

	it("should call the bus.emit params", () => {
		broker.emitLocal("request.rest", "string-data");
		expect(broker.bus.emit).toHaveBeenCalledTimes(1);
		expect(broker.bus.emit).toHaveBeenCalledWith("request.rest", "string-data");
	});

	it("should call the event handler locally with params", () => {
		// Test emit method
		broker.bus.emit.mockClear();

		let data = { id: 5 };
		broker.emit("request.rest", data);

		expect(broker.bus.emit).toHaveBeenCalledTimes(1);
		expect(broker.bus.emit).toHaveBeenCalledWith("request.rest", data);
	});

});

describe("Test registerAction & unregisterAction with nodeID", () => {

	let broker = new ServiceBroker();
	broker.emitLocal = jest.fn();

	let action = {
		name: "users.get",
		handler: jest.fn()
	};

	it("should register as a remote action", () => {
		broker.registerAction(action, "server-2");

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("register.action.users.get", { action: {"handler": jasmine.any(Function), "name": "users.get"}, nodeID: "server-2"});
		
		let findItem = broker.actions.get("users.get").get();
		expect(findItem).toBeDefined();
		expect(findItem.local).toBe(false);
		expect(findItem.nodeID).toBe("server-2");
		broker.emitLocal.mockClear();
	});

	it("should unregister the remote action", () => {
		broker.unregisterAction(action, "server-2");
	
		let findItem = broker.actions.get("users.get");
		expect(findItem).toBeDefined();
		expect(findItem.count()).toBe(0);
	});
	
});

describe("Test nodes methods", () => {

	let broker = new ServiceBroker();

	let info = {
		nodeID: "server-2",
		actions: {
			"other.find": {
				name: "v2.other.find",
				cache: true,
				publish: false,
			},
			"other.get": {
				name: "other.get",
				cache: true,
				params: {
					id: "required|number"
				}
			}
		}
	};
	broker.emitLocal = jest.fn();
	let oldBrokerNodeDisconnected = broker.nodeDisconnected;

	broker.processNodeInfo(info.nodeID, info);

	it("should register node", () => {
		let node = broker.nodes.get("server-2");
		expect(node).toBeDefined();
		expect(node).toBe(info);
		expect(node.lastHeartbeatTime).toBeDefined();

		expect(broker.emitLocal).toHaveBeenCalledTimes(3);
		expect(broker.emitLocal).toHaveBeenCalledWith("node.connected", node);

		expect(broker.isNodeAvailable("server-2")).toBe(true);
	});

	it("should find the remote actions", () => {
		let findItem = broker.actions.get("other.find").get();
		expect(findItem).toBeDefined();
		expect(findItem.local).toBe(false);
		expect(findItem.nodeID).toBe("server-2");
		expect(findItem.data).toEqual({
			name: "other.find", 
			cache: true, 
			publish: false
		});

		let getItem = broker.actions.get("other.get").get();
		expect(getItem).toBeDefined();
		expect(getItem.local).toBe(false);
		expect(getItem.nodeID).toBe("server-2");
		expect(getItem.data).toEqual({
			name: "other.get", 
			cache: true,
			params: {
				id: "required|number"
			}
		});

		expect(broker.isActionAvailable("other.find")).toBe(true);
		expect(broker.isActionAvailable("other.get")).toBe(true);
		
	});

	it("should not contain duplicate actions", () => {
		broker.emitLocal.mockClear();

		broker.processNodeInfo(info.nodeID, info);

		let findItem = broker.actions.get("other.find");
		expect(findItem.list.length).toBe(1);
		expect(broker.emitLocal).toHaveBeenCalledTimes(0);
	});
	
	it("should update last heartbeat time", () => {
		let node = broker.nodes.get("server-2");
		node.lastHeartbeatTime = 1000;
		broker.nodeHeartbeat("server-2");
		expect(node.lastHeartbeatTime).not.toBe(1000);
	});	
	
	it.skip("should call 'nodeDisconnected' if the heartbeat time is too old", () => {
		let node = broker.nodes.get("server-2");
		broker.nodeDisconnected = jest.fn();
		broker.nodeHeartbeat("server-2");
		broker.checkRemoteNodes();
		expect(broker.nodeDisconnected).toHaveBeenCalledTimes(0);

		node.lastHeartbeatTime -= broker.options.nodeHeartbeatTimeout * 1.5 * 1000;
		broker.checkRemoteNodes();
		expect(broker.nodeDisconnected).toHaveBeenCalledTimes(1);
	});	
	

	it("should remove node from nodes map", () => {
		broker.nodeDisconnected = oldBrokerNodeDisconnected;
		broker.emitLocal.mockClear();
		let node = broker.nodes.get("server-2");
		broker.nodeDisconnected("server-2");
		expect(node.available).toBe(false);
		expect(broker.isNodeAvailable("server-2")).toBe(false);		

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("node.disconnected", node);

		expect(broker.isActionAvailable("other.find")).toBe(false);
		expect(broker.isActionAvailable("other.get")).toBe(false);
	});	

	it("should call node.broker event if disconnected unexpectedly", () => {
		broker.processNodeInfo(info.nodeID, info);
		broker.emitLocal.mockClear();

		let node = broker.nodes.get("server-2");
		broker.nodeDisconnected("server-2", true);
		expect(node.available).toBe(false);
		expect(broker.isNodeAvailable("server-2")).toBe(false);		

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("node.broken", node);

		expect(broker.isActionAvailable("other.find")).toBe(false);
		expect(broker.isActionAvailable("other.get")).toBe(false);
	});	

	it("should call nodeDisconnected if nodeUnavailable", () => {
		broker.processNodeInfo(info.nodeID, info);
		broker.nodeDisconnected = jest.fn();

		broker.nodeUnavailable("server-2");
		expect(broker.nodeDisconnected).toHaveBeenCalledTimes(1);
		expect(broker.nodeDisconnected).toHaveBeenCalledWith("server-2", true);
	});	
});

describe("Test with metrics timer", () => {
	let clock;
	beforeAll(() => {
		clock = lolex.install();
	});

	afterAll(() => {
		clock.uninstall();
	});

	let broker= new ServiceBroker({
		metrics: true,
		statistics: true,
		metricsNodeTime: 5 * 1000
	});

	broker.getNodeHealthInfo = jest.fn(() => Promise.resolve());
	broker.emit = jest.fn();

	it("should create metrics timer", () => {
		return broker.start().then(() => {
			expect(broker.metricsTimer).toBeDefined();
		});
	});

	it("should send metrics events", () => {
		clock.tick(6000);

		expect(broker.emit).toHaveBeenCalledTimes(1); // node.health is async
		expect(broker.getNodeHealthInfo).toHaveBeenCalledTimes(1);
	});

	it("should destroy metrics timer", () => {
		broker.stop();
		expect(broker.metricsTimer).toBeNull();
	});	
});

describe("Test ServiceBroker.Transit", () => {
	let broker= new ServiceBroker({
		transporter: new FakeTransporter(),
		nodeID: "12345",
		requestRetry: 2
	});

	broker.transit.connect = jest.fn(() => Promise.resolve()); 
	broker.transit.disconnect = jest.fn(); 
	broker.transit.sendHeartbeat = jest.fn(); 
	broker.transit.emit = jest.fn(); 
	broker.transit.request = jest.fn(ctx => Promise.resolve(ctx)); 


	it("should create transit instance", () => {
		expect(broker).toBeDefined();
		expect(broker.transit).toBeDefined();
		expect(broker.nodeID).toBe("12345");
		expect(broker.transit.connect).toHaveBeenCalledTimes(0);
	});

	it("should call transporter.connect", () => {
		broker.start().then(() => {
			expect(broker.transit.connect).toHaveBeenCalledTimes(1);
			expect(broker.heartBeatTimer).toBeDefined();
			expect(broker.checkNodesTimer).toBeDefined();
		});
	});

	it("should call broker.transit emit", () => {
		let p = { a: 1 };
		broker.emit("posts.find", p);
		expect(broker.transit.emit).toHaveBeenCalledTimes(1);
		expect(broker.transit.emit).toHaveBeenCalledWith("posts.find", p);
	});

	let mockAction = {
		name: "posts.find",
		service: { broker },
		handler: jest.fn(ctx => ctx)
	};

	it("should call broker.transit.request with new context", () => {
		let p = { abc: 100 };

		broker.registerAction(mockAction, "99999");
		return broker.call("posts.find", p).then(ctx => {
			expect(broker.transit.request).toHaveBeenCalledTimes(1);
			expect(broker.transit.request).toHaveBeenCalledWith(ctx, { retryCount: 2, timeout: 15000});
			expect(ctx.params).toEqual(p);
		});
	});

	it("should call broker.transit.request with new context", () => {
		let p = { abc: 100 };
		let parentCtx = new Context(p);
		broker.transit.request.mockClear();

		return broker.call("posts.find", p, { parentCtx, timeout: 5000 }).then(ctx => {
			expect(broker.transit.request).toHaveBeenCalledTimes(1);
			expect(broker.transit.request).toHaveBeenCalledWith(ctx, { parentCtx, retryCount: 2, timeout: 5000});
			expect(ctx.parent).toBe(parentCtx);		
		});
	});

	it("should call broker.nodeUnavailable if broker.transit.request throw RequestTimeoutError", () => {
		let p = { abc: 100 };
		broker.transit.request = jest.fn(() => Promise.reject(new RequestTimeoutError({ action: "posts.find" }, "server-2")));
		broker._callCount = 0;

		return broker.call("posts.find", p).catch(err => {
			expect(err).toBeInstanceOf(RequestTimeoutError);
			expect(err.data.action).toBe("posts.find");
			expect(broker._callCount).toBe(3); // requestRetry = 2
		});
	});
	
	it("should call broker.transit.disconnect", () => {
		broker.stop();
		expect(broker.transit.disconnect).toHaveBeenCalledTimes(1);
		expect(broker.heartBeatTimer).toBeNull();
		expect(broker.checkNodesTimer).toBeNull();
	});

	it("should call stop", () => {
		broker.stop = jest.fn();
		broker._closeFn();
		expect(broker.stop).toHaveBeenCalledTimes(1);
	});
	
});

describe("Test middleware system with sync & async modes", () => {
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

	let mw3Empty = null;

	let broker = new ServiceBroker({ validation: false });
	broker.use(mw3Empty);
	broker.use(mw2Async);
	broker.use(mw1Sync);

	let master = jest.fn(() => {
		return new Promise(resolve => {
			flow.push("MASTER");
			resolve({ user: "icebob" });
		});
	});

	broker.createService({
		name: "test",
		actions: {
			foo: master
		}
	});
	
	it("should register plugins", () => {
		expect(broker.middlewares.length).toBe(2);
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

describe("Test middleware system with SYNC break", () => {
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

	let mw2 = handler => {
		return ctx => {
			flow.push("B2");
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
		return new Promise(resolve => {
			flow.push("MASTER");
			resolve({ user: "icebob" });
		});
	});

	let broker = new ServiceBroker({ validation: false });
	broker.use(mw3, mw2, mw1);

	broker.createService({
		name: "test",
		actions: {
			foo: master
		}
	});
	
	it("should register plugins", () => {
		expect(broker.middlewares.length).toBe(3);
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

	let mw2 = handler => {
		return ctx => {
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
		return new Promise(resolve => {
			flow.push("MASTER");
			resolve({ user: "icebob" });
		});
	});

	let broker = new ServiceBroker({ validation: false });
	broker.use(mw3, mw2, mw1);

	broker.createService({
		name: "test",
		actions: {
			foo: master
		}
	});
	
	it("should register plugins", () => {
		expect(broker.middlewares.length).toBe(3);
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

describe("Test middleware system Exception", () => {
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

	let mw2 = handler => {
		return ctx => {
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

	let broker = new ServiceBroker({ validation: false });
	broker.use(mw2, mw1);

	broker.createService({
		name: "test",
		actions: {
			foo: master
		}
	});

	it("should call only mw1 & mw2 middlewares functions", () => {
		let p = broker.call("test.foo");		
		expect(utils.isPromise(p)).toBe(true);
		return p.catch(err => {
			expect(err.message).toEqual("Something happened in mw2");
			expect(flow.join("-")).toBe("B1-B2");
		});
	});	
});
*/