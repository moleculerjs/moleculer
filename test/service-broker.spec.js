"use strict";

const ServiceBroker = require("../src/service-broker");
const Context = require("../src/context");
const bus = require("../src/service-bus");

describe("Test ServiceBroker", () => {

	let broker= new ServiceBroker();

	let mockNode = {
		id: "test"
	};
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
		expect(broker.nodes).toBeInstanceOf(Map);
		expect(broker.services).toBeInstanceOf(Map);
		expect(broker.actions).toBeInstanceOf(Map);
		expect(broker.subscriptions).toBeInstanceOf(Map);
	});

	it("test internal node", () => {
		expect(broker.internalNode).toBeDefined();
		expect(broker.internalNode.id).toBe("internal");
		expect(broker.internalNode.name).toBe("Internal Service Node");
		expect(broker.nodes.size).toBe(1);
		expect(broker.nodes.get("internal")).toBe(broker.internalNode);
	});
	
	it("test register node", () => {
		let registerNodeCB = jest.fn();
		bus.on("register.node", registerNodeCB);

		broker.registerNode(mockNode);
		expect(broker.nodes.size).toBe(2);
		expect(broker.nodes.get("test")).toBe(mockNode);
		expect(registerNodeCB).toHaveBeenCalledTimes(1);
		expect(registerNodeCB).toHaveBeenCalledWith(mockNode);
	});

	it("test register service", () => {
		let registerServiceCB = jest.fn();
		bus.on("register.service.posts", registerServiceCB);

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
		expect(broker.getService("posts")).toBe(mockService);		
	});

	it("test register action", () => {
		let registerActionCB = jest.fn();
		bus.on("register.action.posts.find", registerActionCB);

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

});
