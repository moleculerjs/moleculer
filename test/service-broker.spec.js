"use strict";

const ServiceBroker = require("../src/service-broker");
const Context = require("../src/context");
const Transporter = require("../src/transporters/base");

describe("Test ServiceBroker", () => {

	let broker= new ServiceBroker();

	let mockService = {
		name: "posts",
		$broker: broker
	};

	let mockAction = {
		name: "posts.find",
		service: mockService,
		handler: jest.fn(ctx => ctx)
	};	

	it("test ServiceBroker constructor", () => {
		expect(broker).toBeDefined();
		expect(broker.options).toEqual({});
		expect(broker.services).toBeInstanceOf(Map);
		expect(broker.actions).toBeInstanceOf(Map);
		expect(broker.transporter).toBeUndefined();
		expect(broker.nodeID).toBe(require("os").hostname().toLowerCase());
	});

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

	it("test register action", () => {
		let registerActionCB = jest.fn();
		broker.on("register.action.posts.find", registerActionCB);

		broker.registerAction(mockService, mockAction);
		expect(broker.actions.size).toBe(1);
		expect(registerActionCB).toHaveBeenCalledWith(mockService, mockAction);
		expect(registerActionCB).toHaveBeenCalledTimes(1);
	});

	it("test register action", () => {
		expect(broker.hasAction("noaction")).toBeFalsy();
		expect(broker.hasAction("posts.find")).toBeTruthy();
	});
		
	it("test call action", () => {

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
		
	it("test call action with param", () => {
		let params = { a: 1 };
		let ctx = broker.call("posts.find", params);
		expect(ctx.params).not.toBe(params);
		expect(ctx.params.a).toBe(params.a);
		expect(ctx.level).toBe(1);
	});

	it("test call action with parent context", () => {
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

	it("test getLocalActionList", () => {
		let list = broker.getLocalActionList();
		expect(list.length).toBe(1);
		expect(list[0]).toBe("posts.find");

		let actionRemote = {
			name: "users.get",
			service: mockService,
			handler: jest.fn()
		};

		broker.registerAction(mockService, actionRemote, "node");
		list = broker.getLocalActionList();
		expect(list.length).toBe(1);

		let actionLocal = {
			name: "device.find",
			service: mockService,
			handler: jest.fn()
		};

		broker.registerAction(mockService, actionLocal);
		list = broker.getLocalActionList();
		expect(list.length).toBe(2);
		expect(list[1]).toBe("device.find");
	});
	

	it("test emitLocal", () => {
		// Test emit method
		broker.emitLocal = jest.fn();

		let data = { id: 5 };
		broker.emitLocal("request.rest", data);

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("request.rest", data);

		broker.emitLocal.mockClear();
		broker.emitLocal("request.rest", "string-data");
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("request.rest", "string-data");
		
	});

	it("test processNodeInfo", () => {
		let info = {
			nodeID: "server-2",
			actions: [
				"other.find",
				"other.get"
			]
		};

		broker.processNodeInfo(info);

		let findItem = broker.actions.get("other.find").get();
		expect(findItem).toBeDefined();
		expect(findItem.local).toBeFalsy();
		expect(findItem.nodeID).toBe("server-2");

		let getItem = broker.actions.get("other.get").get();
		expect(getItem).toBeDefined();
		expect(getItem.local).toBeFalsy();
		expect(getItem.nodeID).toBe("server-2");
	});
});

describe("Test ServiceBroker with Transporter", () => {

	let transporter = new Transporter();
	transporter.init = jest.fn(); 
	transporter.connect = jest.fn(); 
	transporter.emit = jest.fn(); 

	let broker= new ServiceBroker({
		transporter,
		nodeID: "12345"
	});

	it("test constructor", () => {
		expect(broker).toBeDefined();
		expect(broker.transporter).toBeDefined();
		expect(broker.nodeID).toBe("12345");

		expect(transporter.init).toHaveBeenCalledTimes(1);
		expect(transporter.init).toHaveBeenCalledWith(broker);

		expect(transporter.connect).toHaveBeenCalledTimes(0);
	});

	it("test start", () => {
		broker.start();
		expect(transporter.connect).toHaveBeenCalledTimes(1);
	});

	it("test ServiceBroker.emit method", () => {
		let p = { a: 1 };
		broker.emit("posts.find", p);
		expect(transporter.emit).toHaveBeenCalledTimes(1);
		expect(transporter.emit).toHaveBeenCalledWith("posts.find", p);
	});
});
