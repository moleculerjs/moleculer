"use strict";

let Context = require("../../../src/context");
let Strategy = require("../../../src/strategies").RoundRobin;
let CpuStrategy = require("../../../src/strategies").CpuUsage;
let EventCatalog = require("../../../src/registry/event-catalog");
let EndpointList = require("../../../src/registry/endpoint-list");
let EventEndpoint = require("../../../src/registry/endpoint-event");
let ServiceBroker = require("../../../src/service-broker");
const { protectReject } = require("../utils");

describe("Test EventCatalog constructor", () => {
	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	it("test without CB", () => {
		let catalog = new EventCatalog(registry, broker, Strategy);

		expect(catalog).toBeDefined();
		expect(catalog.registry).toBe(registry);
		expect(catalog.broker).toBe(broker);
		expect(catalog.logger).toBe(registry.logger);
		expect(catalog.StrategyFactory).toBe(Strategy);
		expect(catalog.events).toBeInstanceOf(Array);
		expect(catalog.EndpointFactory).toBe(EventEndpoint);
	});
});

describe("Test EventCatalog methods", () => {
	let broker = new ServiceBroker({ logger: false });
	let catalog = new EventCatalog(broker.registry, broker, Strategy);
	let list;
	let service = { name: "test" };

	it("should create an EndpointList and add to 'events'", () => {
		let node = { id: "server-1" };
		let event = { name: "hello" };

		expect(catalog.events.length).toBe(0);

		list = catalog.add(node, service, event);

		expect(catalog.events.length).toBe(1);
		expect(list).toBeInstanceOf(EndpointList);
		expect(list.group).toBe(service.name);
	});

	it("should not create a new EndpointList just add new node", () => {
		let node = { id: "server-2" };
		let event = { name: "hello" };

		list.add = jest.fn();

		let res = catalog.add(node, service, event);

		expect(catalog.events.length).toBe(1);
		expect(res).toBe(list);

		expect(list.add).toHaveBeenCalledTimes(1);
		expect(list.add).toHaveBeenCalledWith(node, service, event);
	});

	it("should return the list", () => {
		expect(catalog.get("hello", "test")).toBe(list);
		expect(catalog.get("hello", "other")).toBeUndefined();
		expect(catalog.get("nothing", "test")).toBeUndefined();
	});

	it("should call list.removeByNodeID", () => {
		list.removeByNodeID = jest.fn();

		catalog.remove("hello", "server-2");
		expect(list.removeByNodeID).toHaveBeenCalledTimes(1);
		expect(list.removeByNodeID).toHaveBeenCalledWith("server-2");

		list.removeByNodeID.mockClear();
		catalog.remove("not-found", "server-2");
		expect(list.removeByNodeID).toHaveBeenCalledTimes(0);
	});

	it("should call list.removeByService", () => {
		let service2 = { name: "echo" };
		let list2 = catalog.add(broker.registry.nodes.localNode, service2, {
			name: "echo.reply",
			cache: true
		});

		list.removeByService = jest.fn();
		list2.removeByService = jest.fn();

		catalog.removeByService(service2);
		expect(list.removeByService).toHaveBeenCalledTimes(1);
		expect(list.removeByService).toHaveBeenCalledWith(service2);
		expect(list2.removeByService).toHaveBeenCalledTimes(1);
		expect(list2.removeByService).toHaveBeenCalledWith(service2);
	});

	it("should return with event list", () => {
		let res = catalog.list({});
		expect(res).toEqual([
			{
				event: {
					name: "hello"
				},
				available: true,
				count: 1,
				group: "test",
				hasLocal: false,
				name: "hello"
			},
			{
				event: {
					name: "echo.reply",
					cache: true
				},
				available: true,
				count: 1,
				group: "echo",
				hasLocal: true,
				name: "echo.reply"
			}
		]);

		res = catalog.list({ withEndpoints: true });
		expect(res).toEqual([
			{
				event: {
					name: "hello"
				},
				available: true,
				count: 1,
				endpoints: [
					{
						available: undefined,
						nodeID: "server-1",
						state: true
					}
				],
				group: "test",
				hasLocal: false,
				name: "hello"
			},
			{
				event: {
					name: "echo.reply",
					cache: true
				},
				available: true,
				count: 1,
				endpoints: [
					{
						available: true,
						nodeID: broker.registry.nodes.localNode.id,
						state: true
					}
				],
				group: "echo",
				hasLocal: true,
				name: "echo.reply"
			}
		]);

		res = catalog.list({ onlyLocal: true, skipInternal: true });
		expect(res).toEqual([
			{
				available: true,
				count: 1,
				event: {
					cache: true,
					name: "echo.reply"
				},
				group: "echo",
				hasLocal: true,
				name: "echo.reply"
			}
		]);

		catalog.get("hello", "test").hasAvailable = jest.fn(() => false);
		res = catalog.list({ onlyAvailable: true });
		expect(res).toEqual([
			{
				event: {
					name: "echo.reply",
					cache: true
				},
				available: true,
				count: 1,
				group: "echo",
				hasLocal: true,
				name: "echo.reply"
			}
		]);
	});
});

describe("Test EventCatalog.getBalancedEndpoints & getAllEndpoints", () => {
	let broker = new ServiceBroker({ logger: false });
	let catalog = new EventCatalog(broker.registry, broker, Strategy);

	let event1 = { name: "user.created" };
	let event2 = { name: "user.*" };
	let event3 = { name: "post.created" };

	catalog.add({ id: "node-1" }, { name: "users" }, event1);
	catalog.add({ id: "node-1" }, { name: "payment" }, event1);
	catalog.add({ id: "node-2" }, { name: "users" }, event1);
	catalog.add({ id: "node-2" }, { name: "payment" }, event1);
	catalog.add({ id: "node-2" }, { name: "mail" }, event2);
	catalog.add({ id: "node-3" }, { name: "mail" }, event2);
	catalog.add({ id: "node-3" }, { name: "posts" }, event3);
	catalog.add({ id: "node-4" }, { name: "posts" }, event3);
	catalog.add({ id: "node-4" }, { name: "users" }, event1);

	it("should return balanced endpoint list for 'user.created'", () => {
		const ctx = Context.create(broker, null);

		expect(catalog.events.length).toBe(4);

		let res = catalog.getBalancedEndpoints("user.created", null, ctx);

		expect(res.length).toBe(3);
		expect(res[0][0].id).toEqual("node-1");
		expect(res[0][1]).toEqual("users");

		expect(res.length).toBe(3);
		expect(res[1][0].id).toEqual("node-1");
		expect(res[1][1]).toEqual("payment");

		expect(res.length).toBe(3);
		expect(res[2][0].id).toEqual("node-2");
		expect(res[2][1]).toEqual("mail");
	});

	it("should return balanced endpoint list for 'user.updated'", () => {
		const ctx = Context.create(broker, null);

		expect(catalog.events.length).toBe(4);

		let res = catalog.getBalancedEndpoints("user.updated", null, ctx);

		expect(res.length).toBe(1);
		expect(res[0][0].id).toEqual("node-3");
		expect(res[0][1]).toEqual("mail");
	});

	it("should return balanced endpoint list for 'user.created' on group 'payment'", () => {
		const ctx = Context.create(broker, null);

		expect(catalog.events.length).toBe(4);

		let res = catalog.getBalancedEndpoints("user.created", "payment", ctx);

		expect(res.length).toBe(1);
		expect(res[0][0].id).toEqual("node-2");
		expect(res[0][1]).toEqual("payment");
	});

	it("should return all endpoint", () => {
		let res = catalog.getAllEndpoints("user.created");

		expect(res.length).toBe(4);
		expect(res[0].id).toEqual("node-1");
		expect(res[1].id).toEqual("node-2");
		expect(res[2].id).toEqual("node-4");
		expect(res[3].id).toEqual("node-3");
	});

	it("should return all endpoint with groups", () => {
		let res = catalog.getAllEndpoints("user.created", ["mail"]);

		expect(res.length).toBe(2);
		expect(res[0].id).toEqual("node-2");
		expect(res[1].id).toEqual("node-3");
	});

	it("should return all endpoint with matches", () => {
		let res = catalog.getAllEndpoints("user.removed");

		expect(res.length).toBe(2);
		expect(res[0].id).toEqual("node-2");
		expect(res[1].id).toEqual("node-3");
	});

	it("should return empty list with matches", () => {
		let res = catalog.getAllEndpoints("posts.created");

		expect(res.length).toBe(0);
	});
});

describe("Test getGroups", () => {
	let broker = new ServiceBroker({ logger: false, nodeID: "node-2" });
	let catalog = new EventCatalog(broker.registry, broker, Strategy);

	let usersEvent = { name: "user.created", handler: jest.fn() };
	let paymentEvent = { name: "user.created", handler: jest.fn() };
	let mailEvent = { name: "user.*", handler: jest.fn() };

	catalog.add({ id: "node-1" }, { name: "users" }, usersEvent);
	catalog.add({ id: "node-1" }, { name: "payment" }, paymentEvent);
	catalog.add({ id: "node-2" }, { name: "users" }, usersEvent);
	catalog.add({ id: "node-2" }, { name: "payment" }, paymentEvent);
	catalog.add({ id: "node-2" }, { name: "mail" }, mailEvent);
	catalog.add({ id: "node-3" }, { name: "mail" }, mailEvent);

	it("should collect groups for event 'user.created'", () => {
		expect(catalog.getGroups("user.created")).toEqual(["users", "payment", "mail"]);
		expect(catalog.getGroups("user.removed")).toEqual(["mail"]);
		expect(catalog.getGroups("posts.created")).toEqual([]);
	});
});

describe("Test EventCatalog.emitLocalServices", () => {
	let broker = new ServiceBroker({ logger: false, nodeID: "node-1" });
	let catalog = new EventCatalog(broker.registry, broker, Strategy);

	catalog.callEventHandler = jest.fn();

	let usersEvent = { name: "user.created", desc: "usersEvent", handler: jest.fn() };
	let paymentEvent = { name: "user.created", desc: "paymentEvent", handler: jest.fn() };
	let mailEvent = { name: "user.*", desc: "mailEvent", handler: jest.fn() };
	let otherEvent = {
		name: "user.created",
		group: "payment",
		desc: "otherEvent",
		handler: jest.fn()
	};

	catalog.add({ id: "node-1" }, { name: "users" }, usersEvent);
	catalog.add({ id: "node-1" }, { name: "payment" }, paymentEvent);
	catalog.add({ id: "node-1" }, { name: "other" }, otherEvent);
	catalog.add({ id: "node-1" }, { name: "mail" }, mailEvent);

	it("should broadcast local handlers without groups", () => {
		expect(catalog.events.length).toBe(3);

		const ctx = Context.create(broker, { id: "node-99", event: { name: "user.*" } }, { a: 5 });
		ctx.eventName = "user.created";
		ctx.eventGroups = null;
		ctx.eventType = "broadcast";
		jest.spyOn(ctx, "copy");

		catalog.emitLocalServices(ctx);

		expect(catalog.callEventHandler).toHaveBeenCalledTimes(4);
		expect(catalog.callEventHandler).toHaveBeenCalledWith(expect.any(Context));

		let copied = catalog.callEventHandler.mock.calls[0][0];
		expect(copied.event).toEqual({
			name: "user.created",
			desc: "usersEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(null);
		expect(copied.nodeID).toEqual("node-99");

		copied = catalog.callEventHandler.mock.calls[1][0];
		expect(copied.event).toEqual({
			name: "user.created",
			desc: "paymentEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(null);
		expect(copied.nodeID).toEqual("node-99");

		copied = catalog.callEventHandler.mock.calls[2][0];
		expect(copied.event).toEqual({
			name: "user.created",
			group: "payment",
			desc: "otherEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(null);
		expect(copied.nodeID).toEqual("node-99");

		copied = catalog.callEventHandler.mock.calls[3][0];
		expect(copied.event).toEqual({
			name: "user.*",
			desc: "mailEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(null);
		expect(copied.nodeID).toEqual("node-99");

		expect(ctx.copy).toHaveBeenCalledTimes(4);
	});

	it("should broadcast local handlers with groups", () => {
		catalog.callEventHandler.mockClear();

		const ctx = Context.create(broker, { id: "node-99", event: { name: "user.*" } }, { a: 5 });
		ctx.eventName = "user.created";
		ctx.eventGroups = ["mail", "payment"];
		ctx.eventType = "broadcast";
		jest.spyOn(ctx, "copy");

		catalog.emitLocalServices(ctx);

		expect(catalog.callEventHandler).toHaveBeenCalledTimes(3);
		expect(catalog.callEventHandler).toHaveBeenCalledWith(expect.any(Context));

		let copied = catalog.callEventHandler.mock.calls[0][0];
		expect(copied.event).toEqual({
			name: "user.created",
			desc: "paymentEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(["mail", "payment"]);
		expect(copied.nodeID).toEqual("node-99");

		copied = catalog.callEventHandler.mock.calls[1][0];
		expect(copied.event).toEqual({
			name: "user.created",
			group: "payment",
			desc: "otherEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(["mail", "payment"]);
		expect(copied.nodeID).toEqual("node-99");

		copied = catalog.callEventHandler.mock.calls[2][0];
		expect(copied.event).toEqual({
			name: "user.*",
			desc: "mailEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(["mail", "payment"]);
		expect(copied.nodeID).toEqual("node-99");

		expect(ctx.copy).toHaveBeenCalledTimes(3);
	});

	it("should balance local handlers without groups", () => {
		catalog.callEventHandler.mockClear();

		const ctx = Context.create(broker, { id: "node-99", event: { name: "user.*" } }, { a: 5 });
		ctx.eventName = "user.created";
		ctx.eventGroups = null;
		ctx.eventType = "emit";
		jest.spyOn(ctx, "copy");

		catalog.emitLocalServices(ctx);

		expect(catalog.callEventHandler).toHaveBeenCalledTimes(3);
		expect(catalog.callEventHandler).toHaveBeenCalledWith(expect.any(Context));

		let copied = catalog.callEventHandler.mock.calls[0][0];
		expect(copied.event).toEqual({
			name: "user.created",
			desc: "usersEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(null);
		expect(copied.nodeID).toEqual("node-99");

		copied = catalog.callEventHandler.mock.calls[1][0];
		expect(copied.event).toEqual({
			name: "user.created",
			desc: "paymentEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(null);
		expect(copied.nodeID).toEqual("node-99");

		copied = catalog.callEventHandler.mock.calls[2][0];
		expect(copied.event).toEqual({
			name: "user.*",
			desc: "mailEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(null);
		expect(copied.nodeID).toEqual("node-99");

		expect(ctx.copy).toHaveBeenCalledTimes(3);
	});

	it("should balance local handlers with groups", () => {
		catalog.callEventHandler.mockClear();

		const ctx = Context.create(broker, { id: "node-99", event: { name: "user.*" } }, { a: 5 });
		ctx.eventName = "user.created";
		ctx.eventGroups = ["mail", "payment"];
		ctx.eventType = "emit";
		jest.spyOn(ctx, "copy");

		catalog.emitLocalServices(ctx);

		expect(catalog.callEventHandler).toHaveBeenCalledTimes(2);
		expect(catalog.callEventHandler).toHaveBeenCalledWith(expect.any(Context));

		let copied = catalog.callEventHandler.mock.calls[0][0];
		expect(copied.event).toEqual({
			name: "user.created",
			desc: "otherEvent",
			group: "payment",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(["mail", "payment"]);
		expect(copied.nodeID).toEqual("node-99");

		copied = catalog.callEventHandler.mock.calls[1][0];
		expect(copied.event).toEqual({
			name: "user.*",
			desc: "mailEvent",
			handler: expect.any(Function)
		});
		expect(copied.eventGroups).toEqual(["mail", "payment"]);
		expect(copied.nodeID).toEqual("node-99");

		expect(ctx.copy).toHaveBeenCalledTimes(2);
	});
});

describe("Test EventCatalog.callEventHandler", () => {
	const errorHandler = jest.fn();
	let broker = new ServiceBroker({ logger: false, nodeID: "node-1", errorHandler });
	let catalog = new EventCatalog(broker.registry, broker, Strategy);

	const ctx = Context.create(broker, { id: "node-99", event: { name: "user.*" } }, { a: 5 });
	ctx.eventName = "user.created";
	ctx.eventGroups = ["mail", "payment"];
	ctx.eventType = "emit";

	it("should add catch handler to result", () => {
		let resolver;
		ctx.endpoint.event.handler = jest.fn(() => new Promise(res => (resolver = res)));

		const p = catalog.callEventHandler(ctx);

		expect(ctx.endpoint.event.handler).toHaveBeenCalledTimes(1);
		expect(ctx.endpoint.event.handler).toHaveBeenCalledWith(ctx);

		expect(errorHandler).toHaveBeenCalledTimes(0);

		resolver();

		return p;
	});

	it("should catch error", () => {
		let rejecter;
		ctx.endpoint.event.handler = jest.fn(() => new Promise((res, rej) => (rejecter = rej)));
		broker.logger.error = jest.fn();

		const p = catalog.callEventHandler(ctx);

		expect(ctx.endpoint.event.handler).toHaveBeenCalledTimes(1);
		expect(ctx.endpoint.event.handler).toHaveBeenCalledWith(ctx);

		const err = new Error("Something went wrong");
		rejecter(err);

		return p.then(protectReject).catch(e => {
			expect(e).toBe(err);
		});
	});
});

describe("Test EventCatalog add method", () => {
	let broker = new ServiceBroker({ logger: false });
	let catalog = new EventCatalog(broker.registry, broker, Strategy);
	let list;
	let service = { name: "test" };

	it("should create an EndpointList and add to 'events'", () => {
		let node = { id: "server-1" };
		let event = { name: "hello" };

		list = catalog.add(node, service, event);

		expect(list).toBeInstanceOf(EndpointList);
		expect(list.strategy).toBeInstanceOf(Strategy);
		expect(list.strategy.opts).toEqual({});
	});

	it("should create an EndpointList with custom strategy", () => {
		let node = { id: "server-1" };
		let event = { name: "welcome", strategy: "CpuUsage", strategyOptions: { sampleCount: 6 } };

		list = catalog.add(node, service, event);

		expect(list).toBeInstanceOf(EndpointList);
		expect(list.strategy).toBeInstanceOf(CpuStrategy);
		expect(list.strategy.opts).toEqual({ sampleCount: 6, lowCpuUsage: 10 });
	});
});
