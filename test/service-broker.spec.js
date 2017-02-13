"use strict";

const utils = require("../src/utils");
const Service = require("../src/service");
const ServiceBroker = require("../src/service-broker");
const Context = require("../src/context");
const Transporter = require("../src/transporters/base");
const { ServiceNotFoundError, RequestTimeoutError, ValidationError } = require("../src/errors");
const lolex = require("lolex");
const _ = require("lodash");

describe("Test ServiceBroker constructor", () => {

	it("should set default options", () => {
		let broker = new ServiceBroker();
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({ 
			nodeID: null,
			logger: null,
			logLevel: "info",
			cacher: null,
			transporter: null, 
			metrics: false, 
			metricsNodeTime: 5 * 1000,
			statistics: false,
			nodeHeartbeatTimeout : 30, 
			sendHeartbeatTime: 10, 
			requestRetry: 0, 
			requestTimeout: 15000, 
			validation: true, 
			internalActions: true 
		});
		expect(broker.services).toBeInstanceOf(Array);
		expect(broker.actions).toBeInstanceOf(Map);
		expect(broker.transporter).toBeNull();
		expect(broker.cacher).toBeNull();
		expect(broker.validator).toBeDefined();
		expect(broker.statistics).toBeUndefined();
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());

		expect(broker.hasAction("$node.list")).toBeTruthy();
		expect(broker.hasAction("$node.services")).toBeTruthy();
		expect(broker.hasAction("$node.actions")).toBeTruthy();
		expect(broker.hasAction("$node.health")).toBeTruthy();
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
		expect(broker.transporter).toBeNull();
		expect(broker.statistics).toBeDefined();
		expect(broker.validator).toBeUndefined();
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());

		expect(broker.hasAction("$node.list")).toBeFalsy();
		expect(broker.hasAction("$node.services")).toBeFalsy();
		expect(broker.hasAction("$node.actions")).toBeFalsy();
		expect(broker.hasAction("$node.health")).toBeFalsy();		
	});

});

describe("Test internal actions", () => {
	let broker = new ServiceBroker({
		statistics: true,
		internalActions: true 			
	});

	broker.loadService("./examples/math.service");
	broker.loadService("./examples/post.service");

	it("should register $node.stats internal action", () => {
		expect(broker.hasAction("$node.list")).toBeTruthy();
		expect(broker.hasAction("$node.services")).toBeTruthy();
		expect(broker.hasAction("$node.actions")).toBeTruthy();
		expect(broker.hasAction("$node.health")).toBeTruthy();
		expect(broker.hasAction("$node.stats")).toBeTruthy();
	});

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
			handler: jest.fn(ctx => ctx)
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

describe("Test loadServices", () => {

	let broker = new ServiceBroker();
	
	it("should found 7 services", () => {
		expect(broker.loadServices("./examples")).toBe(7);
		expect(broker.hasService("math")).toBeTruthy();
		expect(broker.hasAction("math.add")).toBeTruthy();
		expect(broker.isActionAvailable("math.add")).toBeTruthy();
	});

});

describe("Test loadService", () => {

	let broker = new ServiceBroker();
	
	it("should load math service", () => {
		let service = broker.loadService("./examples/math.service.js");
		expect(service).toBeDefined();
		expect(broker.hasService("math")).toBeTruthy();
		expect(broker.hasAction("math.add")).toBeTruthy();
		expect(broker.isActionAvailable("math.add")).toBeTruthy();
	});

});

describe("Test createService", () => {

	let broker = new ServiceBroker();
	
	it("should load math service", () => {
		let service = broker.createService({
			name: "test",
			actions: {
				empty() {}
			}
		});
		expect(service).toBeDefined();
		expect(broker.hasService("test")).toBeTruthy();
		expect(broker.hasAction("test.empty")).toBeTruthy();
		expect(broker.isActionAvailable("test.empty")).toBeTruthy();
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
		expect(broker.hasService("noservice")).toBeFalsy();
		expect(broker.hasService("posts")).toBeTruthy();

		expect(broker.getService("noservice")).toBeUndefined();
		expect(broker.getService("posts")).toBe(service);		
	});

});

describe("Test action registration", () => {

	let broker = new ServiceBroker({ internalActions: false });

	let mockAction = {
		name: "posts.find",
		service: { broker },
		handler: jest.fn(ctx => ctx)
	};	

	it("should call a register event", () => {
		let registerActionCB = jest.fn();
		broker.on("register.action.posts.find", registerActionCB);

		broker.registerAction(mockAction);
		expect(broker.actions.size).toBe(1);
		expect(registerActionCB).toHaveBeenCalledWith({ action: mockAction, nodeID: undefined });
		expect(registerActionCB).toHaveBeenCalledTimes(1);
	});

	it("should return with the action", () => {
		expect(broker.hasAction("noaction")).toBeFalsy();
		expect(broker.hasAction("posts.find")).toBeTruthy();
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
			expect(ctx.id).toBeDefined();
			expect(ctx.requestID).toBeDefined();
			expect(ctx.level).toBe(1);
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
			expect(ctx.level).toBe(1);
		});
	});

	it("should set requestID to context", () => {
		return broker.call("posts.find", null, { requestID: "req123" }).then(ctx => {
			expect(ctx.requestID).toBe("req123");
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
		expect(broker.hasAction("v1.posts.find")).toBeTruthy();
		expect(broker.hasAction("v2.posts.find")).toBeTruthy();

		expect(broker.hasAction("v3.posts.find")).toBeFalsy();
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

	broker.loadService("./examples/math.service.js");

	broker.registerAction({
		name: "posts.find"
	}, "server-2");

	broker._localCall = jest.fn((ctx, opts) => ({ ctx, opts }));
	broker._remoteCall = jest.fn((ctx, opts) => ({ ctx, opts }));

	it("should call the localCall method", () => {
		let res = broker.call("math.add");
		expect(res.ctx).toBeDefined();
		expect(res.ctx.action.name).toBe("math.add");

		expect(broker._localCall).toHaveBeenCalledTimes(1);
		expect(broker._localCall).toHaveBeenCalledWith(res.ctx, res.opts);
	});

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

describe("Test localCall", () => {
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

	function createTransporter() {
		let transporter = new Transporter();
		transporter.init = jest.fn(); 
		transporter.connect = jest.fn(() => Promise.resolve()); 
		transporter.disconnect = jest.fn(); 
		transporter.sendHeartbeat = jest.fn(); 
		transporter.emit = jest.fn(); 

		return transporter;
	}

	function createBroker(opts) {
		return new ServiceBroker(_.defaults(opts, {
			requestTimeout: 5 * 1000,
			requestRetry: 0
		}));
	}

	describe("with normal call", () => {
		let transporter = createTransporter();
		transporter.request = jest.fn(ctx => Promise.resolve(ctx)); 
		let broker = createBroker({ transporter });
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should call transporter.request", () => {
			return broker._remoteCall(ctx).then(ctx => {
				expect(ctx).toBeDefined();
				expect(transporter.request).toHaveBeenCalledTimes(1);
				expect(transporter.request).toHaveBeenCalledWith(ctx, { timeout: 5000, retryCount: 0});
			});
		});
	});

	describe("with timeout", () => {
		let transporter = createTransporter();
		transporter.request = jest.fn(() => Promise.reject(new RequestTimeoutError("Timeout!", "server-1"))); 
		let broker = createBroker({ transporter });
		broker.nodeUnavailable = jest.fn();
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should throw RequestTimeout exception", () => {
			return broker._remoteCall(ctx).catch(err => {
				expect(err).toBeDefined();
				expect(err).toBeInstanceOf(RequestTimeoutError);
				expect(transporter.request).toHaveBeenCalledTimes(1);
				expect(transporter.request).toHaveBeenCalledWith(ctx, { timeout: 5000, retryCount: -1});
				expect(broker.nodeUnavailable).toHaveBeenCalledWith(ctx.nodeID);
			});
		});
	});

	describe("with timeout & requestRetry", () => {
		let transporter = createTransporter();
		transporter.request = jest.fn(() => Promise.reject(new RequestTimeoutError("Timeout!", "server-1"))); 
		let broker = createBroker({ transporter });
		broker.call = jest.fn((actionName, ctx, opts) => ({ actionName, ctx, opts }));
		broker.nodeUnavailable = jest.fn();
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should throw RequestTimeout exception", () => {
			return broker._remoteCall(ctx, { retryCount: 2 }).then(res => {
				expect(res.opts.retryCount).toBe(1);
				expect(transporter.request).toHaveBeenCalledTimes(1);
				expect(transporter.request).toHaveBeenCalledWith(ctx, { timeout: 5000, retryCount: 1});
				expect(broker.nodeUnavailable).toHaveBeenCalledTimes(0);
				expect(broker.call).toHaveBeenCalledTimes(1);
				expect(broker.call).toHaveBeenCalledWith("posts.find", ctx.params, res.opts);
			});
		});
	});

	describe("with fallbackResponse as object", () => {
		let fallbackResponse = { a: 8 };
		let transporter = createTransporter();
		transporter.request = jest.fn(() => Promise.reject(new RequestTimeoutError("Timeout!", "server-1"))); 
		let broker = createBroker({ transporter });
		broker.nodeUnavailable = jest.fn();
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should throw RequestTimeout exception", () => {
			return broker._remoteCall(ctx, { fallbackResponse }).then(res => {
				expect(res).toBeDefined();
				expect(res).toBe(fallbackResponse);
				expect(transporter.request).toHaveBeenCalledTimes(1);
				expect(broker.nodeUnavailable).toHaveBeenCalledWith(ctx.nodeID);
			});
		});
	});

	describe("with fallbackResponse as Promise", () => {
		let fallbackResponse = () => Promise.resolve({ a: 10 });
		let transporter = createTransporter();
		transporter.request = jest.fn(() => Promise.reject(new RequestTimeoutError("Timeout!", "server-1"))); 
		let broker = createBroker({ transporter });
		broker.nodeUnavailable = jest.fn();
		let ctx = new Context({ broker, action: { name: "posts.find" }, nodeID: "server-1"});

		it("should throw RequestTimeout exception", () => {
			return broker._remoteCall(ctx, { fallbackResponse }).then(res => {
				expect(res).toBeDefined();
				expect(res).toEqual({ a: 10 });
				expect(transporter.request).toHaveBeenCalledTimes(1);
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
		expect(findItem.local).toBeFalsy();
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

		expect(broker.isNodeAvailable("server-2")).toBeTruthy();
	});

	it("should find the remote actions", () => {
		let findItem = broker.actions.get("other.find").get();
		expect(findItem).toBeDefined();
		expect(findItem.local).toBeFalsy();
		expect(findItem.nodeID).toBe("server-2");
		expect(findItem.data).toEqual({
			name: "other.find", 
			cache: true, 
			publish: false
		});

		let getItem = broker.actions.get("other.get").get();
		expect(getItem).toBeDefined();
		expect(getItem.local).toBeFalsy();
		expect(getItem.nodeID).toBe("server-2");
		expect(getItem.data).toEqual({
			name: "other.get", 
			cache: true,
			params: {
				id: "required|number"
			}
		});

		expect(broker.isActionAvailable("other.find")).toBeTruthy();
		expect(broker.isActionAvailable("other.get")).toBeTruthy();
		
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
	/*
	it("should call 'nodeDisconnected' if the heartbeat time is too old", () => {
		let node = broker.nodes.get("server-2");
		broker.nodeDisconnected = jest.fn();
		broker.nodeHeartbeat("server-2");
		broker.checkRemoteNodes();
		expect(broker.nodeDisconnected).toHaveBeenCalledTimes(0);

		node.lastHeartbeatTime -= broker.options.nodeHeartbeatTimeout * 1.5 * 1000;
		broker.checkRemoteNodes();
		expect(broker.nodeDisconnected).toHaveBeenCalledTimes(1);
	});	
	*/

	it("should remove node from nodes map", () => {
		broker.nodeDisconnected = oldBrokerNodeDisconnected;
		broker.emitLocal.mockClear();
		let node = broker.nodes.get("server-2");
		broker.nodeDisconnected("server-2");
		expect(node.available).toBeFalsy();
		expect(broker.isNodeAvailable("server-2")).toBeFalsy();		

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("node.disconnected", node);

		expect(broker.isActionAvailable("other.find")).toBeFalsy();
		expect(broker.isActionAvailable("other.get")).toBeFalsy();
	});	

	it("should call node.broker event if disconnected unexpectedly", () => {
		broker.processNodeInfo(info.nodeID, info);
		broker.emitLocal.mockClear();

		let node = broker.nodes.get("server-2");
		broker.nodeDisconnected("server-2", true);
		expect(node.available).toBeFalsy();
		expect(broker.isNodeAvailable("server-2")).toBeFalsy();		

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("node.broken", node);

		expect(broker.isActionAvailable("other.find")).toBeFalsy();
		expect(broker.isActionAvailable("other.get")).toBeFalsy();
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

describe("Test ServiceBroker with Transporter", () => {

	let transporter = new Transporter();
	transporter.init = jest.fn(); 
	transporter.connect = jest.fn(() => Promise.resolve()); 
	transporter.disconnect = jest.fn(); 
	transporter.sendHeartbeat = jest.fn(); 
	transporter.emit = jest.fn(); 
	transporter.request = jest.fn(ctx => Promise.resolve(ctx)); 

	let broker= new ServiceBroker({
		transporter,
		nodeID: "12345",
		requestRetry: 2
	});

	it("should call transporter.init", () => {
		expect(broker).toBeDefined();
		expect(broker.transporter).toBeDefined();
		expect(broker.nodeID).toBe("12345");

		expect(transporter.init).toHaveBeenCalledTimes(1);
		expect(transporter.init).toHaveBeenCalledWith(broker);

		expect(transporter.connect).toHaveBeenCalledTimes(0);
	});

	it("should call transporter.connect", () => {
		broker.start().then(() => {
			expect(transporter.connect).toHaveBeenCalledTimes(1);
			expect(broker.heartBeatTimer).toBeDefined();
			expect(broker.checkNodesTimer).toBeDefined();
		});
	});

	it("should call transporter emit", () => {
		let p = { a: 1 };
		broker.emit("posts.find", p);
		expect(transporter.emit).toHaveBeenCalledTimes(1);
		expect(transporter.emit).toHaveBeenCalledWith("posts.find", p);
	});

	let mockAction = {
		name: "posts.find",
		service: { broker },
		handler: jest.fn(ctx => ctx)
	};

	it("should call transporter.request with new context", () => {
		let p = { abc: 100 };

		broker.registerAction(mockAction, "99999");
		return broker.call("posts.find", p).then(ctx => {
			expect(transporter.request).toHaveBeenCalledTimes(1);
			expect(transporter.request).toHaveBeenCalledWith(ctx, { retryCount: 2, timeout: 15000});
			expect(ctx.params).toEqual(p);
		});
	});

	it("should call transporter.request with new context", () => {
		let p = { abc: 100 };
		let parentCtx = new Context(p);
		transporter.request.mockClear();

		return broker.call("posts.find", p, { parentCtx, timeout: 5000 }).then(ctx => {
			expect(transporter.request).toHaveBeenCalledTimes(1);
			expect(transporter.request).toHaveBeenCalledWith(ctx, { parentCtx, retryCount: 2, timeout: 5000});
			expect(ctx.parent).toBe(parentCtx);		
		});
	});

	it("should call broker.nodeUnavailable if transporter.request throw RequestTimeoutError", () => {
		let p = { abc: 100 };
		transporter.request = jest.fn(() => Promise.reject(new RequestTimeoutError({ action: "posts.find" }, "server-2")));
		broker._callCount = 0;

		return broker.call("posts.find", p).catch(err => {
			expect(err).toBeInstanceOf(RequestTimeoutError);
			expect(err.data.action).toBe("posts.find");
			expect(broker._callCount).toBe(3); // requestRetry = 2
		});
	});
	
	it("should call transporter.disconnect", () => {
		broker.stop();
		expect(transporter.disconnect).toHaveBeenCalledTimes(1);
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
			return ctx.after(handler(ctx), res => {
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
		expect(utils.isPromise(p)).toBeTruthy();
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
			return ctx.after(handler(ctx), res => {
				flow.push("A1");
				return res;		
			});
		};
	};

	let mw2 = handler => {
		return ctx => {
			flow.push("B2");
			return { user: "bobcsi" };
		};
	};

	let mw3 = handler => {
		return ctx => {
			flow.push("B3");
			return ctx.after(handler(ctx), res => {
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
		expect(utils.isPromise(p)).toBeTruthy();
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
			return ctx.after(handler(ctx), res => {
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
			return ctx.after(handler(ctx), res => {
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
		expect(utils.isPromise(p)).toBeTruthy();
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
			return ctx.after(handler(ctx), res => {
				flow.push("A1");
				return res;		
			});
		};
	};

	let mw2 = handler => {
		return ctx => {
			flow.push("B2");
			throw new Error("Something happened in mw2");
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
		expect(utils.isPromise(p)).toBeTruthy();
		return p.catch(err => {
			expect(err.message).toEqual("Something happened in mw2");
			expect(flow.join("-")).toBe("B1-B2");
		});
	});	
});