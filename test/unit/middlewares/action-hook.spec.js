const ServiceBroker = require("../../../src/service-broker");
const { MoleculerError } = require("../../../src/errors");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").ActionHook;
const { protectReject } = require("../utils");

describe("Test ActionHookMiddleware", () => {
	let FLOW = [];

	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {
		schema: {
			hooks: {}
		},
		beforeHookMethod(ctx) {
			FLOW.push(`method-before-hook-${ctx.action.rawName}`);
			ctx.params.second = 2;
		},
		afterHookMethod(ctx, res) {
			FLOW.push(`method-after-hook-${ctx.action.rawName}`);
			return Object.assign(res, { b: 200 });
		}
	};

	const action = {
		name: "posts.find",
		rawName: "find",
		handler,
		service,
		hooks: {
			before(ctx) {
				FLOW.push("before-action-hook");
				ctx.params.third = 3;
			},
			after(ctx, res) {
				FLOW.push("after-action-hook");
				return Object.assign(res, { c: 300 });
			},
			error(ctx, err) {
				FLOW.push("error-action-hook");
				throw err;
			}
		}
	};

	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		}
	};

	const mw = Middleware(broker);

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
	});

	it("should not wrap handler if no hooks", () => {
		const newHandler = mw.localAction.call(broker, handler, {});
		expect(newHandler).toBe(handler);
	});

	it("should call simple before & after hooks", () => {
		service.schema.hooks = {
			before: {
				"*"(ctx) {
					FLOW.push("before-all-hook");
					ctx.params.hundred = 100;
				},
				find(ctx) {
					FLOW.push("before-hook");
					ctx.params.second = 2;
				}
			},
			after: {
				find(ctx, res) {
					FLOW.push("after-hook");
					return Object.assign(res, { b: 200 });
				},
				"*"(ctx, res) {
					FLOW.push("after-all-hook");
					return Object.assign(res, { x: 999 });
				}
			}
		};

		FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.first + "-" + ctx.params.second);
			return broker.Promise.resolve({ a: 100 });
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual({
					a: 100,
					b: 200,
					c: 300,
					x: 999
				});

				expect(FLOW).toEqual([
					"before-all-hook",
					"before-hook",
					"before-action-hook",
					"handler-1-2",
					"after-action-hook",
					"after-hook",
					"after-all-hook"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});

	it("should call simple error hooks", () => {
		service.schema.hooks = {
			error: {
				find(ctx, err) {
					FLOW.push("error-hook");
					throw err;
				},
				list(ctx, err) {
					FLOW.push("error-other-hook");
					throw err;
				},
				"*"(ctx, err) {
					FLOW.push("error-all-hook");
					throw err;
				}
			}
		};

		FLOW = [];
		const error = new MoleculerError("Simple error");

		const handler = jest.fn(() => {
			FLOW.push("handler");
			return broker.Promise.reject(error);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.then(protectReject)
			.catch(err => {
				expect(err).toBe(error);

				expect(FLOW).toEqual([
					"before-action-hook",
					"handler",
					"error-action-hook",
					"error-hook",
					"error-all-hook"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});

	it("should call multiple before & after hooks", () => {
		service.schema.hooks = {
			before: {
				"*": [
					function (ctx) {
						FLOW.push("before-all-hook-1");
						ctx.params.hundred = 100;
					},
					function (ctx) {
						FLOW.push("before-all-hook-2");
						ctx.params.hundred = 101;
					}
				],
				find: [
					function (ctx) {
						FLOW.push("before-hook-1");
						ctx.params.second = 2;
					},
					function (ctx) {
						FLOW.push("before-hook-2");
						ctx.params.third = 3;
					}
				],
				"find|invalid": [
					function (ctx) {
						FLOW.push("before-hook-3");
					}
				],
				"invalid1|invalid2": [
					function (ctx) {
						FLOW.push("before-hook-4"); //not added
					}
				]
			},
			after: {
				find: [
					function (ctx, res) {
						FLOW.push("after-hook-1");
						return Object.assign(res, { b: 200 });
					},
					function (ctx, res) {
						FLOW.push("after-hook-2");
						return Object.assign(res, { c: 300 });
					}
				],

				"invalid|find": [
					function (ctx, res) {
						FLOW.push("after-hook-3");
						return res;
					}
				],

				"*": [
					function (ctx, res) {
						FLOW.push("after-all-hook-1");
						return Object.assign(res, { x: 999 });
					},
					function (ctx, res) {
						FLOW.push("after-all-hook-2");
						res.x = 909;
						return res;
					}
				]
			}
		};

		FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push(
				"handler-" + ctx.params.first + "-" + ctx.params.second + "-" + ctx.params.third
			);
			return broker.Promise.resolve({ a: 100 });
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual({
					a: 100,
					b: 200,
					c: 300,
					x: 909
				});

				expect(FLOW).toEqual([
					"before-all-hook-1",
					"before-all-hook-2",
					"before-hook-1",
					"before-hook-2",
					"before-hook-3",
					"before-action-hook",
					"handler-1-2-3",
					"after-action-hook",
					"after-hook-1",
					"after-hook-2",
					"after-hook-3",
					"after-all-hook-1",
					"after-all-hook-2"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});

	it("should call multiple error hooks", () => {
		service.schema.hooks = {
			error: {
				find: [
					function (ctx, err) {
						FLOW.push("error-hook-1");
						err.a = 100;
						throw err;
					},
					function (ctx, err) {
						FLOW.push("error-hook-2");
						err.b = 200;
						throw err;
					}
				],
				"*": [
					function (ctx, err) {
						FLOW.push("error-all-hook-1");
						err.x = 999;
						err.y = 888;
						throw err;
					},
					function (ctx, err) {
						FLOW.push("error-all-hook-2");
						err.x = 909;
						throw err;
					}
				]
			}
		};

		FLOW = [];
		const error = new MoleculerError("Simple error");

		const handler = jest.fn(() => {
			FLOW.push("handler");
			return broker.Promise.reject(error);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.then(protectReject)
			.catch(err => {
				expect(err).toBe(error);
				expect(err.a).toBe(100);
				expect(err.b).toBe(200);
				expect(err.x).toBe(909);
				expect(err.y).toBe(888);

				expect(FLOW).toEqual([
					"before-action-hook",
					"handler",
					"error-action-hook",
					"error-hook-1",
					"error-hook-2",
					"error-all-hook-1",
					"error-all-hook-2"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});

	it("should call service method hooks if the hook is a 'string'", () => {
		service.schema.hooks = {
			before: {
				find: [
					function (ctx) {
						FLOW.push("before-hook-1");
						ctx.params.second = 2;
					},
					"beforeHookMethod"
				]
			},
			after: {
				find: "afterHookMethod"
			}
		};

		FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.first + "-" + ctx.params.second);
			return broker.Promise.resolve({ a: 100 });
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual({
					a: 100,
					b: 200,
					c: 300
				});

				expect(FLOW).toEqual([
					"before-hook-1",
					"method-before-hook-find",
					"before-action-hook",
					"handler-1-2",
					"after-action-hook",
					"method-after-hook-find"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});
});

describe("Test ActionHookMiddleware with wildcards", () => {
	let FLOW = [];

	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {
		schema: {
			hooks: {}
		},
		beforeHookMethod(ctx) {
			FLOW.push(`method-before-hook-${ctx.action.rawName}`);
			ctx.params.second = 2;
		},
		afterHookMethod(ctx, res) {
			FLOW.push(`method-after-hook-${ctx.action.rawName}`);
			return Object.assign(res, { b: 200 });
		}
	};

	const action = {
		name: "posts.find-post",
		rawName: "find-post",
		handler,
		service,
		hooks: {
			before(ctx) {
				FLOW.push("before-action-hook");
				ctx.params.third = 3;
			},
			after(ctx, res) {
				FLOW.push("after-action-hook");
				return Object.assign(res, { c: 300 });
			},
			error(ctx, err) {
				FLOW.push("error-action-hook");
				throw err;
			}
		}
	};

	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		}
	};

	const mw = Middleware(broker);

	it("should call simple before & after hooks", () => {
		service.schema.hooks = {
			before: {
				"*"(ctx) {
					FLOW.push("before-all-hook");
					ctx.params.hundred = 100;
				},
				"find-*"(ctx) {
					FLOW.push("before-hook-find-*");
					ctx.params.second = 2;
				}
			},
			after: {
				"find-*"(ctx, res) {
					FLOW.push("after-hook-find-*");
					return Object.assign(res, { b: 200 });
				},
				"*"(ctx, res) {
					FLOW.push("after-all-hook");
					return Object.assign(res, { x: 999 });
				}
			}
		};

		FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.first + "-" + ctx.params.second);
			return broker.Promise.resolve({ a: 100 });
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual({
					a: 100,
					b: 200,
					c: 300,
					x: 999
				});

				expect(FLOW).toEqual([
					"before-all-hook",
					"before-hook-find-*",
					"before-action-hook",
					"handler-1-2",
					"after-action-hook",
					"after-hook-find-*",
					"after-all-hook"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});

	it("should call simple error hooks", () => {
		service.schema.hooks = {
			error: {
				"find-*"(ctx, err) {
					FLOW.push("error-hook-find-*");
					throw err;
				},
				list(ctx, err) {
					FLOW.push("error-other-hook");
					throw err;
				},
				"*"(ctx, err) {
					FLOW.push("error-all-hook");
					throw err;
				}
			}
		};

		FLOW = [];
		const error = new MoleculerError("Simple error");

		const handler = jest.fn(() => {
			FLOW.push("handler");
			return broker.Promise.reject(error);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.then(protectReject)
			.catch(err => {
				expect(err).toBe(error);

				expect(FLOW).toEqual([
					"before-action-hook",
					"handler",
					"error-action-hook",
					"error-hook-find-*",
					"error-all-hook"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});

	it("should call multiple before & after hooks", () => {
		service.schema.hooks = {
			before: {
				"*": [
					function (ctx) {
						FLOW.push("before-all-hook-1");
						ctx.params.hundred = 100;
					},
					function (ctx) {
						FLOW.push("before-all-hook-2");
						ctx.params.hundred = 101;
					}
				],
				"find-*": [
					function (ctx) {
						FLOW.push("before-hook-1-find-*");
						ctx.params.second = 2;
					},
					function (ctx) {
						FLOW.push("before-hook-2-find-*");
						ctx.params.third = 3;
					}
				],
				"find-post": [
					function (ctx) {
						FLOW.push("before-hook-3-regular");
						ctx.params.fourth = 4;
					},
					function (ctx) {
						FLOW.push("before-hook-4-regular");
						ctx.params.fifth = 5;
					}
				],
				"*-post": [
					function (ctx) {
						FLOW.push("before-hook-5-*-post");
						ctx.params.sixth = 6;
					},
					function (ctx) {
						FLOW.push("before-hook-6-*-post");
						ctx.params.seventh = 4;
					}
				]
			},
			after: {
				"find-post": [
					function (ctx, res) {
						FLOW.push("after-hook-1-regular");
						return Object.assign(res, { b: 200 });
					},
					function (ctx, res) {
						FLOW.push("after-hook-2-regular");
						return Object.assign(res, { c: 300 });
					}
				],
				"find-*": [
					function (ctx, res) {
						FLOW.push("after-hook-4-find-*");
						return Object.assign(res, { d: 400 });
					},
					function (ctx, res) {
						FLOW.push("after-hook-5-find-*");
						return Object.assign(res, { e: 500 });
					}
				],
				"*-post": [
					function (ctx, res) {
						FLOW.push("after-hook-6-*-post");
						return Object.assign(res, { f: 600 });
					},
					function (ctx, res) {
						FLOW.push("after-hook-7-*-post");
						return Object.assign(res, { g: 700 });
					}
				],
				"*": [
					function (ctx, res) {
						FLOW.push("after-all-hook-1");
						return Object.assign(res, { x: 999 });
					},
					function (ctx, res) {
						FLOW.push("after-all-hook-2");
						res.x = 909;
						return res;
					}
				]
			}
		};

		FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push(
				"handler-" + ctx.params.first + "-" + ctx.params.second + "-" + ctx.params.third
			);
			return broker.Promise.resolve({ a: 100 });
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual({
					a: 100,
					b: 200,
					c: 300,
					d: 400,
					e: 500,
					f: 600,
					g: 700,
					x: 909
				});

				expect(FLOW).toEqual([
					"before-all-hook-1",
					"before-all-hook-2",
					"before-hook-1-find-*",
					"before-hook-2-find-*",
					"before-hook-3-regular",
					"before-hook-4-regular",
					"before-hook-5-*-post",
					"before-hook-6-*-post",
					"before-action-hook",
					"handler-1-2-3",
					"after-action-hook",
					"after-hook-1-regular",
					"after-hook-2-regular",
					"after-hook-4-find-*",
					"after-hook-5-find-*",
					"after-hook-6-*-post",
					"after-hook-7-*-post",
					"after-all-hook-1",
					"after-all-hook-2"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});

	it("should call multiple error hooks", () => {
		service.schema.hooks = {
			error: {
				"find-post": [
					function (ctx, err) {
						FLOW.push("error-hook-1-regular");
						err.a = 100;
						throw err;
					},
					function (ctx, err) {
						FLOW.push("error-hook-2-regular");
						err.b = 200;
						throw err;
					}
				],
				"find-*": [
					function (ctx, err) {
						FLOW.push("error-hook-3-find*");
						err.c = 300;
						throw err;
					},
					function (ctx, err) {
						FLOW.push("error-hook-4-find*");
						err.d = 400;
						throw err;
					}
				],
				"*-post": [
					function (ctx, err) {
						FLOW.push("error-hook-5-*-post");
						err.e = 500;
						throw err;
					},
					function (ctx, err) {
						FLOW.push("error-hook-6-*-post");
						err.f = 600;
						throw err;
					}
				],
				"*": [
					function (ctx, err) {
						FLOW.push("error-all-hook-1");
						err.x = 999;
						err.y = 888;
						throw err;
					},
					function (ctx, err) {
						FLOW.push("error-all-hook-2");
						err.x = 909;
						throw err;
					}
				]
			}
		};

		FLOW = [];
		const error = new MoleculerError("Simple error");

		const handler = jest.fn(() => {
			FLOW.push("handler");
			return broker.Promise.reject(error);
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.then(protectReject)
			.catch(err => {
				expect(err).toBe(error);
				expect(err.a).toBe(100);
				expect(err.b).toBe(200);
				expect(err.c).toBe(300);
				expect(err.d).toBe(400);
				expect(err.e).toBe(500);
				expect(err.f).toBe(600);
				expect(err.x).toBe(909);
				expect(err.y).toBe(888);

				expect(FLOW).toEqual([
					"before-action-hook",
					"handler",
					"error-action-hook",
					"error-hook-1-regular",
					"error-hook-2-regular",
					"error-hook-3-find*",
					"error-hook-4-find*",
					"error-hook-5-*-post",
					"error-hook-6-*-post",
					"error-all-hook-1",
					"error-all-hook-2"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});

	it("should call service method hooks if the hook is a 'string'", () => {
		service.schema.hooks = {
			before: {
				"find-post": [
					function (ctx) {
						FLOW.push("before-hook-1-regular");
						ctx.params.second = 2;
					},
					"beforeHookMethod"
				],
				"find-*": [
					function (ctx) {
						FLOW.push("before-hook-2-find-*");
						ctx.params.third = 3;
					},
					"beforeHookMethod"
				],
				"*-post": [
					function (ctx) {
						FLOW.push("before-hook-3-*-post");
						ctx.params.fourth = 4;
					},
					"beforeHookMethod"
				]
			},
			after: {
				"find-post": "afterHookMethod"
			}
		};

		FLOW = [];

		const handler = jest.fn(ctx => {
			FLOW.push("handler-" + ctx.params.first + "-" + ctx.params.second);
			return broker.Promise.resolve({ a: 100 });
		});

		const newHandler = mw.localAction.call(broker, handler, action);

		const ctx = Context.create(broker, endpoint, { first: 1 });

		return newHandler
			.call(broker, ctx)
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual({
					a: 100,
					b: 200,
					c: 300
				});

				expect(FLOW).toEqual([
					"before-hook-1-regular",
					"method-before-hook-find-post",
					"before-hook-2-find-*",
					"method-before-hook-find-post",
					"before-hook-3-*-post",
					"method-before-hook-find-post",
					"before-action-hook",
					"handler-1-2",
					"after-action-hook",
					"method-after-hook-find-post"
				]);
				expect(handler).toHaveBeenCalledTimes(1);
			});
	});
});
