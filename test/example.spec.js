"use strict";

let _ = require("lodash");
let bus = require("../src/service-bus");
let Service = require("../src/service");
let ServiceBroker = require("../src/service-broker");
let broker = new ServiceBroker();

describe("Create demo service", () => {

	let PostSchema = {
		settings: {
			name: "posts",
			version: 1,
			namespace: "posts"
		},

		actions: {
			find: {
				cache: true,
				rest: true,
				ws: true,
				graphql: true,
				handler(ctx) {}
			}
		},

		events: {
			"request.rest.**"(ctx) {}
		}

	};

	it("test ServiceBroker properties", () => {
		expect(broker.services).toBeDefined();
		expect(broker.services).toBeInstanceOf(Map);

		expect(broker.actions).toBeDefined();
		expect(broker.actions).toBeInstanceOf(Map);

		expect(broker.subscriptions).toBeDefined();
		expect(broker.subscriptions).toBeInstanceOf(Map);

		expect(broker.nodes).toBeDefined();
		expect(broker.nodes).toBeInstanceOf(Map);
		expect(broker.nodes.size).toBe(1);
	});

	it("test broker internal node", () => {
		expect(broker.internalNode).toBeDefined();
		expect(broker.internalNode.id).toBe("internal");
		expect(broker.internalNode.name).toBe("Internal Service Node");
	});

	it("test service create", () => {
		let handlerRegisterNode = jest.fn();
		bus.on("register.node", handlerRegisterNode);

		let handlerRegisterService = jest.fn();
		bus.on("register.service", handlerRegisterService);

		let handlerRegisterAction = jest.fn();
		bus.on("register.action", handlerRegisterAction);

		broker.registerService = jest.fn(broker.registerService);
		broker.registerAction = jest.fn(broker.registerAction);
		broker.subscribeEvent = jest.fn(broker.subscribeEvent);

		let schema = _.cloneDeep(PostSchema);

		schema.events["request.rest.**"] = jest.fn();

		let service = new Service(broker, broker.internalNode, schema);

		expect(service).toBeDefined();

		expect(handlerRegisterNode).toHaveBeenCalledTimes(0);

		expect(broker.registerService).toHaveBeenCalledTimes(1);
		expect(broker.registerService).toHaveBeenCalledWith(broker.internalNode, service);
		expect(broker.services.size).toBe(1);
		expect(handlerRegisterService).toHaveBeenCalledTimes(1);

		expect(broker.registerAction).toHaveBeenCalledTimes(1);
		//expect(broker.registerAction).toHaveBeenCalledWith(broker.internalNode, service, schema.actions.find);
		expect(broker.actions.size).toBe(1);
		expect(handlerRegisterAction).toHaveBeenCalledTimes(1);

		expect(broker.subscribeEvent).toHaveBeenCalledTimes(1);
		//expect(broker.registerAction).toHaveBeenCalledWith(broker.internalNode, service, schema.actions.find);
		expect(broker.subscriptions.size).toBe(1);
		expect(bus.listeners("request.rest.**")).toHaveLength(1);

		let handler = schema.events["request.rest.**"];

		bus.emit("request.rest", "Hello");
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith("Hello");

		let o = { id: 5, name: 10};
		bus.emit("request.rest.posts",  o);
		expect(handler).toHaveBeenCalledTimes(2);
		expect(handler).toHaveBeenCalledWith(o);

		bus.emit("request.rest.posts.find");
		expect(handler).toHaveBeenCalledTimes(3);
		expect(handler).toHaveBeenCalledWith("Hello");
	});

});