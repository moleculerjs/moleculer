"use strict";

const Service = require("../../src/service");
const ServiceBroker = require("../../src/service-broker");

// Unit: OK!
describe("Test Service constructor", () => {

	let broker = new ServiceBroker();
	
	let schema = {
		name: "users",
		version: 2,
		settings: {
			a: 1,
			cache: true
		}
	};

	it("should throw exceptions if missing main properties", () => {
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

	it("check local properties", () => {
		let service = new Service(broker, schema);
		expect(service.name).toBe("users");
		expect(service.version).toBe(2);
		expect(service.settings).toBe(schema.settings);
		expect(service.schema).toBe(schema);
		expect(service.broker).toBe(broker);
		
		expect(service.logger).toBeDefined();
		expect(service.actions).toEqual({});
	});
	
});

describe("Test action creation", () => {
	let broker = new ServiceBroker({ internalActions: false });

	let schema = {
		name: "posts",
		actions: {
			find: jest.fn(),
			get: {
				cache: false,
				params: {
					id: "required|numeric"
				},
				handler: jest.fn()
			}
		}
	};

	it("should register service & actions", () => {
		broker.registerService = jest.fn();
		broker.registerAction = jest.fn();

		let service = broker.createService(schema); 

		expect(service).toBeDefined();
		expect(broker.registerService).toHaveBeenCalledTimes(1);
		expect(broker.registerService).toHaveBeenCalledWith(service);

		expect(broker.registerAction).toHaveBeenCalledTimes(2);

		expect(service.actions.find).toBeDefined();
		expect(service.actions.get).toBeDefined();

		let ctx = {};
		broker.ContextFactory = jest.fn(() => ctx);

		service.actions.find({ a: 5 });

		expect(broker.ContextFactory).toHaveBeenCalledTimes(1);
		expect(broker.ContextFactory).toHaveBeenCalledWith({ broker, action: jasmine.any(Object), params: { a: 5 } });

		expect(schema.actions.find).toHaveBeenCalledTimes(1);
		expect(schema.actions.find).toHaveBeenCalledWith(ctx);

	});
});

describe("Test events creation", () => {
	let broker = new ServiceBroker({ internalActions: false });

	let schema = {
		name: "posts",
		events: {
			"user.*": jest.fn(),
			"posts.updated": {
				handler: jest.fn()
			}
		}
	};

	it("should register event handler to broker", () => {
		let handlers = {};
		broker.on = jest.fn((name, fn) => handlers[name] = fn);

		let service = broker.createService(schema); 

		expect(service).toBeDefined();
		expect(broker.on).toHaveBeenCalledTimes(2);
		expect(broker.on).toHaveBeenCalledWith("user.*", jasmine.any(Function));
		expect(broker.on).toHaveBeenCalledWith("posts.updated", jasmine.any(Function));

		let data = { id: 5 };
		handlers["user.*"].call({ event: "user.created"}, data);

		expect(schema.events["user.*"]).toHaveBeenCalledTimes(1);
		expect(schema.events["user.*"]).toHaveBeenCalledWith(data, "user.created");
		
	});

	it("should throw error because no handler of event", () => {
		expect(() => {
			broker.createService({
				name: "test",
				events: {
					"register.node": {}
				}
			});
		}).toThrowError("Missing event handler on 'register.node' event in 'test' service!");
	});
});

describe("Test methods creation", () => {
	let broker = new ServiceBroker({ internalActions: false });

	let schema = {
		name: "posts",
		methods: {
			something: jest.fn()
		}
	};

	it("should create method in Service instance", () => {
		let service = broker.createService(schema); 

		expect(service).toBeDefined();
		expect(typeof service.something).toBe("function");

		service.something();

		expect(service.schema.methods.something).toHaveBeenCalledTimes(1);
	});

	it("should throw error because method name is reserved", () => {
		expect(() => {
			broker.createService({
				name: "test",
				methods: {
					name: jest.fn()
				}
			});
		}).toThrowError("Invalid method name 'name' in 'test' service!");
	});
});

describe("Test created event handler", () => {
	let broker = new ServiceBroker({ internalActions: false });

	let schema = {
		name: "posts",
		created: jest.fn()
	};

	it("should create method in Service instance", () => {
		broker.createService(schema); 
		expect(schema.created).toHaveBeenCalledTimes(1);
	});
});

describe("Test _createActionHandler function", () => {
	let broker = new ServiceBroker();

	const handler = jest.fn();

	it("should create action object with default values", () => {
		let service = broker.createService({ name: "users" });

		let action = service._createActionHandler({ handler }, "find");
		expect(action.name).toBe("users.find");
		expect(action.cache).toBe(false);
		expect(action.handler).toBeInstanceOf(Function);
		expect(action.service).toBe(service);
		expect(action.version).toBeUndefined;
	});

	it("should create action with version number", () => {
		let service = broker.createService({ name: "users", version: 3 });

		let action = service._createActionHandler({ handler, myProp: "teszt" }, "find");
		expect(action.name).toBe("v3.users.find");
		expect(action.version).toBe(3);
		expect(action.myProp).toBe("teszt");
	});

	it("should create action with different name", () => {
		let service = broker.createService({ name: "users" });

		let action = service._createActionHandler({ handler, name: "list" }, "find");
		expect(action.name).toBe("users.list");
	});

	it("should create action without service name", () => {
		let service = broker.createService({ 
			name: "users", 
			settings: {
				appendServiceName: false
			} 
		});

		let action = service._createActionHandler({ handler }, "find");
		expect(action.name).toBe("find");
	});


	it("should throw Error if no handler", () => {
		let service = broker.createService({ name: "users" });

		expect(() => service._createActionHandler({}, "find")).toThrowError("Missing action handler on 'find' action in 'users' service!");
	});	

	describe("Test action cache property", () => {

		it("cache is FALSE, if schema cache is UNDEFINED and action cache is UNDEFINED", () => {
			let service = broker.createService({ name: "test" });
			let action = service._createActionHandler({ handler }, "find");

			expect(action.cache).toBe(false);
		});

		it("cache is TRUE, if schema cache is TRUE and action cache UNDEFINED", () => {
			let service = broker.createService({ name: "test", settings: { cache: true } });
			let action = service._createActionHandler({ handler }, "find");

			expect(action.cache).toBe(true);
		});

		it("cache is FALSE, if schema cache is TRUE and action cache is FALSE", () => {
			let service = broker.createService({ name: "test", settings: { cache: true } });
			let action = service._createActionHandler({ handler, cache: false }, "find");

			expect(action.cache).toBe(false);
		});

		it("cache is TRUE, if schema cache is UNDEFINED and action cache is TRUE", () => {
			let service = broker.createService({ name: "test" });
			let action = service._createActionHandler({ handler, cache: true }, "find");

			expect(action.cache).toBe(true);
		});

		it("cache is TRUE, if schema cache is UNDEFINED and action cache is Object", () => {
			let service = broker.createService({ name: "test" });
			let action = service._createActionHandler({ handler, cache: {} }, "find");

			expect(action.cache).toEqual({});
		});

		it("cache is TRUE, if schema cache is FALSE and action cache is TRUE", () => {
			let service = broker.createService({ name: "test", settings: { cache: false } });
			let action = service._createActionHandler({ handler, cache: true }, "find");

			expect(action.cache).toBe(true);
		});

		it("cache is TRUE, if schema cache is TRUE and action cache is TRUE", () => {
			let service = broker.createService({ name: "test", settings: { cache: true } });
			let action = service._createActionHandler({ handler, cache: true }, "find");

			expect(action.cache).toBe(true);
		});

		it("cache is TRUE, if schema cache is TRUE and action cache is Object", () => {
			let service = broker.createService({ name: "test", settings: { cache: true } });
			let action = service._createActionHandler({ handler, cache: { keys: [ "id" ]} }, "find");

			expect(action.cache).toEqual({ keys: [ "id" ]});
		});

	});
});
