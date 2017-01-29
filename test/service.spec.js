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

		get() {

		}
	},

	methods: {
		doSomething() {

		}
	},

	events: {},

	created() {

	}

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
		expect(service.validator).toBeDefined();
	});
	
});


describe("Local service registration", () => {

	let broker = new ServiceBroker();
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
		expect(broker.services.size).toBe(1);
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

		broker.emitLocal("request.rest", "Hello", { a: 1 });
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith("Hello", { a: 1 });

		let o = {
			id: 5,
			name: 10
		};
		broker.emit("request.rest.posts", o);
		expect(handler).toHaveBeenCalledTimes(2);
		expect(handler).toHaveBeenCalledWith(o);

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

describe("Test service started & stopped handlers", () => {

	let broker = new ServiceBroker();

	let service = new Service(broker, {
		name: "svc",
		started: jest.fn(),
		stopped: jest.fn()
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

	let broker = new ServiceBroker({
		cacher: new MemoryCacher()
	});

	broker.cacher.wrapHandler = jest.fn(action => action);

	it("don't wrap, if schema cache is UNDEFINED and action cache is UNDEFINED", () => {
		let schema = {
			name: "cache-test",
			actions: {
				find: {
					handler() {}
				}
			}
		};
		
		broker.cacher.wrapHandler.mockClear();
		new Service(broker, schema);
		expect(broker.cacher.wrapHandler).toHaveBeenCalledTimes(0);
	});

	it("wrap, if schema cache is true and action cache UNDEFINED", () => {
		let schema = {
			name: "cache-test",
			settings: { cache: true },
			actions: {
				find: {
					handler() {}
				}
			}
		};
		
		broker.cacher.wrapHandler.mockClear();
		new Service(broker, schema);
		expect(broker.cacher.wrapHandler).toHaveBeenCalledTimes(1);
	});

	it("don't wrap, if schema cache is TRUE and action cache is FALSE", () => {
		let schema = {
			name: "cache-test",
			settings: { cache: true },
			actions: {
				find: {
					cache: false,
					handler() {}
				}
			}
		};
		
		broker.cacher.wrapHandler.mockClear();
		new Service(broker, schema);
		expect(broker.cacher.wrapHandler).toHaveBeenCalledTimes(0);
	});

	it("wrap, if schema cache is UNDEFINED and action cache is TRUE", () => {
		let schema = {
			name: "cache-test",
			actions: {
				find: {
					cache: true,
					handler() {}
				}
			}
		};
		
		broker.cacher.wrapHandler.mockClear();
		new Service(broker, schema);
		expect(broker.cacher.wrapHandler).toHaveBeenCalledTimes(1);
	});

	it("wrap, if schema cache is UNDEFINED and action cache is Object", () => {
		let schema = {
			name: "cache-test",
			actions: {
				find: {
					cache: {},
					handler() {}
				}
			}
		};
		
		broker.cacher.wrapHandler.mockClear();
		new Service(broker, schema);
		expect(broker.cacher.wrapHandler).toHaveBeenCalledTimes(1);
	});

	it("wrap, if schema cache is FALSE and action cache is TRUE", () => {
		let schema = {
			name: "cache-test",
			settings: { cache: false },
			actions: {
				find: {
					cache: true,
					handler() {}
				}
			}
		};
		
		broker.cacher.wrapHandler.mockClear();
		new Service(broker, schema);
		expect(broker.cacher.wrapHandler).toHaveBeenCalledTimes(1);
	});

	it("wrap, if schema cache is TRUE and action cache is TRUE", () => {
		let schema = {
			name: "cache-test",
			settings: { cache: true },
			actions: {
				find: {
					cache: true,
					handler() {}
				}
			}
		};
		
		broker.cacher.wrapHandler.mockClear();
		new Service(broker, schema);
		expect(broker.cacher.wrapHandler).toHaveBeenCalledTimes(1);
	});

	it("wrap, if schema cache is TRUE and action cache is Object", () => {
		let schema = {
			name: "cache-test",
			settings: { cache: true },
			actions: {
				find: {
					cache: {
						keys: ["id"]
					},
					handler() {}
				}
			}
		};
		
		broker.cacher.wrapHandler.mockClear();
		new Service(broker, schema);
		expect(broker.cacher.wrapHandler).toHaveBeenCalledTimes(1);
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

	it("shouldn't wrap validation, if action can't contain params settings", () => {
		let broker = new ServiceBroker();
		let service = new Service(broker, schema);
		service.validator.validate = jest.fn();
		return broker.call("test.withoutValidation")
		.then(res => {
			expect(service.validator.validate).toHaveBeenCalledTimes(0);
		});
	});

	it("should wrap validation, if action contains params settings", () => {
		let broker = new ServiceBroker();
		let service = new Service(broker, schema);
		service.validator.validate = jest.fn();
		let p = { a: 5, b: 10 };
		return broker.call("test.withValidation", p)
		.then(res => {
			expect(service.validator.validate).toHaveBeenCalledTimes(1);
			expect(service.validator.validate).toHaveBeenCalledWith(schema.actions.withValidation.params, p);
			expect(schema.actions.withValidation.handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call handler, if params are correct", () => {
		schema.actions.withValidation.handler.mockClear();
		let broker = new ServiceBroker();
		let service = new Service(broker, schema);
		let p = { a: 5, b: 10 };
		return broker.call("test.withValidation", p)
		.then(res => {
			expect(res).toBe(123);
			expect(schema.actions.withValidation.handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should throw ValidationError, if params is not correct", () => {
		schema.actions.withValidation.handler.mockClear();
		let broker = new ServiceBroker();
		let service = new Service(broker, schema);
		//service.validator.validate = jest.fn();
		let p = { a: 5, b: "asd" };
		return broker.call("test.withValidation", p)
		.catch(err => {
			expect(err).toBeInstanceOf(ValidationError);
			expect(schema.actions.withValidation.handler).toHaveBeenCalledTimes(0);
		});
	});

	it("should wrap validation, if call action directly", () => {
		let broker = new ServiceBroker();
		let service = new Service(broker, schema);
		service.validator.validate = jest.fn();
		let p = { a: 5, b: 10 };
		return service.actions.withValidation(p)
		.then(res => {
			expect(service.validator.validate).toHaveBeenCalledTimes(1);
			expect(service.validator.validate).toHaveBeenCalledWith(schema.actions.withValidation.params, p);
		});
	});
});
