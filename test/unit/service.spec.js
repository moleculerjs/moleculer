"use strict";

const Service = require("../../src/service");
const Context = require("../../src/context");
const ServiceBroker = require("../../src/service-broker");

describe("Test Service class", () => {
	describe("Test constructor", () => {
		const broker = new ServiceBroker({ logger: false });

		jest.spyOn(Service.prototype, "parseServiceSchema");

		it("should throw error if missing serviceBroker instance", () => {
			expect(() => {
				new Service();
			}).toThrowError("Must set a ServiceBroker instance!");
		});

		it("should set broker to local variable", () => {
			Service.prototype.parseServiceSchema.mockClear();
			const svc = new Service(broker);
			expect(svc.broker).toBe(broker);
			expect(svc.Promise).toBe(broker.Promise);
			expect(Service.prototype.parseServiceSchema).toBeCalledTimes(0);
		});

		it("should call the parseServiceSchema", () => {
			Service.prototype.parseServiceSchema.mockClear();
			const schema = {
				name: "posts"
			};

			const svc = new Service(broker, schema);
			expect(svc.broker).toBe(broker);
			expect(svc.Promise).toBe(broker.Promise);
			expect(Service.prototype.parseServiceSchema).toBeCalledTimes(1);
			expect(Service.prototype.parseServiceSchema).toBeCalledWith(schema);
		});
	});

	describe("Test parseServiceSchema", () => {
		const broker = new ServiceBroker({ logger: false });

		jest.spyOn(broker, "callMiddlewareHookSync");
		jest.spyOn(broker, "getLogger");
		jest.spyOn(Service.prototype, "applyMixins");

		const svc = new Service(broker);

		jest.spyOn(svc, "_init");

		it("should throw error if missing schema", () => {
			expect(() => {
				svc.parseServiceSchema();
			}).toThrowError("The service schema can't be null. Maybe is it not a service schema?");
		});

		it("should throw error if name is empty", () => {
			Service.prototype.applyMixins.mockClear();
			expect(() => {
				/* eslint-disable-next-line no-console */
				console.error = jest.fn();
				svc.parseServiceSchema({});
			}).toThrowError(
				"Service name can't be empty! Maybe it is not a valid Service schema. Maybe is it not a service schema?"
			);
			expect(Service.prototype.applyMixins).toBeCalledTimes(0);
		});

		it("should set common local variables", () => {
			Service.prototype.applyMixins.mockClear();

			const schema = { name: "posts" };
			svc.parseServiceSchema(schema);

			expect(svc.originalSchema).toEqual({ name: "posts" });
			expect(svc.originalSchema).not.toBe(schema);

			expect(Service.prototype.applyMixins).toBeCalledTimes(0);

			expect(svc.name).toBe("posts");
			expect(svc.version).toBeUndefined();
			expect(svc.settings).toEqual({});
			expect(svc.metadata).toEqual({});
			expect(svc.schema).toBe(schema);
			expect(svc.fullName).toBe("posts");
			expect(svc.logger).toBeDefined();

			expect(broker.getLogger).toBeCalledTimes(1);
			expect(broker.getLogger).toBeCalledWith("posts", { svc: "posts", ver: undefined });

			expect(svc.actions).toEqual({});
			expect(svc.events).toEqual({});

			expect(svc._init).toBeCalledTimes(1);
		});

		it("should set common local variables with version", () => {
			Service.prototype.applyMixins.mockClear();
			broker.getLogger.mockClear();
			svc._init.mockClear();

			const schema = { name: "posts", version: 3, mixins: [] };
			svc.parseServiceSchema(schema);

			expect(svc.originalSchema).toEqual({ name: "posts", version: 3, mixins: [] });
			expect(svc.originalSchema).not.toBe(schema);

			expect(Service.prototype.applyMixins).toBeCalledTimes(1);
			expect(Service.prototype.applyMixins).toBeCalledWith(schema);

			expect(svc.name).toBe("posts");
			expect(svc.version).toBe(3);
			expect(svc.settings).toEqual({});
			expect(svc.metadata).toEqual({});
			expect(svc.schema).toBe(schema);
			expect(svc.fullName).toBe("v3.posts");
			expect(svc.logger).toBeDefined();

			expect(broker.getLogger).toBeCalledTimes(1);
			expect(broker.getLogger).toBeCalledWith("v3.posts", { svc: "posts", ver: 3 });

			expect(svc.actions).toEqual({});
			expect(svc.events).toEqual({});

			expect(svc._init).toBeCalledTimes(1);
		});

		it("should set common local variables with version & noVersionPrefix", () => {
			Service.prototype.applyMixins.mockClear();
			broker.getLogger.mockClear();
			svc._init.mockClear();

			const schema = { name: "posts", version: 3, settings: { $noVersionPrefix: true } };
			svc.parseServiceSchema(schema);

			expect(svc.name).toBe("posts");
			expect(svc.version).toBe(3);
			expect(svc.fullName).toBe("posts");
		});

		it("should throw error if method name is now allowed", () => {
			expect(() => {
				svc.parseServiceSchema({
					name: "posts",
					methods: {
						actions() {}
					}
				});
			}).toThrowError("Invalid method name 'actions' in 'posts' service!");

			expect(() => {
				svc.parseServiceSchema({
					name: "posts",
					methods: {
						applyMixins() {}
					}
				});
			}).toThrowError("Invalid method name 'applyMixins' in 'posts' service!");

			expect(() => {
				svc.parseServiceSchema({
					name: "posts",
					methods: {
						mergeSchemaSettings() {}
					}
				});
			}).toThrowError("Invalid method name 'mergeSchemaSettings' in 'posts' service!");

			expect(() => {
				svc.parseServiceSchema({
					name: "posts",
					methods: {
						mergeSchemaUnknown() {}
					}
				});
			}).toThrowError("Invalid method name 'mergeSchemaUnknown' in 'posts' service!");
		});

		it("should set methods and bind the service instance", () => {
			const schema = {
				name: "posts",
				methods: {
					alpha: () => "Alpha",
					beta() {
						expect(this).toBe(svc);
						return "Beta";
					},
					gamma: {
						handler() {
							expect(this).toBe(svc);
							return "Gamma";
						}
					}
				}
			};
			svc.parseServiceSchema(schema);

			expect(svc.alpha).toBeInstanceOf(Function);
			expect(svc.beta).toBeInstanceOf(Function);
			expect(svc.gamma).toBeInstanceOf(Function);

			expect(svc.alpha()).toBe("Alpha");
			expect(svc.beta()).toBe("Beta");
			expect(svc.gamma()).toBe("Gamma");

			expect(svc._serviceSpecification).toEqual({
				name: "posts",
				version: undefined,
				fullName: "posts",
				settings: {},
				metadata: {},
				actions: {},
				events: {}
			});

			expect.assertions(9);
		});

		it("should register actions", () => {
			jest.spyOn(svc, "_createAction").mockImplementation((action, name) => ({
				name,
				handler: action.handler || action
			}));
			jest.spyOn(broker.middlewares, "wrapHandler").mockImplementation(
				(type, handler) => handler
			);
			jest.spyOn(broker.registry, "createPrivateActionEndpoint").mockImplementation(() => ({
				id: "nodeID"
			}));
			const schema = {
				name: "posts",
				actions: {
					alpha: jest.fn(() => "Alpha"),
					beta: false,
					gamma: {
						handler: jest.fn()
					}
				}
			};
			svc.parseServiceSchema(schema);

			expect(svc._createAction).toBeCalledTimes(2);
			expect(svc._createAction).toHaveBeenNthCalledWith(1, schema.actions.alpha, "alpha");
			expect(svc._createAction).toHaveBeenNthCalledWith(2, schema.actions.gamma, "gamma");

			expect(broker.middlewares.wrapHandler).toBeCalledTimes(2);
			expect(broker.middlewares.wrapHandler).toHaveBeenNthCalledWith(
				1,
				"localAction",
				expect.any(Function),
				{ name: "alpha", handler: expect.any(Function) }
			);
			expect(broker.middlewares.wrapHandler).toHaveBeenNthCalledWith(
				2,
				"localAction",
				expect.any(Function),
				{ name: "gamma", handler: expect.any(Function) }
			);

			expect(broker.registry.createPrivateActionEndpoint).toBeCalledTimes(2);
			expect(broker.registry.createPrivateActionEndpoint).toHaveBeenNthCalledWith(1, {
				name: "alpha",
				handler: expect.any(Function)
			});
			expect(broker.registry.createPrivateActionEndpoint).toHaveBeenNthCalledWith(2, {
				name: "gamma",
				handler: expect.any(Function)
			});

			expect(svc._serviceSpecification).toEqual({
				name: "posts",
				version: undefined,
				fullName: "posts",
				settings: {},
				metadata: {},
				actions: {
					alpha: {
						name: "alpha",
						handler: expect.any(Function)
					},
					gamma: {
						name: "gamma",
						handler: expect.any(Function)
					}
				},
				events: {}
			});

			expect(svc.actions.alpha).toBeInstanceOf(Function);
			expect(svc.actions.beta).toBeUndefined();
			expect(svc.actions.gamma).toBeInstanceOf(Function);
		});

		it("should call the handler via this.actions.xy", () => {
			const schema = {
				name: "posts",
				actions: {
					alpha: jest.fn(() => "Alpha")
				}
			};
			svc.parseServiceSchema(schema);

			const res = svc.actions.alpha({ a: 5 });

			expect(res).toBe("Alpha");
			expect(schema.actions.alpha).toBeCalledTimes(1);
			expect(schema.actions.alpha).toBeCalledWith(expect.any(Context));
			expect(schema.actions.alpha.mock.calls[0][0].params).toEqual({ a: 5 });
			expect(schema.actions.alpha.mock.calls[0][0].endpoint).toEqual({ id: "nodeID" });

			schema.actions.alpha.mockClear();
			const fakeCtx = { id: 123 };
			const res2 = svc.actions.alpha({ a: 5 }, { ctx: fakeCtx });

			expect(res2).toBe("Alpha");
			expect(schema.actions.alpha).toBeCalledTimes(1);
			expect(schema.actions.alpha).toBeCalledWith(fakeCtx);
		});

		it("should register events", () => {
			jest.spyOn(svc, "_createEvent").mockImplementation((event, name) => ({
				name,
				handler: event.handler || event
			}));

			const schema = {
				name: "posts",
				events: {
					"user.created": jest.fn(() => "User created"),
					"posts.updated": {
						handler: jest.fn(() => "Post #1 updated")
					}
				}
			};
			svc.parseServiceSchema(schema);

			expect(svc._createEvent).toBeCalledTimes(2);
			expect(svc._createEvent).toHaveBeenNthCalledWith(
				1,
				schema.events["user.created"],
				"user.created"
			);
			expect(svc._createEvent).toHaveBeenNthCalledWith(
				2,
				schema.events["posts.updated"],
				"posts.updated"
			);

			expect(svc._serviceSpecification).toEqual({
				name: "posts",
				version: undefined,
				fullName: "posts",
				settings: {},
				metadata: {},
				actions: {},
				events: {
					"user.created": {
						name: "user.created",
						handler: expect.any(Function)
					},
					"posts.updated": {
						name: "posts.updated",
						handler: expect.any(Function)
					}
				}
			});

			expect(svc.events["user.created"]).toBeInstanceOf(Function);
			expect(svc.events["posts.updated"]).toBeInstanceOf(Function);
		});

		it("should call the handler via this.events.xy", () => {
			const schema = {
				name: "posts",
				events: {
					"user.created": jest.fn(() => "User created")
				}
			};
			svc.parseServiceSchema(schema);

			const res = svc.events["user.created"]({ id: 5 });

			expect(res).toBe("User created");
			expect(schema.events["user.created"]).toBeCalledTimes(1);
			expect(schema.events["user.created"]).toBeCalledWith(expect.any(Context));
			expect(schema.events["user.created"].mock.calls[0][0].params).toEqual({ id: 5 });
			expect(schema.events["user.created"].mock.calls[0][0].eventName).toBe("user.created");
			expect(schema.events["user.created"].mock.calls[0][0].eventType).toBe("emit");
			expect(schema.events["user.created"].mock.calls[0][0].eventGroups).toEqual(["posts"]);

			schema.events["user.created"].mockClear();
			const fakeCtx = { id: 123 };
			const res2 = svc.events["user.created"]({ a: 5 }, { ctx: fakeCtx });

			expect(res2).toBe("User created");
			expect(schema.events["user.created"]).toBeCalledTimes(1);
			expect(schema.events["user.created"]).toBeCalledWith(fakeCtx);
		});

		it("should call service single 'merged' hook", () => {
			const merged = jest.fn();
			const schema = {
				name: "posts",
				merged
			};
			svc.parseServiceSchema(schema);

			expect(merged).toBeCalledTimes(1);
			expect(merged).toBeCalledWith(schema);
		});

		it("should call service multi 'merged' hook", () => {
			let FLOW = [];
			const merged1 = jest.fn(() => FLOW.push("C1"));
			const merged2 = jest.fn(() => FLOW.push("C2"));
			const schema = {
				name: "posts",
				merged: [merged1, merged2]
			};
			svc.parseServiceSchema(schema);

			expect(merged1).toBeCalledTimes(1);
			expect(merged1).toBeCalledWith(schema);

			expect(merged2).toBeCalledTimes(1);
			expect(merged2).toBeCalledWith(schema);

			expect(FLOW.join("-")).toBe("C1-C2");
		});
	});

	describe("Test _getPublicSettings", () => {
		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);

		it("should skip the properties by $secureSettings", () => {
			expect(
				svc._getPublicSettings({
					a: 5,
					auth: {
						user: "user",
						pass: "pass"
					},
					tokens: {
						a: 111,
						b: 222
					},
					x: "x",

					$secureSettings: ["auth.pass", "tokens"]
				})
			).toEqual({
				a: 5,
				auth: {
					user: "user"
				},
				x: "x"
			});
		});

		it("should keep all properties without $secureSettings", () => {
			expect(
				svc._getPublicSettings({
					a: 5,
					auth: {
						user: "user",
						pass: "pass"
					},
					tokens: {
						a: 111,
						b: 222
					},
					x: "x"
				})
			).toEqual({
				a: 5,
				auth: {
					user: "user",
					pass: "pass"
				},
				tokens: {
					a: 111,
					b: 222
				},
				x: "x"
			});
		});
	});

	describe("Test _init", () => {
		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);

		jest.spyOn(broker, "addLocalService");
		jest.spyOn(broker, "callMiddlewareHookSync");

		it("should call broker methods", () => {
			svc.parseServiceSchema({
				name: "posts"
			});

			broker.addLocalService.mockClear();
			broker.callMiddlewareHookSync.mockClear();

			svc._init();

			expect(broker.addLocalService).toBeCalledTimes(1);
			expect(broker.addLocalService).toBeCalledWith(svc);

			expect(broker.callMiddlewareHookSync).toBeCalledTimes(1);
			expect(broker.callMiddlewareHookSync).toBeCalledWith("serviceCreated", [svc]);
		});

		it("should call service single 'created' hook", () => {
			const created = jest.fn();
			svc.parseServiceSchema({
				name: "posts",
				created
			});

			created.mockClear();

			svc._init();

			expect(created).toBeCalledTimes(1);
			expect(created).toBeCalledWith();
		});

		it("should call service multi 'created' hook", () => {
			let FLOW = [];
			const created1 = jest.fn(() => FLOW.push("C1"));
			const created2 = jest.fn(() => FLOW.push("C2"));
			svc.parseServiceSchema({
				name: "posts",
				created: [created1, created2]
			});

			created1.mockClear();
			created2.mockClear();
			FLOW.length = 0;

			svc._init();

			expect(created1).toBeCalledTimes(1);
			expect(created1).toBeCalledWith();
			expect(created2).toBeCalledTimes(1);
			expect(created2).toBeCalledWith();

			expect(FLOW.join("-")).toBe("C1-C2");
		});
	});

	describe("Test _start", () => {
		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);

		jest.spyOn(broker, "registerLocalService");
		jest.spyOn(broker, "callMiddlewareHook");
		jest.spyOn(svc, "waitForServices").mockImplementation(async () => {});

		it("should call broker methods", async () => {
			svc.parseServiceSchema({
				name: "posts"
			});

			broker.registerLocalService.mockClear();
			broker.callMiddlewareHook.mockClear();
			svc.waitForServices.mockClear();

			await svc._start();

			expect(broker.callMiddlewareHook).toBeCalledTimes(2);
			expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(1, "serviceStarting", [svc]);
			expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(2, "serviceStarted", [svc]);

			expect(broker.registerLocalService).toBeCalledTimes(1);
			expect(broker.registerLocalService).toBeCalledWith(svc._serviceSpecification);

			expect(svc.waitForServices).toBeCalledTimes(0);
		});

		it("should call waitForServices if dependencies are defined", async () => {
			svc.parseServiceSchema({
				name: "posts",
				dependencies: ["users", "auth"]
			});

			broker.registerLocalService.mockClear();
			broker.callMiddlewareHook.mockClear();
			svc.waitForServices.mockClear();

			await svc._start();

			expect(broker.callMiddlewareHook).toBeCalledTimes(2);
			expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(1, "serviceStarting", [svc]);
			expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(2, "serviceStarted", [svc]);

			expect(broker.registerLocalService).toBeCalledTimes(1);
			expect(broker.registerLocalService).toBeCalledWith(svc._serviceSpecification);

			expect(svc.waitForServices).toBeCalledTimes(1);
			expect(svc.waitForServices).toBeCalledWith(["users", "auth"], 0, 1000);
		});

		it("should call waitForServices if dependencies are defined & $dependencyTimeout", async () => {
			svc.parseServiceSchema({
				name: "posts",
				settings: {
					$dependencyTimeout: 3000
				},
				dependencies: ["users", "auth"]
			});

			svc.waitForServices.mockClear();

			await svc._start();

			expect(svc.waitForServices).toBeCalledTimes(1);
			expect(svc.waitForServices).toBeCalledWith(["users", "auth"], 3000, 1000);
		});

		it("should call waitForServices if dependencies are defined & $dependencyInterval", async () => {
			svc.parseServiceSchema({
				name: "posts",
				settings: {
					$dependencyInterval: 100
				},
				dependencies: ["users", "auth"]
			});

			svc.waitForServices.mockClear();

			await svc._start();

			expect(svc.waitForServices).toBeCalledTimes(1);
			expect(svc.waitForServices).toBeCalledWith(["users", "auth"], 0, 100);
		});

		it("should call single started lifecycle event handler", async () => {
			const started = jest.fn(async () => {});
			svc.parseServiceSchema({
				name: "posts",
				started
			});

			await svc._start();

			expect(started).toBeCalledTimes(1);
			expect(started).toBeCalledWith();
		});

		it("should call multiple started lifecycle event handler", async () => {
			let FLOW = [];

			const started1 = jest.fn(async () => FLOW.push("S1"));
			const started2 = jest.fn(async () => FLOW.push("S2"));
			svc.parseServiceSchema({
				name: "posts",
				started: [started1, started2]
			});

			await svc._start();

			expect(started1).toBeCalledTimes(1);
			expect(started1).toBeCalledWith();

			expect(started2).toBeCalledTimes(1);
			expect(started2).toBeCalledWith();

			expect(FLOW.join("-")).toBe("S1-S2");
		});
	});

	describe("Test _stop", () => {
		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);

		jest.spyOn(broker, "callMiddlewareHook");

		it("should call broker methods", async () => {
			svc.parseServiceSchema({
				name: "posts"
			});

			broker.callMiddlewareHook.mockClear();

			await svc._stop();

			expect(broker.callMiddlewareHook).toBeCalledTimes(2);
			expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(1, "serviceStopping", [svc], {
				reverse: true
			});
			expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(2, "serviceStopped", [svc], {
				reverse: true
			});
		});

		it("should call single stopped lifecycle event handler", async () => {
			const stopped = jest.fn(async () => {});
			svc.parseServiceSchema({
				name: "posts",
				stopped
			});

			await svc._stop();

			expect(stopped).toBeCalledTimes(1);
			expect(stopped).toBeCalledWith();
		});

		it("should call multiple stopped lifecycle event handler", async () => {
			let FLOW = [];
			const stopped1 = jest.fn(async () => FLOW.push("S1"));
			const stopped2 = jest.fn(async () => FLOW.push("S2"));
			svc.parseServiceSchema({
				name: "posts",
				stopped: [stopped1, stopped2]
			});

			await svc._stop();

			expect(stopped1).toBeCalledTimes(1);
			expect(stopped1).toBeCalledWith();

			expect(stopped2).toBeCalledTimes(1);
			expect(stopped2).toBeCalledWith();

			expect(FLOW.join("-")).toBe("S2-S1");
		});
	});

	describe("Test _createMethod", () => {
		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);
		svc.parseServiceSchema({ name: "posts", version: 2 });

		it("should throw error if method schema is invalid", () => {
			expect(() => {
				svc._createMethod(null, "list");
			}).toThrowError("Invalid method definition in 'list' method in 'v2.posts' service!");
			expect(() => {
				svc._createMethod("schema", "list");
			}).toThrowError("Invalid method definition in 'list' method in 'v2.posts' service!");
		});

		it("should throw error if action handler is not defined", () => {
			expect(() => {
				svc._createMethod({}, "list");
			}).toThrowError("Missing method handler on 'list' method in 'v2.posts' service!");
			expect(() => {
				svc._createMethod({ handler: null }, "list");
			}).toThrowError("Missing method handler on 'list' method in 'v2.posts' service!");
			expect(() => {
				svc._createMethod({ handler: "wrong" }, "list");
			}).toThrowError("Missing method handler on 'list' method in 'v2.posts' service!");
		});

		it("should create action definition from a shorthand handler", () => {
			const handler = jest.fn(function (name) {
				expect(this).toBe(svc);
				return `Hello ${name}`;
			});

			const res = svc._createMethod(handler, "list");

			expect(res).toEqual({
				name: "list",
				handler: expect.any(Function),
				service: svc
			});

			expect(svc.list).toBe(res.handler);
			expect(svc.list("John")).toBe("Hello John");
		});

		it("should create action definition from a schema", () => {
			const schema = {
				uppercase: true,
				handler: jest.fn(function (name) {
					expect(this).toBe(svc);
					return `Hello ${name}`;
				})
			};

			const res = svc._createMethod(schema, "hello");

			expect(res).toEqual({
				name: "hello",
				handler: expect.any(Function),
				service: svc,
				uppercase: true
			});

			expect(svc.hello).toBe(res.handler);
			expect(svc.hello("John")).toBe("Hello John");
		});
	});

	describe("Test _createAction", () => {
		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);
		svc.parseServiceSchema({ name: "posts", version: 2 });

		jest.spyOn(svc.Promise, "method");

		it("should throw error if action schema is invalid", () => {
			expect(() => {
				svc._createAction(null, "list");
			}).toThrowError("Invalid action definition in 'list' action in 'v2.posts' service!");
			expect(() => {
				svc._createAction("schema", "list");
			}).toThrowError("Invalid action definition in 'list' action in 'v2.posts' service!");
		});

		it("should throw error if action handler is not defined", () => {
			expect(() => {
				svc._createAction({}, "list");
			}).toThrowError("Missing action handler on 'list' action in 'v2.posts' service!");
			expect(() => {
				svc._createAction({ handler: null }, "list");
			}).toThrowError("Missing action handler on 'list' action in 'v2.posts' service!");
			expect(() => {
				svc._createAction({ handler: "wrong" }, "list");
			}).toThrowError("Missing action handler on 'list' action in 'v2.posts' service!");
		});

		it("should create action definition from a shorthand handler", () => {
			const handler = jest.fn(function () {
				expect(this).toBe(svc);
				return "Hello";
			});
			svc.Promise.method.mockClear();

			const res = svc._createAction(handler, "list");

			expect(res).toEqual({
				name: "v2.posts.list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc
			});

			expect.assertions(4);

			expect(svc.Promise.method).toBeCalledTimes(1);

			return res.handler().then(res => expect(res).toBe("Hello"));
		});

		it("should create action definition with cache", () => {
			const handler = jest.fn(() => "Hello");
			const res = svc._createAction(
				{
					params: {
						a: "string"
					},
					cache: true,
					etc: "etc",
					handler
				},
				"list"
			);

			expect(res).toEqual({
				name: "v2.posts.list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc,
				cache: true,
				etc: "etc",
				params: {
					a: "string"
				}
			});

			expect.assertions(2);

			return res.handler().then(res => expect(res).toBe("Hello"));
		});

		it("should create action definition without prefixes", () => {
			svc.settings.$noServiceNamePrefix = true;

			const handler = jest.fn(() => "Hello");
			const res = svc._createAction(
				{
					handler
				},
				"list"
			);

			expect(res).toStrictEqual({
				name: "list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc
			});

			svc.settings.$noServiceNamePrefix = false;
		});

		it("should set cache: true if $cache is defined in service settings", () => {
			svc.settings.$cache = true;

			const handler = jest.fn(() => "Hello");
			const res = svc._createAction(
				{
					handler
				},
				"list"
			);

			expect(res).toStrictEqual({
				name: "v2.posts.list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc,
				cache: true
			});
		});

		it("should set cache: true if $cache is defined in service settings", () => {
			svc.settings.$cache = false;

			const handler = jest.fn(() => "Hello");
			const res = svc._createAction(
				{
					handler
				},
				"list"
			);

			expect(res).toStrictEqual({
				name: "v2.posts.list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc,
				cache: false
			});
		});

		it("should not overwrite cache value if defined in action schema", () => {
			svc.settings.$cache = true;

			const handler = jest.fn(() => "Hello");
			const res = svc._createAction(
				{
					handler,
					cache: false
				},
				"list"
			);

			expect(res).toStrictEqual({
				name: "v2.posts.list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc,
				cache: false
			});
		});

		it("should not overwrite cache value if defined in action schema", () => {
			svc.settings.$cache = true;

			const handler = jest.fn(() => "Hello");
			const res = svc._createAction(
				{
					handler,
					cache: {
						keys: ["id"]
					}
				},
				"list"
			);

			expect(res).toStrictEqual({
				name: "v2.posts.list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc,
				cache: {
					keys: ["id"]
				}
			});
		});
	});

	describe("Test _createEvent", () => {
		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);
		svc.parseServiceSchema({ name: "posts", version: 2 });

		jest.spyOn(svc.Promise, "method");

		it("should throw error if event schema is invalid", () => {
			expect(() => {
				svc._createEvent(null, "user.created");
			}).toThrowError(
				"Invalid event definition in 'user.created' event in 'v2.posts' service!"
			);
			expect(() => {
				svc._createEvent("schema", "user.created");
			}).toThrowError(
				"Invalid event definition in 'user.created' event in 'v2.posts' service!"
			);
		});

		it("should throw error if event handler is not defined", () => {
			expect(() => {
				svc._createEvent({}, "user.created");
			}).toThrowError("Missing event handler on 'user.created' event in 'v2.posts' service!");
			expect(() => {
				svc._createEvent({ handler: null }, "user.created");
			}).toThrowError("Missing event handler on 'user.created' event in 'v2.posts' service!");
			expect(() => {
				svc._createEvent({ handler: "wrong" }, "user.created");
			}).toThrowError("Missing event handler on 'user.created' event in 'v2.posts' service!");
		});

		it("should create event definition from a shorthand handler", () => {
			const handler = jest.fn(function () {
				expect(this).toBe(svc);
				return "Hello";
			});
			const res = svc._createEvent(handler, "user.created");

			expect(res).toEqual({
				name: "user.created",
				handler: expect.any(Function),
				service: svc
			});

			expect.assertions(3);

			return res.handler({}).then(res => expect(res).toBe("Hello"));
		});

		it("should create event definition from event schema", () => {
			svc.Promise.method.mockClear();
			const handler = jest.fn(function () {
				expect(this).toBe(svc);
				return "Hello";
			});
			const res = svc._createEvent(
				{
					name: "user.updated",
					handler,
					etc: "etc"
				},
				"other"
			);

			expect(res).toEqual({
				name: "user.updated",
				handler: expect.any(Function),
				service: svc,
				etc: "etc"
			});

			expect.assertions(4);

			expect(svc.Promise.method).toBeCalledTimes(1);

			return res.handler({}).then(res => expect(res).toBe("Hello"));
		});

		it("should create event definition with multiple handlers", () => {
			const handler1 = jest.fn(function () {
				expect(this).toBe(svc);
				return "Hello1";
			});
			const handler2 = jest.fn(function () {
				expect(this).toBe(svc);
				return "Hello2";
			});

			const res = svc._createEvent(
				{
					handler: [handler1, handler2]
				},
				"user.updated"
			);

			expect(res).toEqual({
				name: "user.updated",
				handler: expect.any(Function),
				service: svc
			});

			expect.assertions(4);

			return res.handler({}).then(res => expect(res).toEqual(["Hello1", "Hello2"]));
		});

		it("should call handlers", () => {
			const handler = function (ctx) {
				expect(this).toBe(svc);
				return { ctx };
			};

			const res = svc._createEvent(
				{
					handler
				},
				"user.updated"
			);

			expect.assertions(5);

			const ctx = {
				params: { a: 5 },
				nodeID: "node-100",
				eventName: "user.removed"
			};
			return res.handler(ctx).then(res => {
				expect(res.payload).toBeUndefined();
				expect(res.nodeID).toBeUndefined();
				expect(res.eventName).toBeUndefined();
				expect(res.ctx).toBe(ctx);
			});
		});

		it("should call handler with multiple times", () => {
			const handler1 = function (ctx) {
				expect(this).toBe(svc);
				return { ctx };
			};

			const handler2 = function (ctx) {
				expect(this).toBe(svc);
				return { ctx };
			};

			const res = svc._createEvent(
				{
					handler: [handler1, handler2]
				},
				"user.updated"
			);

			//expect.assertions(5);

			const ctx = {
				params: { a: 5 },
				nodeID: "node-100",
				eventName: "user.removed"
			};
			return res.handler(ctx).then(([res1, res2]) => {
				expect(res1.ctx).toBe(ctx);
				expect(res2.ctx).toBe(ctx);
			});
		});
	});

	describe("Test emitLocalEventHandler", () => {
		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);

		it("should call the event handler", async () => {
			svc.parseServiceSchema({
				name: "posts",
				version: 2,
				events: {
					"user.created"(ctx) {
						expect(this).toBe(svc);
						expect(ctx.params).toEqual({ id: 5 });
						expect(ctx.eventName).toBe("user.created");
						expect(ctx.eventGroups).toEqual(["posts"]);
						expect(ctx.eventType).toBe("emit");
						return "Hello";
					}
				}
			});

			const res = await svc.emitLocalEventHandler("user.created", { id: 5 });
			expect(res).toBe("Hello");

			expect.assertions(6);
		});

		it("should call the event handler with opts", async () => {
			svc.parseServiceSchema({
				name: "posts",
				version: 2,
				events: {
					"user.created"(ctx) {
						expect(this).toBe(svc);
						expect(ctx.params).toEqual({ id: 5 });
						expect(ctx.eventName).toBe("user.created");
						expect(ctx.eventGroups).toEqual(["posts"]);
						expect(ctx.eventType).toBe("emit");
						expect(ctx.requestID).toBe("12345");
						return "Hello";
					}
				}
			});

			const res = await svc.emitLocalEventHandler(
				"user.created",
				{ id: 5 },
				{ requestID: "12345" }
			);
			expect(res).toBe("Hello");

			expect.assertions(7);
		});

		it("should throw error if event is not exist", async () => {
			try {
				await svc.emitLocalEventHandler("not.found");
			} catch (err) {
				expect(err.code).toBe(500);
				expect(err.type).toBe("NOT_FOUND_EVENT");
				expect(err.message).toBe("No 'not.found' registered local event handler");
				expect(err.data).toEqual({ eventName: "not.found" });
			}
		});
	});

	describe("Test waitForServices", () => {
		const broker = new ServiceBroker({ logger: false });
		jest.spyOn(broker, "waitForServices").mockImplementation(async () => {});

		const svc = new Service(broker);

		it("should call broker.waitForServices", async () => {
			await svc.waitForServices(["users", "auth"], 3000, 500);

			expect(broker.waitForServices).toHaveBeenCalledTimes(1);
			expect(broker.waitForServices).toHaveBeenCalledWith(
				["users", "auth"],
				3000,
				500,
				svc.logger
			);
		});
	});

	describe("Test applyMixins", () => {
		beforeAll(() => jest.spyOn(Service.prototype, "mergeSchemas").mockImplementation(s => s));
		afterAll(() => Service.prototype.mergeSchemas.mockRestore());

		it("should return the schema if no mixins defined", () => {
			Service.prototype.mergeSchemas.mockClear();
			const schema = { name: "posts" };

			const res = Service.prototype.applyMixins(schema);

			expect(res).toBe(schema);
			expect(Service.prototype.mergeSchemas).toBeCalledTimes(0);
		});

		it("should call mergeSchema once", () => {
			Service.prototype.mergeSchemas.mockClear();
			const mixin1 = {
				name: "users"
			};

			const schema = {
				name: "posts",
				mixins: mixin1
			};

			const res = Service.prototype.applyMixins(schema);

			expect(res).toEqual({
				name: "users"
			});
			expect(Service.prototype.mergeSchemas).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemas).toBeCalledWith(mixin1, schema);
		});

		it("should call mergeSchema twice", () => {
			Service.prototype.mergeSchemas.mockClear();
			const mixin1 = {
				name: "users"
			};

			const mixin2 = {
				version: 2
			};

			const schema = {
				name: "posts",
				mixins: [mixin1, mixin2]
			};

			const res = Service.prototype.applyMixins(schema);

			expect(res).toEqual({
				version: 2
			});

			expect(Service.prototype.mergeSchemas).toBeCalledTimes(2);
			expect(Service.prototype.mergeSchemas).toHaveBeenNthCalledWith(1, mixin2, mixin1);
			expect(Service.prototype.mergeSchemas).toHaveBeenNthCalledWith(2, mixin2, schema);
		});

		it("should call mergeSchema for multi-level mixins", () => {
			Service.prototype.mergeSchemas.mockClear();
			const mixin2 = {
				version: 2
			};

			const mixin1 = {
				name: "users",
				mixins: [mixin2]
			};

			const schema = {
				name: "posts",
				mixins: [mixin1]
			};

			const res = Service.prototype.applyMixins(schema);

			expect(res).toEqual({
				version: 2
			});

			expect(Service.prototype.mergeSchemas).toBeCalledTimes(2);
			expect(Service.prototype.mergeSchemas).toHaveBeenNthCalledWith(1, mixin2, mixin1);
			expect(Service.prototype.mergeSchemas).toHaveBeenNthCalledWith(2, mixin2, schema);
		});
	});

	describe("Test mergeSchemas", () => {
		beforeAll(() => {
			jest.spyOn(Service.prototype, "mergeSchemaSettings").mockImplementation(s => s);
			jest.spyOn(Service.prototype, "mergeSchemaMetadata").mockImplementation(s => s);
			jest.spyOn(Service.prototype, "mergeSchemaHooks").mockImplementation(s => s);
			jest.spyOn(Service.prototype, "mergeSchemaActions").mockImplementation(s => s);
			jest.spyOn(Service.prototype, "mergeSchemaMethods").mockImplementation(s => s);
			jest.spyOn(Service.prototype, "mergeSchemaEvents").mockImplementation(s => s);
			jest.spyOn(Service.prototype, "mergeSchemaLifecycleHandlers").mockImplementation(
				s => s
			);
			jest.spyOn(Service.prototype, "mergeSchemaUniqArray").mockImplementation(s => s);
			jest.spyOn(Service.prototype, "mergeSchemaUnknown").mockImplementation(s => s);
		});
		afterAll(() => {
			Service.prototype.mergeSchemaSettings.mockRestore();
			Service.prototype.mergeSchemaMetadata.mockRestore();
			Service.prototype.mergeSchemaHooks.mockRestore();
			Service.prototype.mergeSchemaActions.mockRestore();
			Service.prototype.mergeSchemaMethods.mockRestore();
			Service.prototype.mergeSchemaEvents.mockRestore();
			Service.prototype.mergeSchemaLifecycleHandlers.mockRestore();
			Service.prototype.mergeSchemaUniqArray.mockRestore();
			Service.prototype.mergeSchemaUnknown.mockRestore();
		});

		it("should not throw if input null/undefined", () => {
			const schema = {
				name: "schema"
			};
			const mods = {
				name: "mods"
			};
			expect(Service.prototype.mergeSchemas(schema, null)).toEqual(schema);
			expect(Service.prototype.mergeSchemas(null, mods)).toEqual(mods);
			expect(Service.prototype.mergeSchemas(schema, mods)).toEqual(mods);
		});

		it("should call merge methods", () => {
			const mixin2 = {};

			const mixin = {
				name: "posts",
				version: 3,

				mixins: [mixin2],

				dependencies: ["users", "auth"],

				settings: {
					a: 5
				},

				metadata: {
					region: "us-west"
				},

				hooks: {
					before: {
						"*": () => {}
					},
					after: {
						list: [() => {}, () => {}]
					},
					error: {
						"*": () => {}
					}
				},

				actions: {
					find() {},

					get: {
						cache: true,
						params: {
							a: "string"
						}
					},

					delete: false
				},

				methods: {
					doSomething() {}
				},

				events: {
					"user.created"() {},
					"user.updated": {
						group: "user",
						handler: () => {}
					}
				},

				created() {},
				started() {},
				stopped() {},

				custom: "123"
			};

			Service.prototype.mergeSchemas({}, mixin);

			expect(Service.prototype.mergeSchemaSettings).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemaSettings).toBeCalledWith(mixin.settings, undefined);

			expect(Service.prototype.mergeSchemaMetadata).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemaMetadata).toBeCalledWith(mixin.metadata, undefined);

			expect(Service.prototype.mergeSchemaHooks).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemaHooks).toBeCalledWith(mixin.hooks, {});

			expect(Service.prototype.mergeSchemaActions).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemaActions).toBeCalledWith(mixin.actions, {});

			expect(Service.prototype.mergeSchemaMethods).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemaMethods).toBeCalledWith(mixin.methods, undefined);

			expect(Service.prototype.mergeSchemaEvents).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemaEvents).toBeCalledWith(mixin.events, {});

			expect(Service.prototype.mergeSchemaLifecycleHandlers).toBeCalledTimes(3);
			expect(Service.prototype.mergeSchemaLifecycleHandlers).toBeCalledWith(
				mixin.created,
				undefined
			);
			expect(Service.prototype.mergeSchemaLifecycleHandlers).toBeCalledWith(
				mixin.started,
				undefined
			);
			expect(Service.prototype.mergeSchemaLifecycleHandlers).toBeCalledWith(
				mixin.stopped,
				undefined
			);

			expect(Service.prototype.mergeSchemaUniqArray).toBeCalledTimes(2);
			expect(Service.prototype.mergeSchemaUniqArray).toHaveBeenNthCalledWith(
				1,
				mixin.mixins,
				undefined
			);
			expect(Service.prototype.mergeSchemaUniqArray).toHaveBeenNthCalledWith(
				2,
				mixin.dependencies,
				undefined
			);

			expect(Service.prototype.mergeSchemaUnknown).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemaUnknown).toHaveBeenNthCalledWith(
				1,
				mixin.custom,
				undefined
			);
		});

		it("should call custom merge method", () => {
			Service.prototype.mergeSchemaUnknown.mockClear();
			Service.prototype.mergeSchemaMyProp = jest.fn();

			const mixin = {
				myProp: "123"
			};

			Service.prototype.mergeSchemas({}, mixin);

			expect(Service.prototype.mergeSchemaMyProp).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemaMyProp).toBeCalledWith("123", undefined);
			expect(Service.prototype.mergeSchemaUnknown).toBeCalledTimes(0);
		});

		it("should not overwrite the name & version", () => {
			Service.prototype.mergeSchemaUnknown.mockClear();

			const mixed = Service.prototype.mergeSchemas(
				{
					name: "first",
					version: 1
				},
				{}
			);

			expect(mixed).toEqual({
				name: "first",
				version: 1
			});
		});

		it("should overwrite the name & version", () => {
			Service.prototype.mergeSchemaUnknown.mockClear();

			const mixed = Service.prototype.mergeSchemas(
				{
					name: "first",
					version: 1
				},
				{
					name: "second",
					version: 2
				}
			);

			expect(mixed).toEqual({
				name: "second",
				version: 2
			});
		});
	});

	describe("Test mergeSchemaSettings", () => {
		it("should merge values", () => {
			const src = {
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8
				}
			};

			const prev = {
				a: 10,
				c: {
					e: 10.5,
					f: "Fox"
				}
			};

			const res = Service.prototype.mergeSchemaSettings(src, prev);
			expect(res).toEqual({
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8,
					f: "Fox"
				}
			});
		});

		it("should merge values with $secureSettings", () => {
			const src = {
				$secureSettings: ["a", "b"],
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8
				}
			};

			const prev = {
				$secureSettings: ["c", "b"],
				a: 10,
				c: {
					e: 10.5,
					f: "Fox"
				}
			};

			const res = Service.prototype.mergeSchemaSettings(src, prev);
			expect(res).toEqual({
				$secureSettings: ["a", "b", "c"],
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8,
					f: "Fox"
				}
			});
		});

		it("should merge values with $secureSettings (no target settings)", () => {
			const src = {
				$secureSettings: ["a", "b"],
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8
				}
			};

			const res = Service.prototype.mergeSchemaSettings(src, null);
			expect(res).toEqual({
				$secureSettings: ["a", "b"],
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8
				}
			});
		});

		it("should merge values with $secureSettings (no src settings)", () => {
			const src = {
				$secureSettings: ["a", "b"],
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8
				}
			};

			const res = Service.prototype.mergeSchemaSettings(null, src);
			expect(res).toEqual({
				$secureSettings: ["a", "b"],
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8
				}
			});
		});
	});

	describe("Test mergeSchemaMetadata", () => {
		it("should merge values", () => {
			const src = {
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8
				}
			};

			const prev = {
				a: 10,
				c: {
					e: 10.5,
					f: "Fox"
				}
			};

			const res = Service.prototype.mergeSchemaMetadata(src, prev);
			expect(res).toEqual({
				a: 5,
				b: "John",
				c: {
					d: true,
					e: 45.8,
					f: "Fox"
				}
			});
		});
	});

	describe("Test mergeSchemaUniqArray", () => {
		it("should merge values", () => {
			const src = [1, 2, 3, 4, 5];
			const prev = [2, 4, 6, 8, 10];

			const res = Service.prototype.mergeSchemaUniqArray(src, prev);
			expect(res).toEqual([1, 2, 3, 4, 5, 6, 8, 10]);
		});

		it("should merge objects", () => {
			const src = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
			const prev = [{ id: 2 }, { id: 4 }, { id: 6 }, { id: 8 }, { id: 10 }];

			const res = Service.prototype.mergeSchemaUniqArray(src, prev);
			expect(res).toEqual([
				{ id: 1 },
				{ id: 2 },
				{ id: 3 },
				{ id: 4 },
				{ id: 5 },
				{ id: 6 },
				{ id: 8 },
				{ id: 10 }
			]);
		});
	});

	describe("Test mergeSchemaDependencies", () => {
		it("should merge values", () => {
			jest.spyOn(Service.prototype, "mergeSchemaUniqArray");

			const src = [1, 2, 3, 4, 5];
			const prev = [2, 4, 6, 8, 10];

			const res = Service.prototype.mergeSchemaDependencies(src, prev);
			expect(res).toEqual([1, 2, 3, 4, 5, 6, 8, 10]);

			expect(Service.prototype.mergeSchemaUniqArray).toBeCalledTimes(1);
			expect(Service.prototype.mergeSchemaUniqArray).toBeCalledWith(src, prev);
		});
	});

	describe("Test mergeSchemaHooks", () => {
		it("should merge values", () => {
			const src = {
				before: {
					all: "src-before-all"
				},
				after: {
					list: ["src-after-list1", "src-after-list2"]
				},
				error: {
					all: "src-error-all",
					remove: "src-error-remove"
				}
			};

			const prev = {
				before: {
					all: "prev-before-all",
					create: "prev-before-create"
				},
				after: {
					list: "prev-after-list"
				},
				error: {
					all: "prev-error-all"
				}
			};

			const res = Service.prototype.mergeSchemaHooks(src, prev);
			expect(res).toEqual({
				before: {
					all: ["prev-before-all", "src-before-all"],
					create: "prev-before-create"
				},
				after: {
					list: ["src-after-list1", "src-after-list2", "prev-after-list"]
				},
				error: {
					all: ["src-error-all", "prev-error-all"],
					remove: ["src-error-remove"]
				}
			});
		});
	});

	describe("Test mergeSchemaActions", () => {
		it("should merge actions", () => {
			const src = {
				create() {},
				find: {
					params: {
						count: "number"
					},
					handler() {}
				},
				update: false
			};

			const prev = {
				find: {
					cache: true
				},

				update: {
					handler() {}
				},

				patch: {
					params: {
						update: "object"
					},
					handler() {}
				},

				remove() {}
			};

			const res = Service.prototype.mergeSchemaActions(src, prev);
			expect(res).toEqual({
				create: {
					handler: expect.any(Function)
				},
				find: {
					cache: true,
					params: {
						count: "number"
					},
					handler: expect.any(Function)
				},
				patch: {
					params: {
						update: "object"
					},
					handler: expect.any(Function)
				},
				remove: expect.any(Function)
			});
		});

		it("should merge actions with hooks", () => {
			const src = {
				create: {
					hooks: {
						before: "src-create-before",
						after: "src-create-after",
						error: "src-create-error"
					}
				},
				find: {
					hooks: {
						before: "src-create-before",
						after: ["src-create-after1", "src-create-after2"],
						error: "src-create-error"
					},
					handler() {}
				},
				update: {
					handler() {}
				}
			};

			const prev = {
				create: {
					handler() {}
				},

				find: {
					hooks: {
						before: "prev-create-before",
						after: ["prev-create-after1", "prev-create-after2"],
						error: "prev-create-error"
					}
				},

				update: {
					hooks: {
						before: "prev-update-before",
						after: "prev-update-after",
						error: "prev-update-error"
					}
				}
			};

			const res = Service.prototype.mergeSchemaActions(src, prev);
			expect(res).toEqual({
				create: {
					hooks: {
						before: "src-create-before",
						after: "src-create-after",
						error: "src-create-error"
					},
					handler: expect.any(Function)
				},
				find: {
					hooks: {
						before: ["prev-create-before", "src-create-before"],
						after: [
							"src-create-after1",
							"src-create-after2",
							"prev-create-after1",
							"prev-create-after2"
						],
						error: ["src-create-error", "prev-create-error"]
					},
					handler: expect.any(Function)
				},
				update: {
					hooks: {
						before: "prev-update-before",
						after: "prev-update-after",
						error: "prev-update-error"
					},
					handler: expect.any(Function)
				}
			});
		});
	});

	describe("Test mergeSchemaMethods", () => {
		it("should merge values", () => {
			const src = {
				find: "src-find",
				list: "src-list",
				update: "src-update"
			};

			const prev = {
				create: "prev-create",
				list: "prev-list",
				update: "prev-update",
				remove: "prev-remove"
			};

			const res = Service.prototype.mergeSchemaMethods(src, prev);
			expect(res).toEqual({
				create: "prev-create",
				find: "src-find",
				list: "src-list",
				update: "src-update",
				remove: "prev-remove"
			});
		});
	});

	describe("Test mergeSchemaEvents", () => {
		it("should merge actions", () => {
			const src = {
				create() {},
				find: {
					params: {
						count: "number"
					},
					handler() {}
				},
				update: {
					handler() {}
				}
			};

			const prev = {
				find: {
					group: "user"
				},

				update: {
					handler() {}
				},

				patch: {
					params: {
						update: "object"
					},
					handler() {}
				},

				remove() {}
			};

			const res = Service.prototype.mergeSchemaEvents(src, prev);
			expect(res).toEqual({
				create: {
					handler: expect.any(Function)
				},
				find: {
					group: "user",
					params: {
						count: "number"
					},
					handler: expect.any(Function)
				},
				update: {
					handler: [expect.any(Function), expect.any(Function)]
				},
				patch: {
					params: {
						update: "object"
					},
					handler: expect.any(Function)
				},
				remove: expect.any(Function)
			});
		});
	});

	describe("Test mergeSchemaLifecycleHandlers", () => {
		it("should merge values", () => {
			const res = Service.prototype.mergeSchemaLifecycleHandlers(
				"src-created",
				"prev-created"
			);
			expect(res).toEqual(["prev-created", "src-created"]);
		});
	});

	describe("Test mergeSchemaUnknown", () => {
		it("should merge values", () => {
			expect(Service.prototype.mergeSchemaUnknown("John", "Bob")).toBe("John");
			expect(Service.prototype.mergeSchemaUnknown("John", null)).toBe("John");
			expect(Service.prototype.mergeSchemaUnknown(null, "Bob")).toBeNull();
			expect(Service.prototype.mergeSchemaUnknown(null, null)).toBeNull();

			expect(Service.prototype.mergeSchemaUnknown("John", undefined)).toBe("John");
			expect(Service.prototype.mergeSchemaUnknown(undefined, "Bob")).toBe("Bob");
			expect(Service.prototype.mergeSchemaUnknown(undefined, undefined)).toBeUndefined();
		});
	});

	describe("Test static getVersionedFullName", () => {
		it("should create version service names", () => {
			expect(Service.getVersionedFullName("posts")).toBe("posts");
			expect(Service.getVersionedFullName("posts", 5)).toBe("v5.posts");
			expect(Service.getVersionedFullName("posts", "testing")).toBe("testing.posts");
		});
	});
});
