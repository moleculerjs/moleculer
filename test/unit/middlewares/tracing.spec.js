const ServiceBroker 			= require("../../../src/service-broker");
const { MoleculerError }		= require("../../../src/errors");
const Context 					= require("../../../src/context");
const Middleware 				= require("../../../src/middlewares").Tracing;
const { protectReject }			= require("../utils");

describe("Test TracingMiddleware localAction", () => {

	describe("Test localAction wrapping", () => {
		const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
		const handler = jest.fn(() => Promise.resolve("Result"));
		const action = {
			name: "posts.find",
			handler
		};
		const endpoint = {
			action,
			node: {
				id: broker.nodeID
			}
		};

		it("should not register hooks if tracing is disabled", () => {
			const mw = Middleware(broker);

			expect(mw.name).toBe("Tracing");
			expect(mw.localAction).toBeNull();
		});

		it("should wrap handler if tracing is enabled", () => {
			broker.options.tracing.enabled = true;
			broker.tracer.opts.enabled = true;

			const mw = Middleware(broker);

			expect(mw.localAction).toBeInstanceOf(Function);

			const newHandler = mw.localAction.call(broker, handler, action);

			expect(newHandler).not.toBe(handler);
		});

		it("should not wrap handler if tracing is disabled in action definition", () => {
			action.tracing = false;

			const mw = Middleware(broker);

			expect(mw.localAction).toBeInstanceOf(Function);

			const newHandler = mw.localAction.call(broker, handler, action);

			expect(newHandler).toBe(handler);
		});

		it("should not wrap handler if tracing is disabled in action definition", () => {
			action.tracing = { enabled: false };

			const mw = Middleware(broker);

			expect(mw.localAction).toBeInstanceOf(Function);

			const newHandler = mw.localAction.call(broker, handler, action);

			expect(newHandler).toBe(handler);
		});

		it("should wrap handler if tracing is enabled in action definition", () => {
			action.tracing = true;

			const mw = Middleware(broker);

			expect(mw.localAction).toBeInstanceOf(Function);

			const newHandler = mw.localAction.call(broker, handler, action);

			expect(newHandler).not.toBe(handler);
		});

		it("should wrap handler if tracing is enabled in action definition", () => {
			action.tracing = { enabled: true };

			const mw = Middleware(broker);

			expect(mw.localAction).toBeInstanceOf(Function);

			const newHandler = mw.localAction.call(broker, handler, action);

			expect(newHandler).not.toBe(handler);
		});

	});

	describe("Test localAction handler", () => {
		const broker = new ServiceBroker({ nodeID: "server-1", logger: false, tracing: true });
		const handler = jest.fn(() => Promise.resolve("Result"));
		const action = {
			name: "posts.find",
			rawName: "find",
			handler
		};

		const tracer = broker.tracer;
		tracer.getCurrentTraceID = jest.fn();
		tracer.getActiveSpanID = jest.fn();

		const fakeSpan = {
			addTags: jest.fn(()=> fakeSpan),
			setError: jest.fn(() => fakeSpan),
			finish: jest.fn(),
			sampled: true
		};

		const ctx = {
			broker,
			action,
			id: "ctx-id",
			requestID: "request-id",
			parentID: "parent-id",
			level: 3,
			service: {
				name: "posts",
				version: 1,
				fullName: "v1.posts"
			},
			tracing: true,
			cachedResult: false,
			nodeID: "server-2",
			options: {
				timeout: 5,
				retries: 3
			},

			params: {
				a: 5,
				b: "John",
				c: {
					d: 100,
					e: true
				}
			},

			meta: {
				user: {
					name: "Adam",
					age: 30
				}
			},

			startSpan: jest.fn(() => fakeSpan)
		};

		it("should create a span", async () => {
			const mw = Middleware(broker);
			const newHandler = mw.localAction.call(broker, handler, action);

			tracer.getCurrentTraceID.mockClear();
			tracer.getActiveSpanID.mockClear();
			ctx.startSpan.mockClear();
			fakeSpan.addTags.mockClear();
			fakeSpan.setError.mockClear();
			fakeSpan.finish.mockClear();

			const res = await newHandler(ctx);

			expect(res).toBe("Result");

			expect(tracer.getCurrentTraceID).toHaveBeenCalledTimes(1);
			expect(tracer.getActiveSpanID).toHaveBeenCalledTimes(1);

			expect(ctx.startSpan).toHaveBeenCalledTimes(1);
			expect(ctx.startSpan).toHaveBeenCalledWith("action 'posts.find'", {
				id: "ctx-id",
				traceID: "request-id",
				parentID: "parent-id",
				service: {
					fullName: "v1.posts",
					name: "posts",
					version: 1
				},
				tags: {
					action: {
						name: "posts.find",
						rawName: "find"
					},
					callerNodeID: "server-2",
					callingLevel: 3,
					nodeID: "server-1",
					options: {
						retries: 3,
						timeout: 5
					},
					remoteCall: true
				},
				sampled: true,
			});

			expect(ctx.span).toBe(fakeSpan);
			expect(ctx.tracing).toBe(true);

			expect(fakeSpan.addTags).toHaveBeenCalledTimes(1);
			expect(fakeSpan.addTags).toHaveBeenCalledWith({ fromCache: false });

			expect(fakeSpan.finish).toHaveBeenCalledTimes(1);
			expect(fakeSpan.finish).toHaveBeenCalledWith();

			expect(fakeSpan.setError).toHaveBeenCalledTimes(0);
		});

		it("should create a span with context tags & without service", async () => {
			action.tracing = {
				tags: ["a", "#user.name"]
			};

			ctx.service = null;
			ctx.nodeID = "server-1";

			tracer.getCurrentTraceID = jest.fn(() => "tracer-trace-id");
			tracer.getActiveSpanID = jest.fn(() => "tracer-span-id");

			const mw = Middleware(broker);
			const newHandler = mw.localAction.call(broker, handler, action);

			ctx.startSpan.mockClear();
			fakeSpan.addTags.mockClear();
			fakeSpan.setError.mockClear();
			fakeSpan.finish.mockClear();

			const res = await newHandler(ctx);

			expect(res).toBe("Result");

			expect(tracer.getCurrentTraceID).toHaveBeenCalledTimes(1);
			expect(tracer.getActiveSpanID).toHaveBeenCalledTimes(1);

			expect(ctx.startSpan).toHaveBeenCalledTimes(1);
			expect(ctx.startSpan).toHaveBeenCalledWith("action 'posts.find'", {
				id: "ctx-id",
				traceID: "tracer-trace-id",
				parentID: "tracer-span-id",
				service: null,
				tags: {
					action: {
						name: "posts.find",
						rawName: "find"
					},
					callerNodeID: "server-1",
					callingLevel: 3,
					nodeID: "server-1",
					options: {
						retries: 3,
						timeout: 5
					},
					remoteCall: false,

					a: 5,
					"user.name": "Adam"
				},
				sampled: true,
			});

			expect(ctx.span).toBe(fakeSpan);
			expect(ctx.tracing).toBe(true);

			expect(fakeSpan.addTags).toHaveBeenCalledTimes(1);
			expect(fakeSpan.addTags).toHaveBeenCalledWith({ fromCache: false });

			expect(fakeSpan.finish).toHaveBeenCalledTimes(1);
			expect(fakeSpan.finish).toHaveBeenCalledWith();

			expect(fakeSpan.setError).toHaveBeenCalledTimes(0);
		});

		it("should create a span with custom tags function & error", () => {
			const error = new MoleculerError("Something happened", 456, "SOMETHING", { some: "thing" });
			action.handler = jest.fn(() => Promise.reject(error));
			action.tracing = {
				tags: jest.fn(ctx => ({
					custom: {
						params: ctx.params,
						meta: ctx.meta
					}
				}))
			};

			fakeSpan.sampled = false;

			tracer.getCurrentTraceID = jest.fn(() => "tracer-trace-id");
			tracer.getActiveSpanID = jest.fn(() => "tracer-span-id");

			const mw = Middleware(broker);
			const newHandler = mw.localAction.call(broker, action.handler, action);

			ctx.startSpan.mockClear();
			fakeSpan.addTags.mockClear();
			fakeSpan.setError.mockClear();
			fakeSpan.finish.mockClear();

			return newHandler(ctx).then(protectReject).catch(err => {
				expect(err).toBe(error);

				expect(action.handler).toHaveBeenCalledTimes(1);

				expect(tracer.getCurrentTraceID).toHaveBeenCalledTimes(1);
				expect(tracer.getActiveSpanID).toHaveBeenCalledTimes(1);

				expect(ctx.startSpan).toHaveBeenCalledTimes(1);
				expect(ctx.startSpan).toHaveBeenCalledWith("action 'posts.find'", {
					id: "ctx-id",
					traceID: "tracer-trace-id",
					parentID: "tracer-span-id",
					service: null,
					tags: {
						action: {
							name: "posts.find",
							rawName: "find"
						},
						callerNodeID: "server-1",
						callingLevel: 3,
						nodeID: "server-1",
						options: {
							retries: 3,
							timeout: 5
						},
						remoteCall: false,

						custom: {
							meta: {
								user: {
									age: 30,
									name: "Adam"
								}
							},
							params: {
								a: 5,
								b: "John",
								c: {
									d: 100,
									e: true
								}
							}
						}
					},
					sampled: true,
				});

				expect(ctx.span).toBe(fakeSpan);
				expect(ctx.tracing).toBe(false);

				expect(fakeSpan.addTags).toHaveBeenCalledTimes(0);

				expect(fakeSpan.finish).toHaveBeenCalledTimes(1);
				expect(fakeSpan.finish).toHaveBeenCalledWith();

				expect(fakeSpan.setError).toHaveBeenCalledTimes(1);
				expect(fakeSpan.setError).toHaveBeenCalledWith(err);
			});

		});

	});



/*
	it("should send metric events if handler is resolved", () => {
		broker.options.metrics = true;
		handler.mockClear();
		const newHandler = mw.localAction.call(broker, handler, action);
		broker.emit = jest.fn();

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": { "name": "posts.find" },
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
				"startTime": ctx.startTime
			});

			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": { "name": "posts.find" },
				"startTime": ctx.startTime,
				"endTime": ctx.stopTime,
				"duration": ctx.duration,
				"fromCache": false,
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
			});
		});
	});

	it("should send metric events if handler is rejected", () => {
		let err = new MoleculerError("Some error", 502, "SOME_ERROR", { a: 5 });
		let handler = jest.fn(() => Promise.reject(err));
		const newHandler = mw.localAction.call(broker, handler, action);
		broker.emit = jest.fn();

		const ctx = Context.create(broker, endpoint);
		return newHandler(ctx).then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": { "name": "posts.find" },
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
				"startTime": ctx.startTime
			});

			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": { "name": "posts.find" },
				"startTime": ctx.startTime,
				"endTime": ctx.stopTime,
				"duration": ctx.duration,
				"fromCache": false,
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
				"error": { "code": 502, "message": "Some error", "name": "MoleculerError", "type": "SOME_ERROR" }
			});
		});
	});*/
});

describe.skip("Test TracingMiddleware remoteAction", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		name: "posts.find",
		handler
	};
	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		}
	};

	const mw = Middleware();

	it("should register hooks", () => {
		expect(mw.remoteAction).toBeInstanceOf(Function);
	});

	it("should not set metrics if it's disabled", () => {
		broker.options.metrics = false;

		const newHandler = mw.remoteAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);

		const ctx = Context.create(broker, endpoint);
		ctx.metrics = null;
		return newHandler(ctx).catch(protectReject).then(() => {
			expect(ctx.metrics).toBe(null);
		});
	});

	it("should not set metrics if it's set earlier", () => {
		broker.options.metrics = true;

		const newHandler = mw.remoteAction.call(broker, handler, action);

		expect(newHandler).not.toBe(handler);

		const ctx = Context.create(broker, endpoint);
		ctx.metrics = false;
		return newHandler(ctx).catch(protectReject).then(() => {
			expect(ctx.metrics).toBe(false);
		});
	});

	it("should not set metrics if it's set earlier", () => {
		broker.options.metrics = true;

		const newHandler = mw.remoteAction.call(broker, handler, action);

		expect(newHandler).not.toBe(handler);

		const ctx = Context.create(broker, endpoint);
		ctx.metrics = true;
		return newHandler(ctx).catch(protectReject).then(() => {
			expect(ctx.metrics).toBe(true);
		});
	});

	it("should set metrics if it's not set earlier", () => {
		broker.options.metrics = true;

		const newHandler = mw.remoteAction.call(broker, handler, action);

		expect(newHandler).not.toBe(handler);

		const ctx = Context.create(broker, endpoint);
		ctx.metrics = null;
		return newHandler(ctx).catch(protectReject).then(() => {
			expect(ctx.metrics).toBe(true);
		});
	});

});


describe.skip("Test params & meta in events", () => {
	let broker = new ServiceBroker({ logger: false, metrics: true, nodeID: "master" });
	broker.emit = jest.fn();

	const mw = Middleware();
	const action = { name: "users.get", metrics: false, service: { name: "users", version: 2 } };
	const endpoint = { action, node: { id: broker.nodeID } };

	const handler = jest.fn(() => Promise.resolve());
	const newHandler = mw.localAction.call(broker, handler, action);

	const ctx = Context.create(broker, endpoint);

	it("should not inject params & meta to the payload", () => {
		broker.emit.mockClear();
		ctx.parentID = 123;
		ctx.requestID = "abcdef";
		ctx.nodeID = "remote-node";

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": { "name": "users", "version": 2 },
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node"
			});
		});
	});

	it("should have been called with params and meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get",
			params: { username: "string", pass: "string" },
			metrics: { params: true, meta: true }
		};
		ctx.params = { username: "user", pass: "pass" };
		ctx.meta = { user: { id: 4 } };

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": { "name": "users", "version": 2 },
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"params": { "pass": "pass", "username": "user" },
				"meta": { user: { id: 4 } },
			});
		});
	});

	it("should have been called with params and without meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { params: true, meta: false }
		};

		ctx.params = { username: "user", pass: "pass" };
		ctx.meta = { user: { id: 4 } };

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": { "name": "users", "version": 2 },
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"params": { "pass": "pass", "username": "user" }
			});
		});
	});

	it("should have been called with array of field params and without meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { params: ["username"], meta: false }
		};
		ctx.params = { username: "user", pass: "pass" };

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": { "name": "users", "version": 2 },
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"params": { "username": "user" }
			});
		});
	});

	it("should have been called with array of field meta and without params", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { meta: ["user", "token"] }
		};
		ctx.params = { username: "user", pass: "pass" };
		ctx.meta = {
			user: "John",
			token: 123456,
			session: "00001"
		};

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": { "name": "users", "version": 2 },
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"meta": { user: "John", token: 123456 }
			});
		});
	});

	it("should have been called with function map of params and without meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { params: (params) => { return params.username + "@" + params.pass; }, meta: false }
		};
		ctx.params = { username: "user", pass: "pass" };

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": { "name": "users", "version": 2 },
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"params": "user@pass"
			});
		});
	});

	it("should have been called without params & array of field meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { params: false, meta: (meta) => { return meta.token + "@" + meta.session; } }
		};
		ctx.params = { username: "user", pass: "pass" };
		ctx.meta = {
			user: "John",
			token: 123456,
			session: "00001"
		};

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": { "name": "users", "version": 2 },
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"meta": "123456@00001"
			});
		});
	});
});
