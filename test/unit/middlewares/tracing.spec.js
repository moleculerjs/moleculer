const ServiceBroker 			= require("../../../src/service-broker");
const { MoleculerError }		= require("../../../src/errors");
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
				a: 2,
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

			ctx.params.a = 5;

			expect(tracer.getCurrentTraceID).toHaveBeenCalledTimes(1);
			expect(tracer.getActiveSpanID).toHaveBeenCalledTimes(1);

			expect(ctx.startSpan).toHaveBeenCalledTimes(1);
			expect(ctx.startSpan).toHaveBeenCalledWith("action 'posts.find'", {
				id: "ctx-id",
				type: "action",
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
					remoteCall: true,

					params: {
						a: 2,
						b: "John",
						c: {
							d: 100,
							e: true
						}
					}
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
				tags: {
					params: ["a", "c"],
					meta: ["user.name"]
				}
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
				type: "action",
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

					params: {
						a: 5,
						c:{
							d: 100,
							e: true
						}
					},

					meta: {
						user: {
							name: "Adam"
						}
					}
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

		it("should create a span with cloned params & meta", async () => {
			action.tracing = {
				tags: {
					params: true,
					meta: true
				}
			};

			const mw = Middleware(broker);
			const newHandler = mw.localAction.call(broker, handler, action);

			ctx.startSpan.mockClear();
			fakeSpan.addTags.mockClear();
			fakeSpan.setError.mockClear();
			fakeSpan.finish.mockClear();

			await newHandler(ctx);

			ctx.params.a = 10;
			ctx.meta.user.age = 35;

			expect(ctx.startSpan).toHaveBeenCalledTimes(1);
			expect(ctx.startSpan).toHaveBeenCalledWith("action 'posts.find'", {
				id: "ctx-id",
				type: "action",
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
				},
				sampled: true,
			});
		});

		it("should create a span without params & meta", async () => {
			action.tracing = {
				tags: {
					params: false,
					meta: false
				}
			};

			const mw = Middleware(broker);
			const newHandler = mw.localAction.call(broker, handler, action);

			ctx.startSpan.mockClear();
			fakeSpan.addTags.mockClear();
			fakeSpan.setError.mockClear();
			fakeSpan.finish.mockClear();

			await newHandler(ctx);

			expect(ctx.startSpan).toHaveBeenCalledTimes(1);
			expect(ctx.startSpan).toHaveBeenCalledWith("action 'posts.find'", {
				id: "ctx-id",
				type: "action",
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
					remoteCall: false
				},
				sampled: true,
			});
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
					type: "action",
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
									age: 35,
									name: "Adam"
								}
							},
							params: {
								a: 10,
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

});
