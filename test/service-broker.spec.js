"use strict";

const ServiceBroker = require("../src/service-broker");
const Context = require("../src/context");
const Transporter = require("../src/transporters/base");

describe("Test ServiceBroker constructor", () => {

	let broker = new ServiceBroker();

	it("should set properties", () => {
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({});
		expect(broker.services).toBeInstanceOf(Map);
		expect(broker.actions).toBeInstanceOf(Map);
		expect(broker.transporter).toBeUndefined();
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());
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
		expect(registerActionCB).toHaveBeenCalledWith(mockService, mockAction);
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
		expect(ctx.service).toBe(mockService);
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
			service: mockService,
			handler: jest.fn()
		};

		broker.registerAction(mockService, actionRemote, "node");
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

	it("should call the event handler locally with object param", () => {
		// Test emit method
		broker.emitLocal = jest.fn();

		let data = { id: 5 };
		broker.emitLocal("request.rest", data);

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("request.rest", data);
	});

	it("should call the event handler locally with string param", () => {
		broker.emitLocal.mockClear();
		broker.emitLocal("request.rest", "string-data");
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("request.rest", "string-data");
	});
});

describe("Test processNodeInfo", () => {

	let broker = new ServiceBroker();

	let info = {
		nodeID: "server-2",
		actions: [
			"other.find",
			"other.get"
		]
	};

	broker.processNodeInfo(info);

	it("should find the remote action after processNodeInfo", () => {
		let findItem = broker.actions.get("other.find").get();
		expect(findItem).toBeDefined();
		expect(findItem.local).toBeFalsy();
		expect(findItem.nodeID).toBe("server-2");

		let getItem = broker.actions.get("other.get").get();
		expect(getItem).toBeDefined();
		expect(getItem.local).toBeFalsy();
		expect(getItem.nodeID).toBe("server-2");
	});

	broker.processNodeInfo(info);

	it("should not contain duplicate actions", () => {
		// TODO
	});
	
});

describe("Test ServiceBroker with Transporter", () => {

	let transporter = new Transporter();
	transporter.init = jest.fn(); 
	transporter.connect = jest.fn(); 
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

	it("should call transporter.request wqith new context", () => {
		let p = { abc: 100 };
		let parentCtx = new Context(p);
		transporter.request.mockClear();

		let ctx = broker.call("posts.find", p, parentCtx);

		expect(transporter.request).toHaveBeenCalledTimes(1);
		expect(transporter.request).toHaveBeenCalledWith("99999", ctx);
		expect(ctx.parent).toBe(parentCtx);		
	});
	
});
