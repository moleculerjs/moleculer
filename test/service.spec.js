"use strict";

let _ = require("lodash");
let utils = require("../src/utils");
let Service = require("../src/service");
let ServiceBroker = require("../src/service-broker");
let MemoryCacher = require("../src/cachers").Memory;
const { ValidationError } = require("../src/errors");

let PostSchema = {
	name: "posts",
	settings: {},

	actions: {
		find: {
			cache: false,
			rest: true,
			ws: true,
			graphql: true,
			handler() {}
		},

		get() {}
	},

	methods: {
		doSomething() {}
	},

	events: {},

	created() {}
};

describe("Test Service creation", () => {

	it("should throw exceptions", () => {
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

	let broker = new ServiceBroker();
	
	let schema = {
		name: "users",
		version: 2,
		settings: {
			a: 1,
			cache: true
		}
	};

	it("check local properties", () => {
		let service = new Service(broker, schema);
		expect(service.name).toBe("users");
		expect(service.version).toBe(2);
		expect(service.settings).toBe(schema.settings);
		expect(service.schema).toBe(schema);
		expect(service.broker).toBe(broker);
	});
	
});


describe("Local service registration", () => {

	let broker = new ServiceBroker({ internalActions: false });
	let service;

	let schema = _.cloneDeep(PostSchema);

	let findHandlerMock = schema.actions.find.handler = jest.fn(ctx => ctx);
	let getHandlerMock = schema.actions.get = jest.fn(ctx => ctx);
	let methodHandlerMock = schema.methods.doSomething = jest.fn(params => params);
	let createdHandlerMock = schema.created = jest.fn();

	schema.events["request.rest.**"] = jest.fn();

	it("test posts service registration", () => {
		// Spy events
		let handlerRegisterNode = jest.fn();
		broker.on("register.node", handlerRegisterNode);

		let handlerRegisterService = jest.fn();
		broker.on("register.service.posts", handlerRegisterService);

		let handlerRegisterAction = jest.fn();
		broker.on("register.action.posts.*", handlerRegisterAction);

		broker.registerService = jest.fn(broker.registerService);
		broker.registerAction = jest.fn(broker.registerAction);
		broker.on = jest.fn(broker.on);

		service = new Service(broker, schema);

		expect(service).toBeDefined();
		expect(createdHandlerMock).toHaveBeenCalledTimes(1);

		expect(handlerRegisterNode).toHaveBeenCalledTimes(0);

		expect(broker.registerService).toHaveBeenCalledTimes(1);
		expect(broker.registerService).toHaveBeenCalledWith(service);
		expect(broker.services.length).toBe(1);
		expect(handlerRegisterService).toHaveBeenCalledTimes(1);

		expect(broker.registerAction).toHaveBeenCalledTimes(2);
		//expect(broker.registerAction).toHaveBeenCalledWith(service, schema.actions.find);
		expect(broker.actions.size).toBe(2);
		expect(handlerRegisterAction).toHaveBeenCalledTimes(2);
	});

	it("check actions is exist", () => {	
		expect(broker.hasAction("find")).toBeFalsy();
		expect(broker.hasAction("get")).toBeFalsy();
		expect(broker.hasAction("posts.find")).toBeTruthy();
		expect(broker.hasAction("posts.get")).toBeTruthy();
	});

	it("check broker.call call the action handler", () => {
		return broker.call("posts.find").then(() => {
			expect(findHandlerMock).toHaveBeenCalledTimes(1);
		});
	});

	it("check actions can be call via broker", () => {
		return broker.call("posts.get").then(() => {
			expect(getHandlerMock).toHaveBeenCalledTimes(1);
		});
	});

	it("check actions can be call via broker", () => {
		let actionItem = broker.actions.get("posts.get").get();
		let action = actionItem.data;
		expect(action.handler).toBeDefined();
		expect(action.name).toBe("posts.get");
		expect(action.service).toBe(service);

		expect(broker.on).toHaveBeenCalledTimes(1);

		let handler = schema.events["request.rest.**"];

		broker.emitLocal("request.rest", { a: 1, b: "Hello" });
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith({ a: 1, b: "Hello" }, "request.rest");

		let o = {
			id: 5,
			name: 10
		};
		broker.emit("request.rest.posts", o);
		expect(handler).toHaveBeenCalledTimes(2);
		expect(handler).toHaveBeenCalledWith(o, "request.rest.posts");

		broker.emit("request.rest.posts.find");
		expect(handler).toHaveBeenCalledTimes(3);
	});

	it("check actions can be call directly", () => {
		findHandlerMock.mockClear();
		let p = { a: 3 };
		let prom = service.actions.find(p);
		prom.then(ctx => {
			expect(findHandlerMock).toHaveBeenCalledTimes(1);
			expect(ctx.broker).toBe(broker);
			expect(ctx.action).toBeDefined();
			expect(ctx.params).toEqual(p);
		});
	});

	it("check methods can be call", () => {
		service.doSomething();
		expect(methodHandlerMock).toHaveBeenCalledTimes(1);
	});

});

describe("Test action registration", () => {
	
	it("should register action on different name", () => {
		let broker = new ServiceBroker();

		broker.createService({
			name: "posts",
			actions: {
				find: {
					name: "other",
					handler() {}
				}
			}
		});

		expect(broker.hasAction("posts.find")).toBeFalsy();
		expect(broker.hasAction("posts.other")).toBeTruthy();
	});
	
	it("should register action without service name", () => {
		let broker = new ServiceBroker();

		broker.createService({
			name: "posts",
			settings: {
				appendServiceName: false
			},
			actions: {
				"other.get"() {}
			}
		});

		expect(broker.hasAction("posts.other.get")).toBeFalsy();
		expect(broker.hasAction("other.get")).toBeTruthy();
	});


});

describe("Test service started & stopped handlers", () => {

	let broker = new ServiceBroker();

	let service = new Service(broker, {
		name: "svc",
		started: jest.fn(),
		stopped: jest.fn()
	});

	it("shouldn't call the service.started & stopped", () => {
		expect(service.schema.started).toHaveBeenCalledTimes(0);
		expect(service.schema.stopped).toHaveBeenCalledTimes(0);
	});

	it("should call the service.started", () => {
		broker.start();
		expect(service.schema.started).toHaveBeenCalledTimes(1);
	});

	it("should call the service.stopped", () => {
		broker.stop();
		expect(service.schema.stopped).toHaveBeenCalledTimes(1);
	});

});

describe("Test empty service without actions & methods", () => {

	let broker = new ServiceBroker();

	let MailerSchema = {
		name: "mailer",
	};

	it("should create the service", () => {
		let service = new Service(broker, MailerSchema);
		expect(service).toBeDefined();
	});

});

describe("Test Service without handlers", () => {

	let broker = new ServiceBroker();

	let schemaWithoutActionHandler = {
		name: "test",
		actions: {
			find: {}
		}
	};

	let schemaWithoutEventHandler = {
		name: "test",
		events: {
			"request": {}
		}
	};

	it("should throw error because no handler of action", () => {
		expect(() => {
			new Service(broker, schemaWithoutActionHandler);
		}).toThrowError("Missing action handler on 'find' action in 'test' service!");
	});

	it("should throw error because no handler of event", () => {
		expect(() => {
			new Service(broker, schemaWithoutEventHandler);
		}).toThrowError("Missing event handler on 'request' event in 'test' service!");
	});

});


describe("Test cached actions", () => {

	it("don't wrap, if schema cache is UNDEFINED and action cache is UNDEFINED", () => {
		let broker = new ServiceBroker();
		broker.createService({
			name: "test",
			actions: {
				find: {
					handler() {}
				}
			}
		});
		
		expect(broker.actions.get("test.find").get().data.cache).toBe(false);
	});

	it("wrap, if schema cache is true and action cache UNDEFINED", () => {
		let broker = new ServiceBroker();
		broker.createService({
			name: "test",
			settings: { cache: true },
			actions: {
				find: {
					handler() {}
				}
			}
		});
		
		expect(broker.actions.get("test.find").get().data.cache).toBe(true);
	});

	it("don't wrap, if schema cache is TRUE and action cache is FALSE", () => {
		let broker = new ServiceBroker();
		broker.createService({
			name: "test",
			settings: { cache: true },
			actions: {
				find: {
					cache: false,
					handler() {}
				}
			}
		});
		
		expect(broker.actions.get("test.find").get().data.cache).toBe(false);
	});

	it("wrap, if schema cache is UNDEFINED and action cache is TRUE", () => {
		let broker = new ServiceBroker();
		broker.createService({
			name: "test",
			actions: {
				find: {
					cache: true,
					handler() {}
				}
			}
		});
		
		expect(broker.actions.get("test.find").get().data.cache).toBe(true);
	});

	it("wrap, if schema cache is UNDEFINED and action cache is Object", () => {
		let broker = new ServiceBroker();
		broker.createService({
			name: "test",
			actions: {
				find: {
					cache: {},
					handler() {}
				}
			}
		});
		
		expect(broker.actions.get("test.find").get().data.cache).toEqual({});
	});

	it("wrap, if schema cache is FALSE and action cache is TRUE", () => {
		let broker = new ServiceBroker();
		broker.createService({
			name: "test",
			settings: { cache: false },
			actions: {
				find: {
					cache: true,
					handler() {}
				}
			}
		});
		
		expect(broker.actions.get("test.find").get().data.cache).toBe(true);
	});

	it("wrap, if schema cache is TRUE and action cache is TRUE", () => {
		let broker = new ServiceBroker();
		broker.createService({
			name: "test",
			settings: { cache: true },
			actions: {
				find: {
					cache: true,
					handler() {}
				}
			}
		});
		
		expect(broker.actions.get("test.find").get().data.cache).toBe(true);
	});

	it("wrap, if schema cache is TRUE and action cache is Object", () => {
		let broker = new ServiceBroker();
		broker.createService({
			name: "test",
			settings: { cache: true },
			actions: {
				find: {
					cache: {
						keys: ["id"]
					},
					handler() {}
				}
			}
		});
		
		expect(broker.actions.get("test.find").get().data.cache).toEqual({
			keys: ["id"]
		});
	});
});


describe("Test param validator", () => {

	let schema = {
		name: "test",
		actions: {
			withValidation: {
				params: {
					a: "required|numeric",
					b: "required|numeric"
				},
				handler: jest.fn(ctx => 123)
			},
			withoutValidation: {
				handler() {}
			}
		}
	};

	const broker = new ServiceBroker();
	const service = broker.createService(schema);
	broker.validator.validate = jest.fn();

	it("shouldn't wrap validation, if action can't contain params settings", () => {
		return broker.call("test.withoutValidation")
		.then(res => {
			expect(broker.validator.validate).toHaveBeenCalledTimes(0);
		});
	});

	it("should wrap validation, if action contains params settings", () => {
		broker.validator.validate.mockClear();
		let p = { a: 5, b: 10 };
		return broker.call("test.withValidation", p)
		.then(res => {
			expect(broker.validator.validate).toHaveBeenCalledTimes(1);
			expect(broker.validator.validate).toHaveBeenCalledWith(schema.actions.withValidation.params, p);
			expect(schema.actions.withValidation.handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call handler, if params are correct", () => {
		schema.actions.withValidation.handler.mockClear();
		let p = { a: 5, b: 10 };
		return broker.call("test.withValidation", p)
		.then(res => {
			expect(res).toBe(123);
			expect(schema.actions.withValidation.handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should throw ValidationError, if params is not correct", () => {
		schema.actions.withValidation.handler.mockClear();
		let p = { a: 5, b: "asd" };
		return broker.call("test.withValidation", p)
		.catch(err => {
			expect(err).toBeInstanceOf(ValidationError);
			expect(schema.actions.withValidation.handler).toHaveBeenCalledTimes(0);
		});
	});

	it("should wrap validation, if call action directly", () => {
		broker.validator.validate.mockClear();
		let p = { a: 5, b: 10 };
		return service.actions.withValidation(p)
		.then(res => {
			expect(broker.validator.validate).toHaveBeenCalledTimes(1);
			expect(broker.validator.validate).toHaveBeenCalledWith(schema.actions.withValidation.params, p);
		});
	});
});
