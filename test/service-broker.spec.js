"use strict";

const utils = require("../src/utils");
const Service = require("../src/service");
const ServiceBroker = require("../src/service-broker");
const Context = require("../src/context");
const Transporter = require("../src/transporters/base");

describe("Test ServiceBroker constructor", () => {

	it("should set default options", () => {
		let broker = new ServiceBroker();
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({ logLevel: "info", metrics: false, nodeHeartbeatTimeout : 30, sendHeartbeatTime: 10});
		expect(broker.services).toBeInstanceOf(Map);
		expect(broker.actions).toBeInstanceOf(Map);
		expect(broker.transporter).toBeUndefined();
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());
	});

	it("should merge options", () => {
		let broker = new ServiceBroker( { nodeHeartbeatTimeout: 20, metrics: true, logLevel: "debug" });
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({ logLevel: "debug", metrics: true, nodeHeartbeatTimeout : 20, sendHeartbeatTime: 10});
		expect(broker.services).toBeInstanceOf(Map);
		expect(broker.actions).toBeInstanceOf(Map);
		expect(broker.transporter).toBeUndefined();
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());
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
		
		let mockService = {
			name: "posts",
			broker: broker
		};

		let mockAction = {
			name: "posts.find",
			service: mockService,
			handler: jest.fn(ctx => ctx)
		};	

		broker.registerAction(mockService, mockAction);		

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
		broker.emitLocal("test.event", p, "other", true);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(p, "other", true);

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

describe("Test plugin system", () => {
	let plugin1 = {
	};

	let plugin2 = {
		started: jest.fn(),
		stopped: jest.fn()
	};

	let plugin3 = {
		starting: jest.fn(),
		started: jest.fn(),
		serviceStarted: jest.fn(),
		serviceStopped: jest.fn(),
		stopping: jest.fn(),
		stopped: jest.fn()
	};

	let broker = new ServiceBroker();
	let service = broker.loadService("./examples/math.service");
	
	it("should register plugins", () => {
		broker.plugin(plugin1);
		broker.plugin(plugin2);
		broker.plugin(plugin3);

		expect(broker.plugins.length).toBe(3);
	});

	it("should call plugin 'starting' & 'started' methods", () => {
		broker.start();

		expect(plugin3.starting).toHaveBeenCalledTimes(1);
		expect(plugin3.starting).toHaveBeenCalledWith(broker);

		expect(plugin3.serviceStarted).toHaveBeenCalledTimes(1);
		expect(plugin3.serviceStarted).toHaveBeenCalledWith(broker, service);

		expect(plugin2.started).toHaveBeenCalledTimes(1);
		expect(plugin2.started).toHaveBeenCalledWith(broker);
		
		expect(plugin3.started).toHaveBeenCalledTimes(1);
		expect(plugin3.started).toHaveBeenCalledWith(broker);
	});

	it("should call plugin 'stopping' & 'stopped' methods", () => {
		broker.stop();

		expect(plugin3.stopping).toHaveBeenCalledTimes(1);
		expect(plugin3.stopping).toHaveBeenCalledWith(broker);

		expect(plugin3.serviceStopped).toHaveBeenCalledTimes(1);
		expect(plugin3.serviceStopped).toHaveBeenCalledWith(broker, service);

		expect(plugin2.stopped).toHaveBeenCalledTimes(1);
		expect(plugin2.stopped).toHaveBeenCalledWith(broker);

		expect(plugin3.stopped).toHaveBeenCalledTimes(1);
		expect(plugin3.stopped).toHaveBeenCalledWith(broker);
	});
});

describe("Test loadServices", () => {

	let broker = new ServiceBroker();
	
	it("should found 6 services", () => {
		expect(broker.loadServices("./examples")).toBe(6);
		expect(broker.hasService("math")).toBeTruthy();
		expect(broker.hasAction("math.add")).toBeTruthy();
	});

});

describe("Test loadService", () => {

	let broker = new ServiceBroker();
	
	it("should load math service", () => {
		let service = broker.loadService("./examples/math.service.js");
		expect(service).toBeDefined();
		expect(broker.hasService("math")).toBeTruthy();
		expect(broker.hasAction("math.add")).toBeTruthy();
	});

});

describe("Test service registration", () => {

	let broker = new ServiceBroker();

	let mockService = {
		name: "posts",
		broker: broker
	};	

	it("test register service", () => {
		let registerServiceCB = jest.fn();
		broker.on("register.service.posts", registerServiceCB);

		expect(broker.services.size).toBe(0);
		broker.registerService(mockService);
		expect(broker.services.size).toBe(1);
		expect(registerServiceCB).toHaveBeenCalledWith(mockService);
		expect(registerServiceCB).toHaveBeenCalledTimes(1);
	});

	it("test has & get service", () => {
		expect(broker.hasService("noservice")).toBeFalsy();
		expect(broker.hasService("posts")).toBeTruthy();

		expect(broker.getService("noservice")).toBeUndefined();
		expect(broker.getService("posts").data).toBe(mockService);		
	});

});

describe("Test action registration", () => {

	let broker = new ServiceBroker();

	let mockService = {
		name: "posts",
		broker: broker
	};

	let mockAction = {
		name: "posts.find",
		service: mockService,
		handler: jest.fn(ctx => ctx)
	};	

	it("should call a register event", () => {
		let registerActionCB = jest.fn();
		broker.on("register.action.posts.find", registerActionCB);

		broker.registerAction(mockService, mockAction);
		expect(broker.actions.size).toBe(1);
		expect(registerActionCB).toHaveBeenCalledWith(mockService, mockAction, undefined);
		expect(registerActionCB).toHaveBeenCalledTimes(1);
	});

	it("should return with the action", () => {
		expect(broker.hasAction("noaction")).toBeFalsy();
		expect(broker.hasAction("posts.find")).toBeTruthy();
	});
		
	it("should reject if no action", () => {
		return broker.call("noaction").catch(err => {
			expect(err).toBeDefined();
		});
	});

	it("should return context & call the action handler", () => {
		return broker.call("posts.find").then(ctx => {
			expect(ctx).toBeDefined();
			expect(ctx.id).toBeDefined();
			expect(ctx.requestID).toBeDefined();
			expect(ctx.level).toBe(1);
			expect(ctx.broker).toBe(broker);
			expect(ctx.action).toBe(mockAction);
			expect(ctx.nodeID).toBeUndefined();
			expect(ctx.params).toBeDefined();
			expect(mockAction.handler).toHaveBeenCalledTimes(1);
			expect(mockAction.handler).toHaveBeenCalledWith(ctx);
			mockAction.handler.mockClear();
		});
	});
		
	it("should set params to context", () => {
		let params = { a: 1 };
		return broker.call("posts.find", params).then(ctx => {
			expect(ctx.params).not.toBe(params);
			expect(ctx.params.a).toBe(params.a);
			expect(ctx.level).toBe(1);
		});
	});

	it("should set requestID to context", () => {
		return broker.call("posts.find", null, null, "req123").then(ctx => {
			expect(ctx.requestID).toBe("req123");
		});
	});	

	it("should create a sub context of parent context", () => {
		let prevCtx = new Context({
			params: {
				a: 5,
				b: 2
			}
		});		
		let params = { a: 1 };

		return broker.call("posts.find", params, prevCtx).then(ctx => {
			expect(ctx.params).not.toBe(params);
			expect(ctx.params.a).toBe(1);
			expect(ctx.params.b).not.toBeDefined();
			expect(ctx.level).toBe(2);
			expect(ctx.parent).toBe(prevCtx);
		});

	});
});

describe("Test versioned action registration", () => {

	let broker = new ServiceBroker();

	let registerAction = jest.fn();
	broker.on("register.action.posts.find", registerAction);

	let registerActionv1 = jest.fn();
	broker.on("register.action.v1.posts.find", registerActionv1);

	let registerActionv2 = jest.fn();
	broker.on("register.action.v2.posts.find", registerActionv2);

	let findV1 = jest.fn(ctx => ctx);
	let findV2 = jest.fn(ctx => ctx);

	let serviceV1 = new Service(broker, {
		name: "posts",
		version: 1,

		actions: {
			find: findV1
		}
	});

	let serviceV2 = new Service(broker, {
		name: "posts",
		version: 2,
		latestVersion: true,

		actions: {
			find: findV2
		}
	});	

	it("should registered both versioned service", () => {
		expect(broker.actions.size).toBe(3);
		expect(registerAction).toHaveBeenCalledWith(serviceV2, jasmine.any(Object), undefined);
		expect(registerAction).toHaveBeenCalledTimes(1);

		expect(registerActionv1).toHaveBeenCalledWith(serviceV1, jasmine.any(Object), undefined);
		expect(registerActionv1).toHaveBeenCalledTimes(1);

		expect(registerActionv2).toHaveBeenCalledWith(serviceV2, jasmine.any(Object), undefined);
		expect(registerActionv2).toHaveBeenCalledTimes(1);
	});
	
	it("should return with the correct action", () => {
		expect(broker.hasAction("posts.find")).toBeTruthy();
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

	it("should call the unversioned v2 handler", () => {
		findV2.mockClear();
		return broker.call("posts.find").then(ctx => {
			expect(findV2).toHaveBeenCalledTimes(1);
		});
	});
		
});

describe("Test getLocalActionList", () => {

	let broker = new ServiceBroker();

	let service = new Service(broker, {
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

		broker.registerAction(null, actionRemote, "node");
		let list = broker.getLocalActionList();
		expect(Object.keys(list).length).toBe(1);
	});

	it("should contain both registered local action", () => {

		let actionLocal = {
			name: "device.find",
			params: {
				a: "required|number"
			},
			service: service,
			handler: jest.fn()
		};

		broker.registerAction(service, actionLocal);
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
		broker.registerAction(null, action, "server-2");

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("register.action.users.get", null, {"handler": jasmine.any(Function), "name": "users.get"}, "server-2");
		
		let findItem = broker.actions.get("users.get").get();
		expect(findItem).toBeDefined();
		expect(findItem.local).toBeFalsy();
		expect(findItem.nodeID).toBe("server-2");
		broker.emitLocal.mockClear();
	});

	it("should unregister the remote action", () => {
		broker.unregisterAction(null, action, "server-2");

		//expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		//expect(broker.emitLocal).toHaveBeenCalledWith("unregister.action.users.get", null, {"handler": jasmine.any(Function), "name": "users.get"}, "server-2");
		
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
		expect(node.available).toBeFalsy();
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("node.disconnected", node);
		//expect(broker.emitLocal).toHaveBeenCalledWith("unregister.action.other.get", null, {"name": "other.get"}, "server-2");
		//expect(broker.emitLocal).toHaveBeenCalledWith("unregister.action.other.find", null, {"name": "other.find"}, "server-2");
	});	

	it("should call node.broker event if disconnected unexpectedly", () => {
		broker.processNodeInfo(info.nodeID, info);
		broker.emitLocal.mockClear();

		let node = broker.nodes.get("server-2");
		broker.nodeDisconnected("server-2", true);
		expect(node.available).toBeFalsy();
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("node.broken", node);
	});	
});

describe("Test ServiceBroker with Transporter", () => {

	let transporter = new Transporter();
	transporter.init = jest.fn(); 
	transporter.connect = jest.fn(() => Promise.resolve()); 
	transporter.disconnect = jest.fn(); 
	transporter.sendHeartbeat = jest.fn(); 
	transporter.emit = jest.fn(); 
	transporter.request = jest.fn((nodeID, ctx) => Promise.resolve(ctx)); 

	let broker= new ServiceBroker({
		transporter,
		nodeID: "12345"
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

	let mockService = {
		name: "posts",
		broker: broker
	};

	let mockAction = {
		name: "posts.find",
		service: mockService,
		handler: jest.fn(ctx => ctx)
	};

	it("should call transporter.request wqith new context", () => {
		let p = { abc: 100 };

		broker.registerAction(mockService, mockAction, "99999");
		return broker.call("posts.find", p).then(ctx => {
			expect(transporter.request).toHaveBeenCalledTimes(1);
			expect(transporter.request).toHaveBeenCalledWith("99999", ctx);
			expect(ctx.params).toEqual(p);
		});
	});

	it("should call transporter.request with new context", () => {
		let p = { abc: 100 };
		let parentCtx = new Context(p);
		transporter.request.mockClear();

		return broker.call("posts.find", p, parentCtx).then(ctx => {
			expect(transporter.request).toHaveBeenCalledTimes(1);
			expect(transporter.request).toHaveBeenCalledWith("99999", ctx);
			expect(ctx.parent).toBe(parentCtx);		
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
	let mw1Sync = jest.fn((ctx, next) => {
		flow.push("B1");
		return next().then((res) => {
			flow.push("A1");
			return res;		
		});
	});

	let mw2Async = jest.fn((ctx, next) => {
		flow.push("B2");
		return next(new Promise((resolve) => {
			setTimeout(() => {
				flow.push("B2P");
				resolve();
			}, 10);
		})).then(res => {
			flow.push("A2");
			return res;		
		});
	});

	let mw3Empty = null;

	let master = jest.fn(() => {
		return new Promise((resolve, reject) => {
			flow.push("MASTER");
			resolve({ user: "icebob" });
		});
	});

	let broker = new ServiceBroker();
	broker.loadService("./examples/math.service");
	
	it("should register plugins", () => {
		broker.use(mw1Sync);
		broker.use(mw2Async);
		broker.use(mw3Empty);

		expect(broker.middlewares.length).toBe(2);
	});

	it("should call all middlewares functions & master", () => {
		let ctx = new Context();
		let p = broker.callMiddlewares(ctx, master);		
		expect(utils.isPromise(p)).toBeTruthy();
		return p.then(res => {
			expect(res).toEqual({ user: "icebob" });
			expect(mw1Sync).toHaveBeenCalledTimes(1);
			expect(mw1Sync).toHaveBeenCalledWith(ctx, jasmine.any(Function));

			expect(mw2Async).toHaveBeenCalledTimes(1);
			expect(mw2Async).toHaveBeenCalledWith(ctx, jasmine.any(Function));

			expect(master).toHaveBeenCalledTimes(1);

			expect(flow.join("-")).toBe("B1-B2-B2P-MASTER-A2-A1");
		});
	});

	it("should call callMiddlewares if has registered middlewares", () => {
		broker.callMiddlewares = jest.fn(ctx => ctx);
		return broker.call("math.add").then(ctx => {
			expect(broker.callMiddlewares).toHaveBeenCalledTimes(1);
			expect(broker.callMiddlewares).toHaveBeenCalledWith(ctx, jasmine.any(Function));

		});
	});	
});

describe("Test middleware system with SYNC break", () => {
	let flow = [];
	let mw1 = jest.fn((ctx, next) => {
		flow.push("B1");
		return next().then((res) => {
			flow.push("A1");
			return res;		
		});
	});

	let mw2 = jest.fn((ctx, next) => {
		flow.push("B2");
		// Return the result (sync)
		return Promise.resolve({ user: "bobcsi" });
	});

	let mw3 = jest.fn((ctx, next) => {
		flow.push("B3");
		return next().then((res) => {
			flow.push("A3");
			return res;		
		});
	});	

	let master = jest.fn(() => {
		return new Promise((resolve) => {
			flow.push("MASTER");
			resolve({ user: "icebob" });
		});
	});

	let broker = new ServiceBroker();
	broker.loadService("./examples/math.service");

	
	it("should register plugins", () => {
		broker.use(mw1, mw2, mw3);
		expect(broker.middlewares.length).toBe(3);
	});	

	it("should call only mw1 & mw2 middlewares functions", () => {
		let ctx = new Context();
		let p = broker.callMiddlewares(ctx, master);		
		expect(utils.isPromise(p)).toBeTruthy();
		return p.then(res => {
			expect(res).toEqual({ user: "bobcsi" });
			expect(mw1).toHaveBeenCalledTimes(1);
			expect(mw2).toHaveBeenCalledTimes(1);

			expect(mw3).toHaveBeenCalledTimes(0);
			expect(master).toHaveBeenCalledTimes(0);

			expect(flow.join("-")).toBe("B1-B2-A1");
		});
	});
});

describe("Test middleware system with ASYNC break", () => {
	let flow = [];
	let mw1 = jest.fn((ctx, next) => {
		flow.push("B1");
		return next().then((res) => {
			flow.push("A1");
			return res;		
		});
	});

	let mw2 = jest.fn((ctx, next) => {
		flow.push("B2");
		return next(new Promise((resolve) => {
			setTimeout(() => {
				flow.push("B2P");
				resolve({ user: "bobcsi" });
			}, 10);
		}));
	});

	let mw3 = jest.fn((ctx, next) => {
		flow.push("B3");
		return next().then((res) => {
			flow.push("A3");
			return res;		
		});
	});	

	let master = jest.fn(() => {
		return new Promise((resolve) => {
			flow.push("MASTER");
			resolve({ user: "icebob" });
		});
	});

	let broker = new ServiceBroker();
	broker.loadService("./examples/math.service");

	
	it("should register plugins", () => {
		broker.use(mw1, mw2, mw3);
		expect(broker.middlewares.length).toBe(3);
	});	

	it("should call only mw1 & mw2 middlewares functions", () => {
		let ctx = new Context();
		let p = broker.callMiddlewares(ctx, master);		
		expect(utils.isPromise(p)).toBeTruthy();
		return p.then(res => {
			expect(res).toEqual({ user: "bobcsi" });
			expect(mw1).toHaveBeenCalledTimes(1);
			expect(mw2).toHaveBeenCalledTimes(1);

			expect(mw3).toHaveBeenCalledTimes(0);
			expect(master).toHaveBeenCalledTimes(0);

			expect(flow.join("-")).toBe("B1-B2-B2P-A1");
		});
	});
});

describe("Test middleware system Exception", () => {
	let flow = [];
	let mw1 = jest.fn((ctx, next) => {
		flow.push("B1");
		return next().then((res) => {
			flow.push("A1");
			return res;		
		});
	});

	let mw2 = jest.fn((ctx, next) => {
		flow.push("B2");
		throw new Error("Something happened in mw2");
	});	

	let master = jest.fn(() => {
		return new Promise((resolve) => {
			flow.push("MASTER");
			resolve({ user: "icebob" });
		});
	});

	let broker = new ServiceBroker();
	broker.loadService("./examples/math.service");
	broker.use(mw1, mw2);

	it("should throw mw2 an exception", () => {
		let ctx = new Context();
		let p = broker.callMiddlewares(ctx, master);		
		expect(utils.isPromise(p)).toBeTruthy();
		return p.catch(err => {
			expect(err.message).toEqual("Something happened in mw2");
			expect(flow.join("-")).toBe("B1-B2");
		});
	});
});