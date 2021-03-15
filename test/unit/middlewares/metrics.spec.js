const ServiceBroker 			= require("../../../src/service-broker");
const { MoleculerError }		= require("../../../src/errors");
const Context 					= require("../../../src/context");
const Middleware 				= require("../../../src/middlewares").Metrics;
const { protectReject }			= require("../utils");

describe("Test MetricsMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false, metrics: true });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const service = {
		name: "posts",
		fullName: "v2.posts",
	};
	const action = {
		name: "posts.find",
		service,
		handler
	};
	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		}
	};

	const mw = Middleware(broker);

	jest.spyOn(broker.metrics, "register");
	jest.spyOn(broker.metrics, "set");
	jest.spyOn(broker.metrics, "increment");
	jest.spyOn(broker.metrics, "decrement");
	jest.spyOn(broker.metrics, "timer");
	jest.spyOn(broker.localBus, "on");

	it("should register hooks", () => {
		expect(mw.created).toBeInstanceOf(Function);
		expect(mw.localAction).toBeInstanceOf(Function);
		expect(mw.remoteAction).toBeInstanceOf(Function);
		expect(mw.localEvent).toBeInstanceOf(Function);
		expect(mw.emit).toBeInstanceOf(Function);
		expect(mw.broadcast).toBeInstanceOf(Function);
		expect(mw.broadcastLocal).toBeInstanceOf(Function);
		expect(mw.transitPublish).toBeInstanceOf(Function);
		expect(mw.transitMessageHandler).toBeInstanceOf(Function);
		expect(mw.transporterSend).toBeInstanceOf(Function);
		expect(mw.transporterReceive).toBeInstanceOf(Function);
	});

	it("should register metrics & CB event handlers", () => {
		mw.created(broker);
		expect(broker.metrics.register).toBeCalledTimes(20);
	});

	it("should not wrap handler if metrics is disabled", () => {
		broker.isMetricsEnabled = jest.fn(() => false);

		const newHandler = mw.localAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);
	});

	it("should wrap handler if metrics is enabled", () => {
		broker.isMetricsEnabled = jest.fn(() => true);

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);

	});

	describe("Test localAction & remoteAction", () => {

		it("should update local request metrics events if handler is resolved", () => {
			handler.mockClear();
			broker.metrics.increment.mockClear();
			broker.metrics.decrement.mockClear();
			broker.metrics.timer.mockClear();

			const newHandler = mw.localAction.call(broker, handler, action);
			const ctx = Context.create(broker, endpoint);
			ctx.caller = "users.list";

			return newHandler(ctx).catch(protectReject).then(res => {
				expect(res).toBe("Result");

				expect(broker.metrics.increment).toHaveBeenCalledTimes(3);
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.request.total", { action : "posts.find", service: "v2.posts", type: "local", caller: "users.list" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(2, "moleculer.request.active", { action : "posts.find", service: "v2.posts", type: "local", caller: "users.list" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(3, "moleculer.request.levels", { action : "posts.find", service: "v2.posts", level: 1, caller: "users.list" });

				expect(broker.metrics.timer).toHaveBeenCalledTimes(1);
				expect(broker.metrics.timer).toHaveBeenNthCalledWith(1, "moleculer.request.time", { action : "posts.find", service: "v2.posts", type: "local", caller: "users.list" });

				expect(handler).toHaveBeenCalledTimes(1);

				expect(broker.metrics.decrement).toHaveBeenCalledTimes(1);
				expect(broker.metrics.decrement).toHaveBeenNthCalledWith(1, "moleculer.request.active", { action : "posts.find", service: "v2.posts",  type: "local", caller: "users.list" });
			});
		});

		it("should update remote request metrics events if handler is resolved", () => {
			handler.mockClear();
			broker.metrics.increment.mockClear();
			broker.metrics.decrement.mockClear();
			broker.metrics.timer.mockClear();

			const newHandler = mw.remoteAction.call(broker, handler, action);
			const ctx = Context.create(broker, endpoint);
			ctx.caller = "users.list";

			return newHandler(ctx).catch(protectReject).then(res => {
				expect(res).toBe("Result");

				expect(broker.metrics.increment).toHaveBeenCalledTimes(3);
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.request.total", { action : "posts.find", service: "v2.posts",  type: "remote", caller: "users.list" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(2, "moleculer.request.active", { action : "posts.find", service: "v2.posts",  type: "remote", caller: "users.list" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(3, "moleculer.request.levels", { action : "posts.find", service: "v2.posts",  level: 1, caller: "users.list" });

				expect(broker.metrics.timer).toHaveBeenCalledTimes(1);
				expect(broker.metrics.timer).toHaveBeenNthCalledWith(1, "moleculer.request.time", { action : "posts.find", service: "v2.posts", type: "remote", caller: "users.list" });

				expect(handler).toHaveBeenCalledTimes(1);

				expect(broker.metrics.decrement).toHaveBeenCalledTimes(1);
				expect(broker.metrics.decrement).toHaveBeenNthCalledWith(1, "moleculer.request.active", { action : "posts.find", service: "v2.posts",  type: "remote", caller: "users.list" });
			});
		});

		it("should update local request metrics events if handler is rejected", () => {
			const error = new MoleculerError("Something went wrong", 503, "WENT_WRONG", { a: 5 });
			const handler = jest.fn(() => Promise.reject(error));

			broker.metrics.increment.mockClear();
			broker.metrics.decrement.mockClear();
			broker.metrics.timer.mockClear();

			const newHandler = mw.localAction.call(broker, handler, action);
			const ctx = Context.create(broker, endpoint);
			ctx.caller = "users.list";

			return newHandler(ctx).then(protectReject).catch(err => {
				expect(err).toBe(error);

				expect(broker.metrics.increment).toHaveBeenCalledTimes(4);
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.request.total", { action : "posts.find", service: "v2.posts", caller: "users.list", type: "local" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(2, "moleculer.request.active", { action : "posts.find", service: "v2.posts", caller: "users.list", type: "local" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(3, "moleculer.request.levels", { action : "posts.find", service: "v2.posts", caller: "users.list", level: 1 });

				expect(broker.metrics.timer).toHaveBeenCalledTimes(1);
				expect(broker.metrics.timer).toHaveBeenNthCalledWith(1, "moleculer.request.time", { action : "posts.find", service: "v2.posts", caller: "users.list", type: "local" });

				expect(handler).toHaveBeenCalledTimes(1);

				expect(broker.metrics.decrement).toHaveBeenCalledTimes(1);
				expect(broker.metrics.decrement).toHaveBeenNthCalledWith(1, "moleculer.request.active", { action : "posts.find", service: "v2.posts", caller: "users.list", type: "local" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(4, "moleculer.request.error.total", {
					action : "posts.find",
					service: "v2.posts",
					type: "local",
					caller: "users.list",
					errorName: "MoleculerError",
					errorCode: 503,
					errorType: "WENT_WRONG"
				});
			});
		});

		it("should update remote request metrics events if handler is rejected", () => {
			const error = new MoleculerError("Something went wrong", 503, "WENT_WRONG", { a: 5 });
			const handler = jest.fn(() => Promise.reject(error));

			broker.metrics.increment.mockClear();
			broker.metrics.decrement.mockClear();
			broker.metrics.timer.mockClear();

			const newHandler = mw.remoteAction.call(broker, handler, action);
			const ctx = Context.create(broker, endpoint);
			ctx.caller = "users.list";

			return newHandler(ctx).then(protectReject).catch(err => {
				expect(err).toBe(error);

				expect(broker.metrics.increment).toHaveBeenCalledTimes(4);
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.request.total", { action : "posts.find", service: "v2.posts", caller: "users.list", type: "remote" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(2, "moleculer.request.active", { action : "posts.find", service: "v2.posts", caller: "users.list", type: "remote" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(3, "moleculer.request.levels", { action : "posts.find", service: "v2.posts", caller: "users.list", level: 1 });

				expect(broker.metrics.timer).toHaveBeenCalledTimes(1);
				expect(broker.metrics.timer).toHaveBeenNthCalledWith(1, "moleculer.request.time", { action : "posts.find", service: "v2.posts", caller: "users.list", type: "remote" });

				expect(handler).toHaveBeenCalledTimes(1);

				expect(broker.metrics.decrement).toHaveBeenCalledTimes(1);
				expect(broker.metrics.decrement).toHaveBeenNthCalledWith(1, "moleculer.request.active", { action : "posts.find", service: "v2.posts", caller: "users.list", type: "remote" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(4, "moleculer.request.error.total", {
					action : "posts.find",
					service: "v2.posts",
					type: "remote",
					caller: "users.list",
					errorName: "MoleculerError",
					errorCode: 503,
					errorType: "WENT_WRONG"
				});
			});
		});

	});

	describe("Test localEvent", () => {
		const handler = jest.fn(() => Promise.resolve());

		const event = {
			name: "user.created",
			group: "users",
			service
		};

		it("should update event handler metrics events", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();
			broker.metrics.decrement.mockClear();
			broker.metrics.timer.mockClear();

			const newHandler = mw.localEvent.call(broker, handler, event);

			const ctx = Context.create(broker, {}, { a: 5 });
			ctx.eventName = "user.created";
			ctx.eventGroup = "";
			ctx.caller = "posts";

			return newHandler(ctx).catch(protectReject).then(() => {
				expect(broker.metrics.increment).toHaveBeenCalledTimes(2);
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.event.received.total", { event : "user.created", service: "posts",  group: "users", caller: "posts" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(2, "moleculer.event.received.active", { event : "user.created", service: "posts",  group: "users", caller: "posts" });

				expect(broker.metrics.timer).toHaveBeenCalledTimes(1);
				expect(broker.metrics.timer).toHaveBeenNthCalledWith(1, "moleculer.event.received.time", { event : "user.created", service: "posts",  group: "users", caller: "posts" });

				expect(handler).toHaveBeenCalledTimes(1);
				expect(handler).toHaveBeenCalledWith(ctx);

				expect(broker.metrics.decrement).toHaveBeenCalledTimes(1);
				expect(broker.metrics.decrement).toHaveBeenNthCalledWith(1, "moleculer.event.received.active", { event : "user.created", service: "posts",  group: "users", caller: "posts" });
			});
		});

		it("should update event handler metrics events if handler is rejected", () => {
			const error = new MoleculerError("Something went wrong", 503, "WENT_WRONG", { a: 5 });
			const handler = jest.fn(() => Promise.reject(error));

			broker.metrics.increment.mockClear();
			broker.metrics.decrement.mockClear();
			broker.metrics.timer.mockClear();

			const newHandler = mw.localEvent.call(broker, handler, event);

			const ctx = Context.create(broker, {}, { a: 5 });
			ctx.eventName = "user.created";
			ctx.eventGroup = "";
			ctx.caller = "posts";

			return newHandler(ctx).then(protectReject).catch(err => {
				expect(err).toBe(error);

				expect(broker.metrics.increment).toHaveBeenCalledTimes(3);
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.event.received.total", { event : "user.created", service: "posts",  group: "users", caller: "posts" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(2, "moleculer.event.received.active", { event : "user.created", service: "posts",  group: "users", caller: "posts" });

				expect(broker.metrics.timer).toHaveBeenCalledTimes(1);
				expect(broker.metrics.timer).toHaveBeenNthCalledWith(1, "moleculer.event.received.time", { event : "user.created", service: "posts",  group: "users", caller: "posts" });

				expect(handler).toHaveBeenCalledTimes(1);

				expect(broker.metrics.decrement).toHaveBeenCalledTimes(1);
				expect(broker.metrics.decrement).toHaveBeenNthCalledWith(1, "moleculer.event.received.active", { event : "user.created", service: "posts",  group: "users", caller: "posts" });
				expect(broker.metrics.increment).toHaveBeenNthCalledWith(3, "moleculer.event.received.error.total", {
					event : "user.created", service: "posts",  group: "users", caller: "posts",
					errorName: "MoleculerError",
					errorCode: 503,
					errorType: "WENT_WRONG"
				});
			});
		});

		it("should not wrap handler if metrics is disabled", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => false);
			broker.metrics.increment.mockClear();

			const newHandler = mw.localEvent.call(broker, handler, event);

			const ctx = Context.create(broker, {}, { a: 5 });
			ctx.eventName = "user.created";
			ctx.eventGroup = "";

			newHandler(ctx);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(ctx);
		});
	});

	describe("Test emit", () => {
		const handler = jest.fn();

		const event = {
			name: "user.created",
			group: "users",
			service
		};

		it("should update event handler metrics events", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();

			const newHandler = mw.emit.call(broker, handler, event);

			newHandler("user.created", { a: 5 }, ["payment", "mail"]);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.event.emit.total", { event : "user.created" });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("user.created", { a: 5 }, ["payment", "mail"]);
		});

		it("should not wrap handler if metrics is disabled", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => false);
			broker.metrics.increment.mockClear();

			const newHandler = mw.emit.call(broker, handler, event);

			newHandler("user.created", { a: 5 }, ["payment", "mail"]);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("user.created", { a: 5 }, ["payment", "mail"]);
		});
	});

	describe("Test broadcast", () => {
		const handler = jest.fn();

		const event = {
			name: "user.created",
			group: "users",
			service
		};

		it("should update event handler metrics events", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();

			const newHandler = mw.broadcast.call(broker, handler, event);

			newHandler("user.created", { a: 5 }, ["payment", "mail"]);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.event.broadcast.total", { event : "user.created" });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("user.created", { a: 5 }, ["payment", "mail"]);
		});

		it("should not wrap handler if metrics is disabled", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => false);
			broker.metrics.increment.mockClear();

			const newHandler = mw.broadcast.call(broker, handler, event);

			newHandler("user.created", { a: 5 }, ["payment", "mail"]);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("user.created", { a: 5 }, ["payment", "mail"]);
		});
	});

	describe("Test broadcastLocal", () => {
		const handler = jest.fn();

		const event = {
			name: "user.created",
			group: "users",
			service
		};

		it("should update event handler metrics events", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();

			const newHandler = mw.broadcastLocal.call(broker, handler, event);

			newHandler("user.created", { a: 5 }, ["payment", "mail"]);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.event.broadcast-local.total", { event : "user.created" });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("user.created", { a: 5 }, ["payment", "mail"]);
		});

		it("should not wrap handler if metrics is disabled", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => false);
			broker.metrics.increment.mockClear();

			const newHandler = mw.broadcastLocal.call(broker, handler, event);

			newHandler("user.created", { a: 5 }, ["payment", "mail"]);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("user.created", { a: 5 }, ["payment", "mail"]);
		});
	});

	describe("Test transitPublish", () => {
		const handler = jest.fn(() => Promise.resolve);

		const fakeTransit = {
			pendingRequests: {
				size: 3
			},
			pendingReqStreams: {
				size: 1
			},
			pendingResStreams: {
				size: 5
			}
		};

		it("should update metrics values", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();

			const newHandler = mw.transitPublish.call(fakeTransit, handler);

			const packet = { type: "REQUEST" };

			newHandler.call(fakeTransit, packet);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(3);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.transit.publish.total", { type: "REQUEST" });
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(2, "moleculer.transit.requests.active", null, 3);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(3, "moleculer.transit.streams.send.active", null, 6);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(packet);
		});

		it("should not wrap handler if metrics is disabled", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => false);
			broker.metrics.increment.mockClear();

			const newHandler = mw.transitPublish.call(fakeTransit, handler);

			const packet = { type: "REQUEST" };

			newHandler(packet);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(packet);
		});
	});

	describe("Test transitMessageHandler", () => {
		const handler = jest.fn(() => Promise.resolve);

		const fakeTransit = {};

		it("should update metrics values", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();

			const newHandler = mw.transitMessageHandler.call(fakeTransit, handler);

			const packet = {};

			newHandler.call(fakeTransit, "RESPONSE", packet);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.transit.receive.total", { type: "RESPONSE" });

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("RESPONSE", packet);
		});

		it("should not wrap handler if metrics is disabled", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => false);
			broker.metrics.increment.mockClear();

			const newHandler = mw.transitMessageHandler.call(fakeTransit, handler);

			const packet = {};

			newHandler.call(fakeTransit, "RESPONSE", packet);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("RESPONSE", packet);
		});
	});

	describe("Test transporterSend", () => {
		const handler = jest.fn(() => Promise.resolve);

		const fakeTransit = {};

		it("should update metrics values", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();

			const newHandler = mw.transporterSend.call(fakeTransit, handler);

			const data = { length: 200 };
			const meta = { user: "John" };

			newHandler.call(fakeTransit, "MOL-TOPIC", data, meta);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(2);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.transporter.packets.sent.total");
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(2, "moleculer.transporter.packets.sent.bytes", null, 200);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("MOL-TOPIC", data, meta);
		});

		it("should not wrap handler if metrics is disabled", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => false);
			broker.metrics.increment.mockClear();

			const newHandler = mw.transporterSend.call(fakeTransit, handler);

			const data = { length: 200 };
			const meta = { user: "John" };

			newHandler.call(fakeTransit, "MOL-TOPIC", data, meta);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("MOL-TOPIC", data, meta);
		});
	});

	describe("Test transporterReceive", () => {
		const handler = jest.fn(() => Promise.resolve);

		const fakeTransit = {};

		it("should update metrics values", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();

			const newHandler = mw.transporterReceive.call(fakeTransit, handler);

			const data = { length: 200 };
			const s = { user: "John" };

			newHandler.call(fakeTransit, "MOL-TOPIC", data, s);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(2);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.transporter.packets.received.total");
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(2, "moleculer.transporter.packets.received.bytes", null, 200);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("MOL-TOPIC", data, s);
		});

		it("should not wrap handler if metrics is disabled", () => {
			handler.mockClear();
			broker.isMetricsEnabled = jest.fn(() => false);
			broker.metrics.increment.mockClear();

			const newHandler = mw.transporterReceive.call(fakeTransit, handler);

			const data = { length: 200 };
			const s = { user: "John" };

			newHandler.call(fakeTransit, "MOL-TOPIC", data, s);

			expect(broker.metrics.increment).toHaveBeenCalledTimes(0);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith("MOL-TOPIC", data, s);
		});
	});

	/* Moved to CB middleware
	describe("Test circuit breaker event handlers", () => {

		const broker = new ServiceBroker({ nodeID: "server-1", logger: false, metrics: true });
		jest.spyOn(broker.metrics, "register");
		jest.spyOn(broker.metrics, "set");
		jest.spyOn(broker.metrics, "increment");
		jest.spyOn(broker.metrics, "decrement");
		jest.spyOn(broker.metrics, "timer");
		jest.spyOn(broker.localBus, "on");

		it("should update circuit-breaker opened metrics", ()=> {
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();
			broker.metrics.set.mockClear();

			const payload = { nodeID: "server-2", action: "posts.find" };
			broker.localBus.emit("$circuit-breaker.opened", payload);

			expect(broker.metrics.set).toHaveBeenCalledTimes(1);
			expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.circuit-breaker.opened.active", 1, { action: "posts.find", affectedNodeID: "server-2" });

			expect(broker.metrics.increment).toHaveBeenCalledTimes(1);
			expect(broker.metrics.increment).toHaveBeenNthCalledWith(1, "moleculer.circuit-breaker.opened.total", { action: "posts.find", affectedNodeID: "server-2" });
		});

		it("should update circuit-breaker half-opened metrics", ()=> {
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();
			broker.metrics.set.mockClear();

			const payload = { nodeID: "server-2", action: "posts.find" };
			broker.localBus.emit("$circuit-breaker.half-opened", payload);

			expect(broker.metrics.set).toHaveBeenCalledTimes(2);
			expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.circuit-breaker.opened.active", 0, { action: "posts.find", affectedNodeID: "server-2" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(2, "moleculer.circuit-breaker.half-opened.active", 1, { action: "posts.find", affectedNodeID: "server-2" });
		});

		it("should update circuit-breaker closed metrics", ()=> {
			broker.isMetricsEnabled = jest.fn(() => true);
			broker.metrics.increment.mockClear();
			broker.metrics.set.mockClear();

			const payload = { nodeID: "server-2", action: "posts.find" };
			broker.localBus.emit("$circuit-breaker.closed", payload);

			expect(broker.metrics.set).toHaveBeenCalledTimes(2);
			expect(broker.metrics.set).toHaveBeenNthCalledWith(1, "moleculer.circuit-breaker.opened.active", 0, { action: "posts.find", affectedNodeID: "server-2" });
			expect(broker.metrics.set).toHaveBeenNthCalledWith(2, "moleculer.circuit-breaker.half-opened.active", 0, { action: "posts.find", affectedNodeID: "server-2" });
		});
	});
	*/

});
