"use strict";

const Context = require("../../src/context");
const ServiceBroker = require("../../src/service-broker");
const { RequestSkippedError, MaxCallLevelError } = require("../../src/errors");
const { protectReject } = require("./utils");
const lolex = require("lolex");

describe("Test Context", () => {

	it("test with empty opts", () => {
		let broker = new ServiceBroker({ nodeID: "server-123", logger: false });

		let ctx = new Context(broker);

		expect(ctx.id).toBeDefined();
		expect(ctx.broker).toBeDefined();
		expect(ctx.endpoint).toBeNull();
		expect(ctx.action).toBeNull();
		expect(ctx.event).toBeNull();
		expect(ctx.service).toBeNull();
		expect(ctx.nodeID).toBe("server-123");

		expect(ctx.eventName).toBeNull();
		expect(ctx.eventType).toBeNull();
		expect(ctx.eventGroups).toBeNull();

		expect(ctx.options).toEqual({
			timeout: null,
			retries: null
		});

		expect(ctx.parentID).toBeNull();
		expect(ctx.caller).toBeNull();

		expect(ctx.level).toBe(1);

		expect(ctx.params).toBeNull();
		expect(ctx.meta).toEqual({});
		expect(ctx.locals).toEqual({});

		expect(ctx.requestID).toBe(ctx.id);

		expect(ctx.tracing).toBeNull();
		expect(ctx.span).toBeNull();

		expect(ctx.needAck).toBeNull();
		expect(ctx.ackID).toBeNull();

		expect(ctx.cachedResult).toBe(false);
	});

	it("test with constructor params", () => {

		let broker = new ServiceBroker({ nodeID: "server-123", logger: false });
		let ctx = new Context(broker);

		expect(ctx.broker).toBe(broker);
		expect(ctx.endpoint).toBeNull();
		expect(ctx.action).toBeNull();
		expect(ctx.event).toBeNull();
		expect(ctx.service).toBeNull();
		expect(ctx.nodeID).toBe("server-123");
	});
});

describe("Test Context.create", () => {

	let broker = new ServiceBroker({ nodeID: "node-1", logger: false });
	let endpoint = {
		action: {
			name: "posts.find",
			service: {
				name: "posts"
			}
		},
		id: "server-123"
	};

	it("test without opts", () => {
		const params = { a: 5 };

		let ctx = Context.create(broker, endpoint, params);

		expect(ctx.id).toBeDefined();
		expect(ctx.broker).toBe(broker);
		expect(ctx.endpoint).toBe(endpoint);
		expect(ctx.action).toBe(endpoint.action);
		expect(ctx.service).toBe(endpoint.action.service);
		expect(ctx.event).toBeNull();
		expect(ctx.nodeID).toBe("server-123");

		expect(ctx.eventName).toBeNull();
		expect(ctx.eventType).toBeNull();
		expect(ctx.eventGroups).toBeNull();

		expect(ctx.params).toEqual({ a: 5 });
		expect(ctx.meta).toEqual({});

		expect(ctx.options).toEqual({});

		expect(ctx.parentID).toBeNull();
		expect(ctx.caller).toBeNull();

		expect(ctx.tracing).toBeNull();
		expect(ctx.level).toBe(1);

		expect(ctx.needAck).toBeNull();
		expect(ctx.ackID).toBeNull();

		expect(ctx.requestID).toBe(ctx.id);

		expect(ctx.cachedResult).toBe(false);
	});

	it("test with opts", () => {
		const params = { a: 5 };
		const opts = {
			timeout: 2500,
			retries: 3,
			fallbackResponse: "Hello",
			meta: {
				user: "John",
				c: 200
			},
			parentCtx: {
				id: 100,
				level: 5,
				meta: {
					token: "123456",
					c: 100
				},
				requestID: "1234567890abcdef",
				tracing: true,
				action: {
					name: "posts.list"
				},
				service: {
					fullName: "posts"
				}
			}
		};

		let ctx = Context.create(broker, endpoint, params, opts);

		expect(ctx.id).toBeDefined();
		expect(ctx.broker).toBe(broker);
		expect(ctx.endpoint).toBe(endpoint);
		expect(ctx.action).toBe(endpoint.action);
		expect(ctx.service).toBe(endpoint.action.service);
		expect(ctx.event).toBeNull();
		expect(ctx.nodeID).toBe("server-123");

		expect(ctx.eventName).toBeNull();
		expect(ctx.eventType).toBeNull();
		expect(ctx.eventGroups).toBeNull();

		expect(ctx.params).toEqual({ a: 5 });
		expect(ctx.meta).toEqual({
			token: "123456",
			user: "John",
			c: 200
		});

		expect(ctx.options).toEqual(opts);

		expect(ctx.parentID).toBe(100);
		expect(ctx.caller).toBe("posts");

		expect(ctx.tracing).toBe(true);
		expect(ctx.level).toBe(6);

		expect(ctx.needAck).toBeNull();
		expect(ctx.ackID).toBeNull();

		expect(ctx.requestID).toBe("1234567890abcdef");
	});

	it("test with opts & event", () => {
		const endpoint = {
			event: {
				name: "user.created",
				service: {
					name: "posts"
				}
			},
			id: "server-123"
		};

		const params = { a: 5 };
		const opts = {
			timeout: 2500,
			retries: 3,
			fallbackResponse: "Hello",
			meta: {
				user: "John",
				c: 200
			},
			parentCtx: {
				id: 100,
				level: 5,
				meta: {
					token: "123456",
					c: 100
				},
				requestID: "1234567890abcdef",
				tracing: true,
				service: {
					fullName: "posts"
				},
				span: {
					id: 300
				}
			},
			caller: "api"
		};

		let ctx = Context.create(broker, endpoint, params, opts);

		expect(ctx.id).toBeDefined();
		expect(ctx.broker).toBe(broker);
		expect(ctx.endpoint).toBe(endpoint);
		expect(ctx.action).toBeNull();
		expect(ctx.event).toBe(endpoint.event);
		expect(ctx.service).toBe(endpoint.event.service);
		expect(ctx.nodeID).toBe("server-123");

		expect(ctx.eventName).toBeNull();
		expect(ctx.eventType).toBeNull();
		expect(ctx.eventGroups).toBeNull();

		expect(ctx.params).toEqual({ a: 5 });
		expect(ctx.meta).toEqual({
			token: "123456",
			user: "John",
			c: 200
		});

		expect(ctx.options).toEqual(opts);

		expect(ctx.parentID).toBe(300);
		expect(ctx.caller).toBe("api");

		expect(ctx.tracing).toBe(true);
		expect(ctx.level).toBe(6);

		expect(ctx.needAck).toBeNull();
		expect(ctx.ackID).toBeNull();

		expect(ctx.requestID).toBe("1234567890abcdef");
	});

	it("test with parentSpan", () => {
		const params = { a: 5 };
		const opts = {
			timeout: 2500,
			parentSpan: {
				id: 111,
				traceID: 222,
				sampled: true
			}
		};

		let ctx = Context.create(broker, endpoint, params, opts);

		expect(ctx.id).toBeDefined();
		expect(ctx.broker).toBe(broker);
		expect(ctx.endpoint).toBe(endpoint);

		expect(ctx.params).toEqual({ a: 5 });

		expect(ctx.options).toEqual(opts);

		expect(ctx.parentID).toBe(111);

		expect(ctx.tracing).toBe(true);
		expect(ctx.level).toBe(1);

		expect(ctx.needAck).toBeNull();
		expect(ctx.ackID).toBeNull();

		expect(ctx.requestID).toBe(222);
	});
});

describe("Test copy", () => {
	let broker = new ServiceBroker({ nodeID: "node-1", logger: false });

	let endpoint = {
		action: {
			name: "posts.find",
			service: {
				name: "posts"
			}
		},
		id: "server-123"
	};

	const baseCtx = Context.create(broker, endpoint, { a: 5 }, {
		timeout: 2500,
		retries: 3,
		fallbackResponse: "Hello",
		meta: {
			user: "John",
			c: 200
		},
		locals: {
			entity: "entity"
		},
		parentCtx: {
			id: 100,
			level: 5,
			meta: {
				token: "123456",
				c: 100
			},
			requestID: "1234567890abcdef",
			tracing: true,
			event: {
				name: "post.created"
			}
		}
	});
	baseCtx.id = "123456";

	it("should copy all properties without endpoint", () => {

		const ctx = baseCtx.copy();

		expect(ctx.id).not.toBe(baseCtx.id);
		expect(ctx.broker).toBe(broker);
		expect(ctx.endpoint).toBe(endpoint);
		expect(ctx.action).toBe(endpoint.action);
		expect(ctx.service).toBe(endpoint.action.service);
		expect(ctx.event).toBeNull();
		expect(ctx.nodeID).toBe("server-123");

		expect(ctx.eventName).toBeNull();
		expect(ctx.eventType).toBeNull();
		expect(ctx.eventGroups).toBeNull();

		expect(ctx.params).toEqual(baseCtx.params);
		expect(ctx.meta).toEqual(baseCtx.meta);
		expect(ctx.locals).toEqual(baseCtx.locals);

		expect(ctx.options).toEqual(baseCtx.options);

		expect(ctx.parentID).toEqual(baseCtx.parentID);
		expect(ctx.caller).toEqual(baseCtx.caller);

		expect(ctx.tracing).toEqual(baseCtx.tracing);
		expect(ctx.level).toEqual(baseCtx.level);

		expect(ctx.needAck).toEqual(baseCtx.needAck);
		expect(ctx.ackID).toEqual(baseCtx.ackID);

		expect(ctx.requestID).toBe(baseCtx.requestID);

		expect(ctx.cachedResult).toBe(false);

	});

	it("should copy all properties with new endpoint", () => {

		const newEndpoint = {
			event: {
				name: "post.created",
				service: {
					name: "posts"
				}
			},
			id: "server-333"
		};

		baseCtx.eventName = "post.created";
		baseCtx.eventType = "emit";
		baseCtx.eventGroups = ["mail"];

		const ctx = baseCtx.copy(newEndpoint);

		expect(ctx.id).not.toBe(baseCtx.id);
		expect(ctx.broker).toBe(broker);
		expect(ctx.endpoint).toBe(newEndpoint);
		expect(ctx.action).toBeNull();
		expect(ctx.event).toBe(newEndpoint.event);
		expect(ctx.service).toBe(newEndpoint.event.service);
		expect(ctx.nodeID).toBe("server-333");

		expect(ctx.eventName).toEqual("post.created");
		expect(ctx.eventType).toEqual("emit");
		expect(ctx.eventGroups).toEqual(["mail"]);

		expect(ctx.params).toEqual(baseCtx.params);
		expect(ctx.meta).toEqual(baseCtx.meta);

		expect(ctx.options).toEqual(baseCtx.options);

		expect(ctx.parentID).toEqual(baseCtx.parentID);
		expect(ctx.caller).toEqual(baseCtx.caller);

		expect(ctx.tracing).toEqual(baseCtx.tracing);
		expect(ctx.level).toEqual(baseCtx.level);

		expect(ctx.needAck).toEqual(baseCtx.needAck);
		expect(ctx.ackID).toEqual(baseCtx.ackID);

		expect(ctx.requestID).toBe(baseCtx.requestID);

		expect(ctx.cachedResult).toBe(false);

	});

});


describe("Test setEndpoint", () => {
	let broker = new ServiceBroker({ nodeID: "node-1", logger: false });

	it("should set internal variables from action endpoint", () => {
		let endpoint = {
			action: {
				name: "posts.find",
				service: {
					name: "posts"
				}
			},
			id: "server-123"
		};

		let ctx = new Context(broker);
		expect(ctx.endpoint).toBeNull();
		expect(ctx.action).toBeNull();
		expect(ctx.event).toBeNull();
		expect(ctx.service).toBeNull();
		expect(ctx.nodeID).toBe("node-1");

		ctx.setEndpoint(endpoint);

		expect(ctx.endpoint).toBe(endpoint);
		expect(ctx.action).toBe(endpoint.action);
		expect(ctx.service).toBe(endpoint.action.service);
		expect(ctx.event).toBeNull();
		expect(ctx.nodeID).toBe("server-123");
	});

	it("should set internal variables from event endpoint", () => {
		let endpoint = {
			event: {
				name: "user.created",
				service: {
					name: "posts"
				}
			},
			id: "server-123"
		};

		let ctx = new Context(broker);
		expect(ctx.endpoint).toBeNull();
		expect(ctx.action).toBeNull();
		expect(ctx.event).toBeNull();
		expect(ctx.service).toBeNull();
		expect(ctx.nodeID).toBe("node-1");

		ctx.setEndpoint(endpoint);

		expect(ctx.endpoint).toBe(endpoint);
		expect(ctx.event).toBe(endpoint.event);
		expect(ctx.service).toBe(endpoint.event.service);
		expect(ctx.action).toBeNull();
		expect(ctx.nodeID).toBe("server-123");
	});

});

describe("Test setParams", () => {
	it("should override the params", () => {

		let params1 = { a: 1 };
		let params2 = { b: 5 };

		let ctx = new Context();
		ctx.params = params1;

		ctx.setParams(params2);

		expect(ctx.params).not.toBe(params1);
		expect(ctx.params).toBe(params2);
	});

	it("should clone the params", () => {

		let params1 = {
			a: 1
		};

		let ctx = new Context();
		ctx.params1 = params1;

		let params2 = {
			b: 5
		};

		ctx.setParams(params2, true);
		expect(ctx.params).not.toBe(params2);
		expect(ctx.params).toEqual(params2);
	});
});


describe("Test call method", () => {
	let broker = new ServiceBroker({ logger: false, maxCallLevel: 5 });
	broker.call = jest.fn(() => broker.Promise.resolve());

	let clock;
	beforeAll(()=> clock = lolex.install());
	afterAll(() => clock.uninstall());

	it("should call broker.call method with itself", () => {
		let ctx = new Context(broker);

		let p = { id: 5 };
		ctx.call("posts.find", p);

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", p, { parentCtx: ctx });
	});

	it("should call broker.call method with options", () => {
		broker.call.mockClear();

		let ctx = new Context(broker);
		ctx.level = 4;

		let p = { id: 5 };
		let opts = { timeout: 2500 };
		ctx.call("posts.find", p, opts);

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", p, { parentCtx: ctx, timeout: 2500 });
		expect(broker.call.mock.calls[0][2]).not.toBe(opts);
		expect(opts.parentCtx).toBeUndefined();
	});

	it("should decrement the timeout with elapsed time", () => {
		broker.call.mockClear();

		let ctx = new Context(broker);
		ctx.startHrTime = process.hrtime();
		ctx.options.timeout = 1000;
		clock.tick(300);

		ctx.call("posts.find", {});

		expect(broker.call).toHaveBeenCalledTimes(1);
		let opts = broker.call.mock.calls[0][2];
		expect(opts.timeout).toBe(700);
	});

	it("should throw RequestSkippedError", () => {
		broker.call.mockClear();

		let ctx = new Context(broker);
		ctx.startHrTime = process.hrtime();
		ctx.options.timeout = 200;
		clock.tick(300);
		return ctx.call("posts.find", {}).then(protectReject).catch(err => {
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(err).toBeInstanceOf(RequestSkippedError);
			expect(err.data.action).toBe("posts.find");
		});
	});

	it("should throw Error if reached the 'maxCallLevel'", () => {
		broker.call.mockClear();

		let ctx = new Context(broker);
		ctx.level = 5;
		return ctx.call("posts.find", {}).then(protectReject).catch(err => {
			expect(broker.call).toHaveBeenCalledTimes(0);
			expect(err).toBeInstanceOf(MaxCallLevelError);
			expect(err.code).toBe(500);
			expect(err.data).toEqual({ nodeID: broker.nodeID, level: 5 });
		});
	});
});

describe("Test call with meta merge", () => {
	let broker = new ServiceBroker({ logger: false, maxCallLevel: 5 });
	let err = new Error("Subcall error");

	broker.call = jest.fn()
		.mockImplementationOnce(() => {
			const p = broker.Promise.resolve();
			p.ctx = {
				meta: {
					b: 5
				}
			};
			return p;
		})
		.mockImplementationOnce(() => {
			const p = broker.Promise.reject(err);
			p.ctx = {
				meta: {
					b: 5
				}
			};
			return p;
		});

	it("should merge meta from sub-context if resolved", () => {
		let ctx = new Context(broker);
		ctx.meta.a = "Hello";
		ctx.meta.b = 1;
		return ctx.call("posts.find", {}).catch(protectReject).then(() => {
			expect(broker.call).toHaveBeenCalledTimes(1);
			expect(ctx.meta).toEqual({ a: "Hello", b: 5 });
		});
	});

	it("should merge meta from sub-context if rejected", () => {
		broker.call.mockClear();
		let ctx = new Context(broker);
		ctx.meta.a = "Hello";
		ctx.meta.b = 1;
		return ctx.call("posts.find", {}).then(protectReject).catch(e => {
			expect(e).toBe(err);
			expect(broker.call).toHaveBeenCalledTimes(1);
			expect(ctx.meta).toEqual({ a: "Hello", b: 5 });
		});
	});
});

describe("Test mcall method", () => {
	let broker = new ServiceBroker({ logger: false, maxCallLevel: 5 });
	broker.mcall = jest.fn(() => broker.Promise.resolve());

	let clock;
	beforeAll(()=> clock = lolex.install());
	afterAll(() => clock.uninstall());

	it("should call broker.mcall method with itself", () => {
		let ctx = new Context(broker);

		let p = { id: 5 };
		let a = [
			{ action: "posts.find", params: p },
			{ action: "posts.list", params: p }
		];

		ctx.mcall(a);

		expect(broker.mcall).toHaveBeenCalledTimes(1);
		expect(broker.mcall).toHaveBeenCalledWith(a, { parentCtx: ctx });
	});

	it("should call broker.call method with options", () => {
		broker.mcall.mockClear();

		let ctx = new Context(broker);
		ctx.level = 4;

		let p = { id: 5 };
		let a = [
			{ action: "posts.find", params: p },
			{ action: "posts.list", params: p }
		];
		let opts = { timeout: 2500 };

		ctx.mcall(a, opts);

		expect(broker.mcall).toHaveBeenCalledTimes(1);
		expect(broker.mcall).toHaveBeenCalledWith(a, { parentCtx: ctx, timeout: 2500 });
		expect(broker.mcall.mock.calls[0][2]).not.toBe(opts);
		expect(opts.parentCtx).toBeUndefined();
	});

	it("should call broker.call method with object", () => {
		broker.mcall.mockClear();

		let ctx = new Context(broker);
		ctx.level = 4;

		let p = { id: 5 };
		let a = {
			find: { action: "posts.find", params: p },
			list: { action: "posts.list", params: p }
		};
		let opts = { timeout: 2500 };

		ctx.mcall(a, opts);

		expect(broker.mcall).toHaveBeenCalledTimes(1);
		expect(broker.mcall).toHaveBeenCalledWith(a, { parentCtx: ctx, timeout: 2500 });
		expect(broker.mcall.mock.calls[0][2]).not.toBe(opts);
		expect(opts.parentCtx).toBeUndefined();
	});

	it("should decrement the timeout with elapsed time", () => {
		broker.mcall.mockClear();

		let ctx = new Context(broker);
		ctx.startHrTime = process.hrtime();
		ctx.options.timeout = 1000;
		clock.tick(300);

		let p = { id: 5 };
		let a = [
			{ action: "posts.find", params: p },
			{ action: "posts.list", params: p }
		];
		let opts = {};

		ctx.mcall(a, opts);

		expect(broker.mcall).toHaveBeenCalledTimes(1);
		let bopts = broker.mcall.mock.calls[0][1];
		expect(bopts.timeout).toBe(700);
	});

	it("should throw RequestSkippedError with array", () => {
		broker.mcall.mockClear();

		let ctx = new Context(broker);
		ctx.startHrTime = process.hrtime();
		ctx.options.timeout = 200;
		clock.tick(300);

		let p = { id: 5 };
		let a = [
			{ action: "posts.find", params: p },
			{ action: "posts.list", params: p }
		];
		let opts = {};

		return ctx.mcall(a, opts).then(protectReject).catch(err => {
			expect(broker.mcall).toHaveBeenCalledTimes(0);
			expect(err).toBeInstanceOf(RequestSkippedError);
			expect(err.data.action).toBe("posts.find, posts.list");
		});
	});

	it("should throw RequestSkippedError with object", () => {
		broker.mcall.mockClear();

		let ctx = new Context(broker);
		ctx.startHrTime = process.hrtime();
		ctx.options.timeout = 200;
		clock.tick(300);

		let p = { id: 5 };
		let a = {
			find: { action: "posts.find", params: p },
			list: { action: "posts.list", params: p }
		};
		let opts = {};

		return ctx.mcall(a, opts).then(protectReject).catch(err => {
			expect(broker.mcall).toHaveBeenCalledTimes(0);
			expect(err).toBeInstanceOf(RequestSkippedError);
			expect(err.data.action).toBe("posts.find, posts.list");
		});
	});

	it("should throw Error if reached the 'maxCallLevel'", () => {
		broker.mcall.mockClear();

		let ctx = new Context(broker);
		ctx.level = 5;
		return ctx.mcall([
			{ action: "posts.find", params: {} },
			{ action: "posts.list", params: {} }
		]).then(protectReject).catch(err => {
			expect(broker.mcall).toHaveBeenCalledTimes(0);
			expect(err).toBeInstanceOf(MaxCallLevelError);
			expect(err.code).toBe(500);
			expect(err.data).toEqual({ nodeID: broker.nodeID, level: 5 });
		});
	});
});

describe("Test mcall with meta merge", () => {
	let broker = new ServiceBroker({ logger: false, maxCallLevel: 5 });
	let err = new Error("Subcall error");

	broker.mcall = jest.fn()
		.mockImplementationOnce(() => {
			const p = broker.Promise.resolve();
			p.ctx = [
				{ meta: { b: 5 } },
				{ meta: { c: 3 } }
			];
			return p;
		})
		.mockImplementationOnce(() => {
			const p = broker.Promise.reject(err);
			p.ctx = [
				{ meta: { b: 5 } },
				{ meta: { c: 3 } }
			];
			return p;
		});

	it("should merge meta from sub-context if resolved", () => {
		let ctx = new Context(broker);
		ctx.meta.a = "Hello";
		ctx.meta.b = 1;
		return ctx.mcall([
			{ action: "posts.find", params: {} },
			{ action: "posts.list", params: {} }
		]).catch(protectReject).then(() => {
			expect(broker.mcall).toHaveBeenCalledTimes(1);
			expect(ctx.meta).toEqual({ a: "Hello", b: 5, c: 3 });
		});
	});

	it("should merge meta from sub-context if rejected", () => {
		broker.mcall.mockClear();
		let ctx = new Context(broker);
		ctx.meta.a = "Hello";
		ctx.meta.b = 1;
		return ctx.mcall([
			{ action: "posts.find", params: {} },
			{ action: "posts.list", params: {} }
		]).then(protectReject).catch(e => {
			expect(e).toBe(err);
			expect(broker.mcall).toHaveBeenCalledTimes(1);
			expect(ctx.meta).toEqual({ a: "Hello", b: 5, c: 3 });
		});
	});
});

describe("Test emit method", () => {
	const broker = new ServiceBroker({ logger: false });
	broker.emit = jest.fn();

	const ctx = new Context(broker);

	it("should call broker.emit method with object param", () => {
		const data = { id: 5 };
		ctx.emit("request.rest", data);

		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", data, { parentCtx: ctx, groups: undefined });
	});

	it("should call broker.emit method with string param", () => {
		broker.emit.mockClear();
		ctx.emit("request.rest", "string-data");
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", "string-data", { parentCtx: ctx, groups: undefined });
	});

	it("should call broker.emit method without payload & group", () => {
		broker.emit.mockClear();
		ctx.emit("request.rest", null, "mail");
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", null, { parentCtx: ctx, groups: ["mail"] });
	});

	it("should call broker.emit method without payload & groups", () => {
		broker.emit.mockClear();
		ctx.emit("request.rest", null, ["mail", "users"]);
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", null, { parentCtx: ctx, groups: ["mail", "users"] });
	});

	it("should call broker.emit method with opts", () => {
		const data = { id: 5 };
		broker.emit.mockClear();
		ctx.emit("request.rest", data, {
			groups: ["mail"]
		});
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", data, { parentCtx: ctx, groups: ["mail"] });
	});
});

describe("Test broadcast method", () => {
	const broker = new ServiceBroker({ logger: false });
	broker.broadcast = jest.fn();

	const ctx = new Context(broker);

	it("should call broker.broadcast method with object param", () => {
		const data = { id: 5 };
		ctx.broadcast("request.rest", data);

		expect(broker.broadcast).toHaveBeenCalledTimes(1);
		expect(broker.broadcast).toHaveBeenCalledWith("request.rest", data, { parentCtx: ctx, groups: undefined });
	});

	it("should call broker.broadcast method with string param", () => {
		broker.broadcast.mockClear();
		ctx.broadcast("request.rest", "string-data");
		expect(broker.broadcast).toHaveBeenCalledTimes(1);
		expect(broker.broadcast).toHaveBeenCalledWith("request.rest", "string-data", { parentCtx: ctx, groups: undefined });
	});

	it("should call broker.broadcast method without payload & group", () => {
		broker.broadcast.mockClear();
		ctx.broadcast("request.rest", null, "users");
		expect(broker.broadcast).toHaveBeenCalledTimes(1);
		expect(broker.broadcast).toHaveBeenCalledWith("request.rest", null, { parentCtx: ctx, groups: ["users"] });
	});

	it("should call broker.broadcast method without payload & groups", () => {
		broker.broadcast.mockClear();
		ctx.broadcast("request.rest", null, ["mail", "users"]);
		expect(broker.broadcast).toHaveBeenCalledTimes(1);
		expect(broker.broadcast).toHaveBeenCalledWith("request.rest", null, { parentCtx: ctx, groups: ["mail", "users"] });
	});

	it("should call broker.broadcast method without payload & groups", () => {
		const data = { id: 5 };
		broker.broadcast.mockClear();
		ctx.broadcast("request.rest", data, {
			groups: ["mail"]
		});
		expect(broker.broadcast).toHaveBeenCalledTimes(1);
		expect(broker.broadcast).toHaveBeenCalledWith("request.rest", data, { parentCtx: ctx, groups: ["mail"] });
	});

});

describe("Test startSpan, finishSpan method", () => {
	let broker = new ServiceBroker({ logger: false, tracing: true });
	const fakeSpan2 = { id: 456, isActive: jest.fn(() => true), finish: jest.fn() };
	const fakeSpan = { id: 123, isActive: jest.fn(() => false), startSpan: jest.fn(() => fakeSpan2), finish: jest.fn() };
	broker.tracer.startSpan = jest.fn(() => fakeSpan);

	let ctx = new Context(broker);

	it("should call tracer.startSpan", () => {
		expect(ctx.span).toBeNull();
		expect(ctx._spanStack).toEqual([]);

		let opts = { a: 5 };
		ctx.startSpan("custom span", opts);

		expect(broker.tracer.startSpan).toHaveBeenCalledTimes(1);
		expect(broker.tracer.startSpan).toHaveBeenCalledWith("custom span", opts);
		expect(ctx.span).toBe(fakeSpan);
		expect(ctx._spanStack).toEqual([fakeSpan]);
	});

	it("should call startSpan of current span", () => {
		expect(ctx.span).toBeDefined();
		expect(ctx._spanStack).toEqual([fakeSpan]);

		let opts = { b: 3 };
		ctx.startSpan("custom nested span", opts);

		expect(fakeSpan.startSpan).toHaveBeenCalledTimes(1);
		expect(fakeSpan.startSpan).toHaveBeenCalledWith("custom nested span", opts);
		expect(ctx.span).toBe(fakeSpan2);
		expect(ctx._spanStack).toEqual([fakeSpan, fakeSpan2]);
	});

	it("should call finish of current span", () => {
		expect(ctx.span).toBe(fakeSpan2);
		expect(ctx._spanStack).toEqual([fakeSpan, fakeSpan2]);

		ctx.finishSpan(fakeSpan2);

		expect(fakeSpan2.isActive).toHaveBeenCalledTimes(1);

		expect(fakeSpan2.finish).toHaveBeenCalledTimes(1);
		expect(fakeSpan2.finish).toHaveBeenCalledWith(undefined);
		expect(ctx.span).toBe(fakeSpan);
		expect(ctx._spanStack).toEqual([fakeSpan]);
	});


	it("should not call finish of current spanif is not active", () => {
		ctx.finishSpan(fakeSpan);

		expect(fakeSpan.isActive).toHaveBeenCalledTimes(1);

		expect(fakeSpan.finish).toHaveBeenCalledTimes(0);
		expect(ctx.span).toBe(fakeSpan);
		expect(ctx._spanStack).toEqual([fakeSpan]);
	});

	it("should call finish of current spanif is not active", () => {
		fakeSpan.isActive = jest.fn(() => true);

		ctx.finishSpan(fakeSpan, 1234);

		expect(fakeSpan.isActive).toHaveBeenCalledTimes(1);

		expect(fakeSpan.finish).toHaveBeenCalledTimes(1);
		expect(fakeSpan.finish).toHaveBeenCalledWith(1234);
		expect(ctx.span).toBeUndefined();
		expect(ctx._spanStack).toEqual([]);
	});

});

describe("Test toJSON method", () => {
	const broker = new ServiceBroker({ logger: false, tracing: true });

	const endpoint = {
		action: {
			name: "posts.find",
			service: {
				name: "posts",
				version: 2,
				fullName: "v2.posts"
			}
		},
		id: "server-123"
	};

	const ctx = Context.create(broker, endpoint, { a: 5 }, {
		timeout: 2500,
		retries: 3,
		fallbackResponse: "Hello",
		meta: {
			user: "John",
			c: 200
		},
		locals: {
			entity: "entity"
		},
		parentCtx: {
			id: 100,
			level: 5,
			meta: {
				token: "123456",
				c: 100
			},
			requestID: "1234567890abcdef",
			tracing: true,
			service: {
				fullName: "posts"
			}
		}
	});
	ctx.eventName = "post.created";
	ctx.eventType = "emit";
	ctx.eventGroups = ["users", "mail"];
	ctx.needAck = true;
	ctx.ackID = "ACK-123";

	it("should generate POJO", () => {
		expect(ctx.toJSON()).toEqual({
			id: ctx.id,
			nodeID: "server-123",
			service: {
				name: "posts",
				version: 2,
				fullName: "v2.posts"
			},
			action: {
				name: "posts.find"
			},

			caller: "posts",
			eventName: "post.created",
			eventType: "emit",
			eventGroups: ["users", "mail"],
			level: 6,
			meta: {
				token: "123456",
				c: 200,
				user: "John"
			},
			options: ctx.options,
			params: {
				a: 5
			},
			parentID: 100,
			requestID: "1234567890abcdef",
			span: null,
			needAck: true,
			ackID: "ACK-123",
			tracing: true,
			cachedResult: false,
		});
	});

	it("should generate POJO with id", () => {
		ctx.id = "123123123";
		expect(ctx.toJSON().id).toBe("123123123");
	});

});
