"use strict";

const ServiceBroker = require("../src/service-broker");
const Context = require("../src/context");
const bus = require("../src/service-bus");

describe("Test ServiceBroker", () => {

	let broker= new ServiceBroker();

	it("test ServiceBroker constructor", () => {
		expect(broker).toBeDefined();
		expect(broker.services).toBeDefined();
		expect(broker.services).toBeInstanceOf(Map);

		expect(broker.actions).toBeDefined();
		expect(broker.actions).toBeInstanceOf(Map);

		expect(broker.subscriptions).toBeDefined();
		expect(broker.subscriptions).toBeInstanceOf(Map);

		expect(broker.nodes).toBeDefined();
		expect(broker.nodes).toBeInstanceOf(Map);

		expect(broker.options).toEqual({});
	});

	it("test internal node", () => {
		expect(broker.internalNode).toBeDefined();
		expect(broker.internalNode.id).toBe("internal");
		expect(broker.internalNode.name).toBe("Internal Service Node");
		expect(broker.nodes.size).toBe(1);
		expect(broker.nodes.get("internal")).toBe(broker.internalNode);
	});
	
	it("test register node", () => {
		let mockNode = {
			id: "test"
		};

		let registerNodeCB = jest.fn();
		bus.on("register.node", registerNodeCB);

		broker.registerNode(mockNode);
		expect(broker.nodes.size).toBe(2);
		expect(broker.nodes.get("test")).toBe(mockNode);
		expect(registerNodeCB).toHaveBeenCalledTimes(1);
		expect(registerNodeCB).toHaveBeenCalledWith(mockNode);

	});

	it("test register service", () => {
		let mockNode = {
			id: "test"
		};

		let mockService = {
			name: "test-service",
			$node: mockNode
		};

		let registerServiceCB = jest.fn();
		bus.on("register.service", registerServiceCB);

		broker.registerService(mockService);
		expect(broker.services.size).toBe(1);
		expect(registerServiceCB).toHaveBeenCalledWith(mockService);
		expect(registerServiceCB).toHaveBeenCalledTimes(1);

		expect(broker.hasService("noservice")).toBeFalsy();
		expect(broker.hasService("test-service")).toBeTruthy();

		expect(broker.getService("noservice")).toBeUndefined();
		expect(broker.getService("test-service")).toBe(mockService);
		
	});


	it("test register action", () => {
		let mockNode = {
			id: "test"
		};

		let mockService = {
			name: "test-service",
			$node: mockNode,
			$broker: broker
		};

		let mockAction = {
			name: "test.action",
			service: mockService,
			handler: jest.fn(ctx => ctx)
		};

		let registerActionCB = jest.fn();
		bus.on("register.action", registerActionCB);

		broker.registerAction(mockNode, mockService, mockAction);
		expect(broker.actions.size).toBe(1);
		expect(registerActionCB).toHaveBeenCalledWith(mockService, mockAction);
		expect(registerActionCB).toHaveBeenCalledTimes(1);

		expect(broker.hasAction("noaction")).toBeFalsy();
		expect(broker.hasAction("test.action")).toBeTruthy();

		// Test action call
		expect(() => broker.call("noaction")).toThrow();
		
		let ctx = broker.call("test.action");
		expect(ctx.id).toBeDefined();
		expect(ctx.service).toBe(mockService);
		expect(ctx.action).toBe(mockAction);
		expect(ctx.params).toBeDefined();
		expect(mockAction.handler).toHaveBeenCalledTimes(1);
		expect(mockAction.handler).toHaveBeenCalledWith(ctx);
		mockAction.handler.mockClear();
		
		let params = { a: 1 };
		ctx = broker.call("test.action", params);
		expect(ctx.params).not.toBe(params);
		expect(ctx.params.a).toBe(params.a);
		expect(ctx.level).toBe(1);

		let prevCtx = new Context({
			params: {
				a: 5,
				b: 2
			}
		});		

		ctx = broker.call("test.action", params, prevCtx);
		expect(ctx.params).not.toBe(params);
		expect(ctx.params.a).toBe(1);
		expect(ctx.params.b).not.toBeDefined();
		expect(ctx.level).toBe(2);
		

	});

});
