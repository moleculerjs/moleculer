"use strict";

let _ = require("lodash");
let bus = require("../src/service-bus");
let Service = require("../src/service");
let ServiceBroker = require("../src/service-broker");

describe("Test Service", () => {

	it("test service creation exceptions", () => {

		expect(() => {
			new Service();
		}).toThrowError("Must to set a ServiceBroker instance!");

		expect(() => {
			new Service({});
		}).toThrowError("Must pass a service schema in constructor!");

		expect(() => {
			new Service({}, {});
		}).toThrowError("Service name can't be empty!");
		
	});

});

describe("Test Service", () => {
	
	let broker = new ServiceBroker();

	let PostSchema = {
		name: "posts",
		settings: {
		},

		actions: {
			find: {
				cache: true,
				rest: true,
				ws: true,
				graphql: true,
				handler() {}
			},

			get() {

			}
		},

		events: {}

	};

	it("test service create exceptions", () => {

		expect(() => {
			new Service();
		}).toThrowError("Must to set a ServiceBroker instance!");

		expect(() => {
			new Service({});
		}).toThrowError("Must pass a service schema in constructor!");

		expect(() => {
			new Service({}, {});
		}).toThrowError("Service name can't be empty!");
		
	});

	it("test service registration", () => {
		// Spy events
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

		let findHandlerMock = schema.actions.find.handler = jest.fn();
		let getHandlerMock = schema.actions.get = jest.fn();

		schema.events["request.rest.**"] = jest.fn();

		let service = new Service(broker, schema);

		expect(service).toBeDefined();

		expect(handlerRegisterNode).toHaveBeenCalledTimes(0);

		expect(broker.registerService).toHaveBeenCalledTimes(1);
		expect(broker.registerService).toHaveBeenCalledWith(service);
		expect(broker.services.size).toBe(1);
		expect(handlerRegisterService).toHaveBeenCalledTimes(1);

		expect(broker.registerAction).toHaveBeenCalledTimes(2);
		expect(broker.registerAction).toHaveBeenCalledWith(service, schema.actions.find);
		expect(broker.actions.size).toBe(2);
		expect(handlerRegisterAction).toHaveBeenCalledTimes(2);
		expect(broker.hasAction("find")).toBeFalsy();		
		expect(broker.hasAction("get")).toBeFalsy();		
		expect(broker.hasAction("posts.find")).toBeTruthy();		
		expect(broker.hasAction("posts.get")).toBeTruthy();

		broker.call("posts.find");
		expect(findHandlerMock).toHaveBeenCalledTimes(1);		

		broker.call("posts.get");
		expect(getHandlerMock).toHaveBeenCalledTimes(1);

		let action = broker.actions.get("posts.get").get();
		expect(action.handler).toBeDefined();				
		expect(action.name).toBe("posts.get");				
		expect(action.service).toBe(service);				

		expect(broker.subscribeEvent).toHaveBeenCalledTimes(1);
		//expect(broker.subscribeEvent).toHaveBeenCalledWith(broker.internalNode, service, schema.events["request.rest.**"]);
		expect(broker.subscriptions.size).toBe(1);
		expect(bus.listeners("request.rest.**")).toHaveLength(1);

		let event = broker.subscriptions.get("request.rest.**").get();
		expect(event.handler).toBeDefined();				
		expect(event.name).toBe("request.rest.**");				
		expect(event.service).toBe(service);				

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

describe("Test Service", () => {
	
	let broker = new ServiceBroker();

	let MailerSchema = {
		name: "mailer",
	};

	it("test empty service creation", () => {

		let service = new Service(broker, MailerSchema);

		expect(service).toBeDefined();
		
	});

});

describe("Test Service without action & event handlers", () => {

	let broker = new ServiceBroker();

	let schemaWithoutActionHandler = {
		name: "test",
		actions: {
			find: {

			}
		}
	};

	let schemaWithoutEventHandler = {
		name: "test",
		events: {
			"request": {

			}
		}
	};

	it("should throw error because no handler to action", () => {

		expect(() => {
			new Service(broker, schemaWithoutActionHandler);
		}).toThrowError("Missing action handler on 'find' action in 'test' service!");
	});

	it("should throw error because no handler to event", () => {

		expect(() => {
			new Service(broker, schemaWithoutEventHandler);
		}).toThrowError("Missing event handler on 'request' event in 'test' service!");
	});

});