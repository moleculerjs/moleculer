"use strict";

const Service = require("../../src/service");
const Context = require("../../src/context");
const ServiceBroker = require("../../src/service-broker");
const { protectReject } = require("./utils");

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
		jest.spyOn(Service, "applyMixins");

		const svc = new Service(broker);

		jest.spyOn(svc, "_init");

		it("should throw error if missing schema", () => {
			expect(() => {
				svc.parseServiceSchema();
			}).toThrowError("The service schema can't be null. Maybe is it not a service schema?");
		});

		it("should throw error if name is empty", () => {
			Service.applyMixins.mockClear();
			expect(() => {
				/* eslint-disable-next-line */
				console.error = jest.fn();
				svc.parseServiceSchema({});
			}).toThrowError("Service name can't be empty! Maybe it is not a valid Service schema. Maybe is it not a service schema?");
			expect(Service.applyMixins).toBeCalledTimes(0);
		});

		it("should set common local variables", () => {
			Service.applyMixins.mockClear();

			const schema = { name: "posts" };
			svc.parseServiceSchema(schema);

			expect(svc.originalSchema).toEqual({ name: "posts" });
			expect(svc.originalSchema).not.toBe(schema);

			expect(Service.applyMixins).toBeCalledTimes(0);

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
			Service.applyMixins.mockClear();
			broker.getLogger.mockClear();
			svc._init.mockClear();

			const schema = { name: "posts", version: 3, mixins: [] };
			svc.parseServiceSchema(schema);

			expect(svc.originalSchema).toEqual({ name: "posts", version: 3, mixins: [] });
			expect(svc.originalSchema).not.toBe(schema);

			expect(Service.applyMixins).toBeCalledTimes(1);
			expect(Service.applyMixins).toBeCalledWith(schema);

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

		it("should throw error if method name is now allowed", () => {
			expect(() => {
				svc.parseServiceSchema({
					name: "posts",
					methods: {
						actions() {}
					}
				});
			}).toThrowError("Invalid method name 'actions' in 'posts' service!");
		});

		it("should set methods and bind the service instance", () => {
			const schema = {
				name: "posts",
				methods: {
					alpha: () => "Alpha",
					beta() {
						expect(this).toBe(svc);
						return "Beta";
					}
				}
			};
			svc.parseServiceSchema(schema);

			expect(svc.alpha).toBeInstanceOf(Function);
			expect(svc.beta).toBeInstanceOf(Function);

			expect(svc.alpha()).toBe("Alpha");
			expect(svc.beta()).toBe("Beta");

			expect(svc._serviceSpecification).toEqual({
				name: "posts",
				version: undefined,
				fullName: "posts",
				settings: {},
				metadata: {},
				actions: {},
				events: {}
			});
		});

		it("should register actions", () => {
			jest.spyOn(svc, "_createAction").mockImplementation((action, name) => ({ name, handler: action.handler || action }));
			jest.spyOn(broker.middlewares, "wrapHandler").mockImplementation((type, handler, action) => handler);
			jest.spyOn(broker.registry, "createPrivateActionEndpoint").mockImplementation(() => ({ id: "nodeID" }));
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
			expect(broker.middlewares.wrapHandler).toHaveBeenNthCalledWith(1, "localAction", expect.any(Function), { name: "alpha", handler: expect.any(Function) });
			expect(broker.middlewares.wrapHandler).toHaveBeenNthCalledWith(2, "localAction", expect.any(Function), { name: "gamma", handler: expect.any(Function) });

			expect(broker.registry.createPrivateActionEndpoint).toBeCalledTimes(2);
			expect(broker.registry.createPrivateActionEndpoint).toHaveBeenNthCalledWith(1, { name: "alpha", handler: expect.any(Function) });
			expect(broker.registry.createPrivateActionEndpoint).toHaveBeenNthCalledWith(2, { name: "gamma", handler: expect.any(Function) });

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
					alpha: jest.fn(() => "Alpha"),
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
			jest.spyOn(svc, "_createEvent").mockImplementation((event, name) => ({ name, handler: event.handler || event }));

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
			expect(svc._createEvent).toHaveBeenNthCalledWith(1, schema.events["user.created"], "user.created");
			expect(svc._createEvent).toHaveBeenNthCalledWith(2, schema.events["posts.updated"], "posts.updated");

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
					"user.created": jest.fn(() => "User created"),
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

	});

	describe("Test _getPublicSettings", () => {

		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);

		it("should skip the properties by $secureSettings", () => {
			expect(svc._getPublicSettings({
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
			})).toEqual({
				a: 5,
				auth: {
					user: "user"
				},
				x: "x"
			});
		});

		it("should keep all properties without $secureSettings", () => {
			expect(svc._getPublicSettings({
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
			})).toEqual({
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
			const created1 = jest.fn();
			const created2 = jest.fn();
			svc.parseServiceSchema({
				name: "posts",
				created: [created1, created2]
			});

			created1.mockClear();
			created2.mockClear();

			svc._init();

			expect(created1).toBeCalledTimes(1);
			expect(created1).toBeCalledWith();
			expect(created2).toBeCalledTimes(1);
			expect(created2).toBeCalledWith();
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
			expect(svc.waitForServices).toBeCalledWith(["users", "auth"], 0);
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
			expect(svc.waitForServices).toBeCalledWith(["users", "auth"], 3000);
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
			const started1 = jest.fn(async () => {});
			const started2 = jest.fn(async () => {});
			svc.parseServiceSchema({
				name: "posts",
				started: [started1, started2]
			});

			await svc._start();

			expect(started1).toBeCalledTimes(1);
			expect(started1).toBeCalledWith();

			expect(started2).toBeCalledTimes(1);
			expect(started2).toBeCalledWith();
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
			expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(1, "serviceStopping", [svc], { reverse: true });
			expect(broker.callMiddlewareHook).toHaveBeenNthCalledWith(2, "serviceStopped", [svc], { reverse: true });
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
			const stopped1 = jest.fn(async () => {});
			const stopped2 = jest.fn(async () => {});
			svc.parseServiceSchema({
				name: "posts",
				stopped: [stopped1, stopped2]
			});

			await svc._stop();

			expect(stopped1).toBeCalledTimes(1);
			expect(stopped1).toBeCalledWith();

			expect(stopped2).toBeCalledTimes(1);
			expect(stopped2).toBeCalledWith();
		});
	});

	describe("Test _createAction", () => {
		const broker = new ServiceBroker({ logger: false });

		const svc = new Service(broker);
		svc.parseServiceSchema({ name: "posts", version: 2 });

		jest.spyOn(svc.Promise, "method");

		it("should throw error if action schema is invalid", () => {
			expect(() => { svc._createAction(null, "list"); }).toThrowError("Invalid action definition in 'list' action in 'v2.posts' service!");
			expect(() => { svc._createAction("schema", "list"); }).toThrowError("Invalid action definition in 'list' action in 'v2.posts' service!");
		});

		it("should throw error if action handler is not defined", () => {
			expect(() => { svc._createAction({}, "list"); })
				.toThrowError("Missing action handler on 'list' action in 'v2.posts' service!");
			expect(() => { svc._createAction({ handler: null }, "list"); })
				.toThrowError("Missing action handler on 'list' action in 'v2.posts' service!");
			expect(() => { svc._createAction({ handler: "wrong" }, "list"); })
				.toThrowError("Missing action handler on 'list' action in 'v2.posts' service!");
		});

		it("should create action definition from a shorthand handler", () => {
			const handler = jest.fn(function() {
				expect(this).toBe(svc);
				return "Hello";
			});
			const res = svc._createAction(handler, "list");

			expect(res).toEqual({
				name: "v2.posts.list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc
			});

			expect.assertions(3);

			return res.handler().then(res => expect(res).toBe("Hello"));
		});

		it("should create action definition with cache", () => {
			const handler = jest.fn(() => "Hello");
			const res = svc._createAction({
				params: {
					a: "string"
				},
				cache: true,
				etc: "etc",
				handler
			}, "list");

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
			const res = svc._createAction({
				handler
			}, "list");

			expect(res).toEqual({
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
			const res = svc._createAction({
				handler
			}, "list");

			expect(res).toEqual({
				name: "v2.posts.list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc,
				cache: true
			});
		});

		it("should not overwrite cache value if defined in action schema", () => {
			svc.settings.$cache = true;

			const handler = jest.fn(() => "Hello");
			const res = svc._createAction({
				handler,
				cache: false
			}, "list");

			expect(res).toEqual({
				name: "v2.posts.list",
				rawName: "list",
				handler: expect.any(Function),
				service: svc,
				cache: false
			});
		});
	});
});

