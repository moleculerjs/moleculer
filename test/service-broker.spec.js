"use strict";

const ServiceBroker = require("../src/service-broker");
const Context = require("../src/context");
const Transporter = require("../src/transporters/base");

describe("Test ServiceBroker constructor", () => {

	it("should set default options", () => {
		let broker = new ServiceBroker();
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({ metrics: false, nodeHeartbeatTimeout : 30, sendHeartbeatTime: 10});
		expect(broker.services).toBeInstanceOf(Map);
		expect(broker.actions).toBeInstanceOf(Map);
		expect(broker.transporter).toBeUndefined();
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());
	});

	it("should merge options", () => {
		let broker = new ServiceBroker( { nodeHeartbeatTimeout: 20, metrics: true });
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({ metrics: true, nodeHeartbeatTimeout : 20, sendHeartbeatTime: 10});
		expect(broker.services).toBeInstanceOf(Map);
		expect(broker.actions).toBeInstanceOf(Map);
		expect(broker.transporter).toBeUndefined();
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());
	});

});

describe("Test on/off event emitter", () => {

	let broker = new ServiceBroker();
	let handler = jest.fn();

	it("register event handler", () => {
		broker.on("test.event.**", handler);

		broker.emitLocal("test");
		expect(handler).toHaveBeenCalledTimes(0);

		broker.emitLocal("test.event");
		expect(handler).toHaveBeenCalledTimes(1);

		broker.emitLocal("test.event.demo");
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it("unregister event handler", () => {
		handler.mockClear();
		broker.off("test.event.**", handler);

		broker.emitLocal("test");
		broker.emitLocal("test.event");
		broker.emitLocal("test.event.demo");
		expect(handler).toHaveBeenCalledTimes(0);
	});

});

describe("Test loadServices", () => {

	let broker = new ServiceBroker();
	
	it("should found 0 services", () => {
		expect(broker.loadServices("./examples")).toBe(3);
		expect(broker.hasService("math")).toBeTruthy();
		expect(broker.hasAction("math.add")).toBeTruthy();
	});

});

describe("Test loadService", () => {

	let broker = new ServiceBroker();
	
	it("should found 0 services", () => {
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

	it("should return the action", () => {
		expect(broker.hasAction("noaction")).toBeFalsy();
		expect(broker.hasAction("posts.find")).toBeTruthy();
	});
		
	it("should return context & call the action handler", () => {

		expect(() => broker.call("noaction")).toThrowError();

		let ctx = broker.call("posts.find");		
		expect(ctx).toBeDefined();
		expect(ctx.id).toBeDefined();
		expect(ctx.level).toBe(1);
		expect(ctx.broker).toBe(broker);
		expect(ctx.action).toBe(mockAction);
		expect(ctx.params).toBeDefined();
		expect(mockAction.handler).toHaveBeenCalledTimes(1);
		expect(mockAction.handler).toHaveBeenCalledWith(ctx);
		mockAction.handler.mockClear();
	});
		
	it("should set params to context", () => {
		let params = { a: 1 };
		let ctx = broker.call("posts.find", params);
		expect(ctx.params).not.toBe(params);
		expect(ctx.params.a).toBe(params.a);
		expect(ctx.level).toBe(1);
	});

	it("should create a sub context of parent context", () => {
		let prevCtx = new Context({
			params: {
				a: 5,
				b: 2
			}
		});		
		let params = { a: 1 };

		let ctx = broker.call("posts.find", params, prevCtx);
		expect(ctx.params).not.toBe(params);
		expect(ctx.params.a).toBe(1);
		expect(ctx.params.b).not.toBeDefined();
		expect(ctx.level).toBe(2);
		expect(ctx.parent).toBe(prevCtx);

	});
});

describe("Test getLocalActionList", () => {

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

	broker.registerAction(mockService, mockAction);

	it("should contain the local registered action", () => {
		let list = broker.getLocalActionList();
		expect(list.length).toBe(1);
		expect(list[0]).toBe("posts.find");
	});

	it("should not contain the remote registered action", () => {

		let actionRemote = {
			name: "users.get",
			handler: jest.fn()
		};

		broker.registerAction(null, actionRemote, "node");
		let list = broker.getLocalActionList();
		expect(list.length).toBe(1);
	});

	it("should contain both registered local action", () => {

		let actionLocal = {
			name: "device.find",
			service: mockService,
			handler: jest.fn()
		};

		broker.registerAction(mockService, actionLocal);
		let list = broker.getLocalActionList();
		expect(list.length).toBe(2);
		expect(list[1]).toBe("device.find");
	});
});
	
describe("Test emitLocal", () => {

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

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("unregister.action.users.get", null, {"handler": jasmine.any(Function), "name": "users.get"}, "server-2");
		
		let findItem = broker.actions.get("users.get");
		expect(findItem).toBeUndefined();
	});
	
});

describe("Test nodes methods", () => {

	let broker = new ServiceBroker();

	let info = {
		nodeID: "server-2",
		actions: [
			"other.find",
			"other.get"
		]
	};
	broker.emitLocal = jest.fn();
	let oldBrokerNodeDisconnected = broker.nodeDisconnected;

	it("should register node", () => {
		broker.processNodeInfo(info.nodeID, info);

		let node = broker.nodes.get("server-2");
		expect(node).toBeDefined();
		expect(node).toBe(info);
		expect(node.lastHeartbeatTime).toBeDefined();

		expect(broker.emitLocal).toHaveBeenCalledTimes(3);
		expect(broker.emitLocal).toHaveBeenCalledWith("register.node.server-2", node);
	});

	it("should find the remote actions", () => {
		let findItem = broker.actions.get("other.find").get();
		expect(findItem).toBeDefined();
		expect(findItem.local).toBeFalsy();
		expect(findItem.nodeID).toBe("server-2");

		let getItem = broker.actions.get("other.get").get();
		expect(getItem).toBeDefined();
		expect(getItem.local).toBeFalsy();
		expect(getItem.nodeID).toBe("server-2");
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

	it("should remove node from nodes map", () => {
		broker.nodeDisconnected = oldBrokerNodeDisconnected;
		broker.emitLocal.mockClear();
		let node = broker.nodes.get("server-2");
		broker.nodeDisconnected("server-2");
		let notfound = broker.nodes.get("server-2");
		expect(notfound).toBeUndefined();
		expect(broker.emitLocal).toHaveBeenCalledTimes(3);
		expect(broker.emitLocal).toHaveBeenCalledWith("unregister.node.server-2", node);
		expect(broker.emitLocal).toHaveBeenCalledWith("unregister.action.other.get", null, {"name": "other.get"}, "server-2");
		expect(broker.emitLocal).toHaveBeenCalledWith("unregister.action.other.find", null, {"name": "other.find"}, "server-2");
	});	
});

describe("Test ServiceBroker with Transporter", () => {

	let transporter = new Transporter();
	transporter.init = jest.fn(); 
	transporter.connect = jest.fn(); 
	transporter.disconnect = jest.fn(); 
	transporter.sendHeartbeat = jest.fn(); 
	transporter.emit = jest.fn(); 
	transporter.request = jest.fn((nodeID, ctx) => ctx); 

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
		broker.start();
		expect(transporter.connect).toHaveBeenCalledTimes(1);
		expect(broker.heartBeatTimer).toBeDefined();
		expect(broker.checkNodesTimer).toBeDefined();
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
		let ctx = broker.call("posts.find", p);

		expect(transporter.request).toHaveBeenCalledTimes(1);
		expect(transporter.request).toHaveBeenCalledWith("99999", ctx);
		expect(ctx.params).toEqual(p);
		
	});

	it("should call transporter.request with new context", () => {
		let p = { abc: 100 };
		let parentCtx = new Context(p);
		transporter.request.mockClear();

		let ctx = broker.call("posts.find", p, parentCtx);

		expect(transporter.request).toHaveBeenCalledTimes(1);
		expect(transporter.request).toHaveBeenCalledWith("99999", ctx);
		expect(ctx.parent).toBe(parentCtx);		
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
