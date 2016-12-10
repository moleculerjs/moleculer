"use strict";

const ServiceBroker = require("../src/service-broker");
const Service = require("../src/service");
const bus = require("../src/service-bus");

describe("Test ServiceBroker", () => {

	let opts = {};
	let broker= new ServiceBroker(opts);

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

		expect(broker.options).toBe(opts);
	});

	it("test internal node", () => {
		expect(broker.internalNode).toBeDefined();
		expect(broker.internalNode.id).toBe("internal");
		expect(broker.internalNode.name).toBe("Internal Service Node");
		expect(broker.nodes.size).toBe(1);
		expect(broker.nodes.get("internal")).toBe(broker.internalNode);
	});
	
	it("test register service", () => {
		let mockNode = {
			id: "test"
		};

		let mockService = {
			name: "test-service",
			$node: mockNode
		};

		let registerNodeCB = jest.fn();
		bus.on("register.node", registerNodeCB);

		let registerServiceCB = jest.fn();
		bus.on("register.service", registerServiceCB);

		broker.registerService(mockService);
		expect(broker.nodes.size).toBe(2);
		expect(broker.nodes.get("test")).toBe(mockNode);
		expect(registerNodeCB).toHaveBeenCalledTimes(1);
		expect(registerNodeCB).toHaveBeenCalledWith(mockNode);

		expect(broker.services.size).toBe(1);
		expect(registerServiceCB).toHaveBeenCalledWith(mockService);
		expect(registerServiceCB).toHaveBeenCalledTimes(1);

		expect(broker.hasService("noservice")).toBeFalsy();
		expect(broker.hasService("test-service")).toBeTruthy();

		expect(broker.getService("noservice")).toBeUndefined();
		expect(broker.getService("test-service")).toBe(mockService);
		
	});




});
