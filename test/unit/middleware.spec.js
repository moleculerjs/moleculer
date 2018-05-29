"use strict";

const Promise = require("bluebird");
const MiddlewareHandler = require("../../src/middleware");
const ServiceBroker = require("../../src/service-broker");
const { protectReject } = require("./utils");

describe("Test MiddlewareHandler", () => {

	const broker = new ServiceBroker({ logger: false });

	it("test constructor", () => {

		let middlewares = new MiddlewareHandler(broker);

		expect(middlewares.broker).toBe(broker);
		expect(middlewares.list).toBeInstanceOf(Array);
	});

	it("test add method", () => {
		let middlewares = new MiddlewareHandler(broker);

		let mw1 = {};

		middlewares.add(mw1);
		expect(middlewares.count()).toBe(1);
		expect(middlewares.list[0]).toBe(mw1);

		middlewares.add();
		expect(middlewares.count()).toBe(1);

		let mw2 = jest.fn();

		middlewares.add(mw2);
		expect(middlewares.count()).toBe(2);
		expect(middlewares.list[1]).toEqual({
			localAction: mw2
		});
	});

	describe("Test wrapper", () => {

		let middlewares = new MiddlewareHandler(broker);

		let FLOW = [];

		let mw1 = {
			localAction: jest.fn((handler) => {
				return ctx => {
					FLOW.push("MW1-local-pre");
					return handler(ctx).then(res => {
						FLOW.push("MW1-local-post");
						return res;
					});
				};
			})
		};

		let mw2 = {};

		let mw3 = {
			localAction: jest.fn((handler) => {
				return ctx => {
					FLOW.push("MW3-local-pre");
					return handler(ctx).then(res => {
						FLOW.push("MW3-local-post");
						return res;
					});
				};
			}),
			remoteAction: jest.fn((handler) => {
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

		it("should wrap local action", () => {

			const newHandler = middlewares.wrapActionHandler("localAction", action, handler);

			expect(mw1.localAction).toHaveBeenCalledTimes(1);
			expect(mw1.localAction).toHaveBeenCalledWith(handler, action);

			expect(mw3.localAction).toHaveBeenCalledTimes(1);
			expect(mw3.localAction).toHaveBeenCalledWith(jasmine.any(Function), action);
			expect(mw3.remoteAction).toHaveBeenCalledTimes(0);

			return newHandler().catch(protectReject).then(res => {
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
			const newHandler = middlewares.wrapActionHandler("remoteAction", action, handler);

			expect(mw1.localAction).toHaveBeenCalledTimes(0);
			expect(mw3.localAction).toHaveBeenCalledTimes(0);
			expect(mw3.remoteAction).toHaveBeenCalledTimes(1);
			expect(mw3.remoteAction).toHaveBeenCalledWith(jasmine.any(Function), action);

			return newHandler().catch(protectReject).then(res => {
				expect(res).toBe("John");

				expect(FLOW).toEqual([
					"MW3-remote-pre",
					"HANDLER",
					"MW3-remote-post"
				]);

			});
		});

		it("should call wrapActionHandler", () => {
			middlewares.wrapActionHandler = jest.fn();

			middlewares.wrapLocalAction(action, handler);

			expect(middlewares.wrapActionHandler).toHaveBeenCalledTimes(1);
			expect(middlewares.wrapActionHandler).toHaveBeenCalledWith("localAction", action, handler);
		});

		it("should call wrapActionHandler", () => {
			middlewares.wrapActionHandler = jest.fn();

			middlewares.wrapRemoteAction(action, handler);

			expect(middlewares.wrapActionHandler).toHaveBeenCalledTimes(1);
			expect(middlewares.wrapActionHandler).toHaveBeenCalledWith("remoteAction", action, handler);
		});
	});

	describe("Test calling handlers", () => {

		let middlewares = new MiddlewareHandler(broker);

		let FLOW = [];

		let mw1 = {
			created: jest.fn(() => FLOW.push("MW1-created"))
		};

		let mw2 = {
			started: jest.fn(() => Promise.resolve(FLOW.push("MW2-started")))
		};

		let mw3 = {
			created: jest.fn(() => FLOW.push("MW3-created")),
			started: jest.fn(() => Promise.resolve(FLOW.push("MW3-started")))
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

			expect(FLOW).toEqual([
				"MW1-created",
				"MW3-created"
			]);
		});

		it("should wrap remote action", () => {
			FLOW = [];

			const obj = {};

			return middlewares.callHandlers("started", [obj]).catch(protectReject).then(() => {
				expect(mw2.started).toHaveBeenCalledTimes(1);
				expect(mw2.started).toHaveBeenCalledWith(obj);

				expect(mw3.started).toHaveBeenCalledTimes(1);
				expect(mw3.started).toHaveBeenCalledWith(obj);

				expect(FLOW).toEqual([
					"MW2-started",
					"MW3-started"
				]);
			});
		});
	});
});

