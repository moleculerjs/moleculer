"use strict";

const Middlewares = require("../../src/middlewares");
const MiddlewareHandler = require("../../src/middleware");
const ServiceBroker = require("../../src/service-broker");
const { protectReject } = require("./utils");

describe("Test MiddlewareHandler", () => {
	const broker = new ServiceBroker({ logger: false });

	it("test constructor", () => {
		let middlewares = new MiddlewareHandler(broker);

		expect(middlewares.broker).toBe(broker);
		expect(middlewares.list).toBeInstanceOf(Array);
		expect(middlewares.registeredHooks).toBeInstanceOf(Object);
	});

	describe("Test add method", () => {
		const middlewares = new MiddlewareHandler(broker);

		it("should not add item", () => {
			middlewares.add();
			expect(middlewares.count()).toBe(0);
			expect(middlewares.registeredHooks).toEqual({});
		});

		it("should add a middleware", () => {
			let mw1 = {};

			middlewares.add(mw1);
			expect(middlewares.count()).toBe(1);
			expect(middlewares.list[0]).toBe(mw1);
			expect(middlewares.registeredHooks).toEqual({});
		});

		it("should call function and add middleware", () => {
			let mw2 = { localAction: jest.fn() };
			let mw2Wrap = jest.fn(() => mw2);

			middlewares.add(mw2Wrap);
			expect(middlewares.count()).toBe(2);
			expect(middlewares.list[1]).toEqual(mw2);

			expect(mw2Wrap).toHaveBeenCalledTimes(1);
			expect(mw2Wrap).toHaveBeenCalledWith(broker);

			expect(middlewares.registeredHooks).toEqual({ localAction: [mw2.localAction] });
		});

		it("should add a built-in middleware by name", () => {
			jest.spyOn(Middlewares, "Timeout");

			middlewares.add("Timeout");
			expect(middlewares.count()).toBe(3);
			expect(middlewares.list[2]).toEqual({
				name: "Timeout",
				created: expect.any(Function),
				localAction: expect.any(Function),
				remoteAction: expect.any(Function)
			});

			expect(middlewares.registeredHooks).toEqual({
				created: [expect.any(Function)],
				localAction: [expect.any(Function), expect.any(Function)],
				remoteAction: [expect.any(Function)]
			});
		});

		it("should throw error if built-in middleware is not found", () => {
			expect(() => middlewares.add("NotExist")).toThrow(
				"Invalid built-in middleware type 'NotExist'."
			);
		});

		it("should throw error if middleware type is not valid", () => {
			expect(() => middlewares.add(5)).toThrow(
				"Invalid middleware type 'number'. Accepted only Object of Function."
			);
		});
	});

	describe("Test wrapper", () => {
		let middlewares = new MiddlewareHandler(broker);

		let FLOW = [];

		let mw1 = {
			localAction: jest.fn(handler => {
				return ctx => {
					FLOW.push("MW1-local-pre");
					return handler(ctx).then(res => {
						FLOW.push("MW1-local-post");
						return res;
					});
				};
			}),
			localEvent: jest.fn(handler => {
				return () => {
					FLOW.push("MW1-local-event-pre");
					return handler().then(res => {
						FLOW.push("MW1-local-event-post");
						return res;
					});
				};
			})
		};

		let mw2 = {};

		let mw3 = {
			localAction: jest.fn(handler => {
				return ctx => {
					FLOW.push("MW3-local-pre");
					return handler(ctx).then(res => {
						FLOW.push("MW3-local-post");
						return res;
					});
				};
			}),
			remoteAction: jest.fn(handler => {
				return ctx => {
					FLOW.push("MW3-remote-pre");
					return handler(ctx).then(res => {
						FLOW.push("MW3-remote-post");
						return res;
					});
				};
			})
		};

		middlewares.add(mw1);
		middlewares.add(mw2);
		middlewares.add(mw3);

		let handler = jest.fn(() => {
			FLOW.push("HANDLER");
			return Promise.resolve("John");
		});

		let action = {
			name: "posts.find",
			handler
		};

		let event = {
			name: "user.created",
			handler: jest.fn(() => {
				FLOW.push("EVENT-HANDLER");
				return Promise.resolve();
			})
		};

		it("should wrap local action", () => {
			const newHandler = middlewares.wrapHandler("localAction", handler, action);

			expect(mw1.localAction).toHaveBeenCalledTimes(1);
			expect(mw1.localAction).toHaveBeenCalledWith(handler, action);

			expect(mw3.localAction).toHaveBeenCalledTimes(1);
			expect(mw3.localAction).toHaveBeenCalledWith(expect.any(Function), action);
			expect(mw3.remoteAction).toHaveBeenCalledTimes(0);

			return newHandler()
				.catch(protectReject)
				.then(res => {
					expect(res).toBe("John");

					expect(FLOW).toEqual([
						"MW3-local-pre",
						"MW1-local-pre",
						"HANDLER",
						"MW1-local-post",
						"MW3-local-post"
					]);
				});
		});

		it("should wrap remote action", () => {
			mw1.localAction.mockClear();
			mw3.localAction.mockClear();

			FLOW = [];
			const newHandler = middlewares.wrapHandler("remoteAction", handler, action);

			expect(mw1.localAction).toHaveBeenCalledTimes(0);
			expect(mw3.localAction).toHaveBeenCalledTimes(0);
			expect(mw3.remoteAction).toHaveBeenCalledTimes(1);
			expect(mw3.remoteAction).toHaveBeenCalledWith(expect.any(Function), action);

			return newHandler()
				.catch(protectReject)
				.then(res => {
					expect(res).toBe("John");

					expect(FLOW).toEqual(["MW3-remote-pre", "HANDLER", "MW3-remote-post"]);
				});
		});

		it("should wrap local event", () => {
			FLOW = [];
			const newHandler = middlewares.wrapHandler("localEvent", event.handler, event);

			expect(mw1.localEvent).toHaveBeenCalledTimes(1);
			expect(mw1.localEvent).toHaveBeenCalledWith(event.handler, event);

			return newHandler()
				.catch(protectReject)
				.then(() => {
					expect(FLOW).toEqual([
						"MW1-local-event-pre",
						"EVENT-HANDLER",
						"MW1-local-event-post"
					]);
				});
		});
	});

	describe("Test calling handlers", () => {
		let middlewares = new MiddlewareHandler(broker);

		let FLOW = [];

		let mw1 = {
			created: jest.fn(() => FLOW.push("MW1-created"))
		};

		let mw2 = {
			started: jest.fn(() => Promise.delay(20).then(() => FLOW.push("MW2-started")))
		};

		let mw3 = {
			created: jest.fn(() => FLOW.push("MW3-created")),
			started: jest.fn(() => Promise.delay(20).then(() => FLOW.push("MW3-started")))
		};

		middlewares.add(mw1);
		middlewares.add(mw2);
		middlewares.add(mw3);

		it("should call sync handlers", () => {
			const obj = {};

			middlewares.callSyncHandlers("created", [obj]);

			expect(mw1.created).toHaveBeenCalledTimes(1);
			expect(mw1.created).toHaveBeenCalledWith(obj);

			expect(mw3.created).toHaveBeenCalledTimes(1);
			expect(mw3.created).toHaveBeenCalledWith(obj);

			expect(FLOW).toEqual(["MW1-created", "MW3-created"]);
		});

		it("should call reverted sync handlers", () => {
			mw1.created.mockClear();
			mw3.created.mockClear();

			FLOW = [];
			const obj = {};

			middlewares.callSyncHandlers("created", [obj], { reverse: true });

			expect(mw1.created).toHaveBeenCalledTimes(1);
			expect(mw1.created).toHaveBeenCalledWith(obj);

			expect(mw3.created).toHaveBeenCalledTimes(1);
			expect(mw3.created).toHaveBeenCalledWith(obj);

			expect(FLOW).toEqual(["MW3-created", "MW1-created"]);
		});

		it("should call async handlers", () => {
			FLOW = [];

			const obj = {};

			return middlewares
				.callHandlers("started", [obj])
				.catch(protectReject)
				.then(() => {
					expect(mw2.started).toHaveBeenCalledTimes(1);
					expect(mw2.started).toHaveBeenCalledWith(obj);

					expect(mw3.started).toHaveBeenCalledTimes(1);
					expect(mw3.started).toHaveBeenCalledWith(obj);

					expect(FLOW).toEqual(["MW2-started", "MW3-started"]);
				});
		});

		it("should call reverted async handlers", () => {
			mw2.started.mockClear();
			mw3.started.mockClear();

			FLOW = [];

			const obj = {};

			return middlewares
				.callHandlers("started", [obj], { reverse: true })
				.catch(protectReject)
				.then(() => {
					expect(mw2.started).toHaveBeenCalledTimes(1);
					expect(mw2.started).toHaveBeenCalledWith(obj);

					expect(mw3.started).toHaveBeenCalledTimes(1);
					expect(mw3.started).toHaveBeenCalledWith(obj);

					expect(FLOW).toEqual(["MW3-started", "MW2-started"]);
				});
		});
	});

	describe("Test wrapMethod", () => {
		const middlewares = new MiddlewareHandler();

		it("should wrap a method", () => {
			const mw1 = {
				myMethod: jest.fn(function (next) {
					return str => next(`!${str}!`);
				})
			};

			const mw2 = {
				myMethod: jest.fn(function (next) {
					return str => next([str, str].join("-"));
				})
			};

			const target = {
				myMethod(str) {
					return str.toUpperCase();
				}
			};

			middlewares.add(mw1);
			middlewares.add(mw2);

			expect(target.myMethod("Moleculer")).toBe("MOLECULER");

			const wrappedMyMethod = middlewares.wrapMethod("myMethod", target.myMethod, target);
			expect(wrappedMyMethod("Moleculer")).toBe("!MOLECULER-MOLECULER!");

			const wrappedRevMyMethod = middlewares.wrapMethod("myMethod", target.myMethod, target, {
				reverse: true
			});
			expect(wrappedRevMyMethod("Moleculer")).toBe("!MOLECULER!-!MOLECULER!");
		});
	});
});
