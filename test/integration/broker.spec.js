const ServiceBroker = require("../../src/service-broker");
const MemoryCacher = require("../../src/cachers/memory");
const FakeTransporter = require("../../src/transporters/fake");
const Context = require("../../src/context");

describe("Test load services", () => {
	let broker = new ServiceBroker();

	it("should create service from schema", () => {
		let handler = jest.fn();
		broker.createService({
			name: "mailer",
			version: 2,
			actions: {
				send: handler
			}
		});

		broker.call("v2.mailer.send").then(() => {
			expect(handler).toHaveBeenCalledTimes(1);
		});

	});


	it("should load all services", () => {
		let count = broker.loadServices("./test/services");
		expect(count).toBe(3);

		expect(broker.getLocalService("posts").name).toBe("posts");
	});
});


describe("Test broker.registerInternalServices", () => {
	let broker = new ServiceBroker({
		nodeID: "server-1",
		statistics: true,
		internalServices: true,
		transporter: new FakeTransporter()
	});

	it.skip("should register $node.stats internal action", () => {
		expect(broker.hasAction("$node.list")).toBe(true);
		expect(broker.hasAction("$node.services")).toBe(true);
		expect(broker.hasAction("$node.actions")).toBe(true);
		expect(broker.hasAction("$node.health")).toBe(true);
		expect(broker.hasAction("$node.stats")).toBe(true);
	});

	broker.loadService("./test/services/math.service");
	broker.loadService("./test/services/post.service");

	it("should return list of actions", () => {
		return broker.call("$node.actions").then(res => {
			expect(res).toEqual([
				{
					"action": {
						"cache": false,
						"name": "$node.list"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "$node.list"
				},
				{
					"action": {
						"cache": false,
						"name": "$node.services",
						"params": {
							"onlyLocal": {
								"optional": true,
								"type": "boolean"
							},
							"skipInternal": {
								"optional": true,
								"type": "boolean"
							},
							"withActions": {
								"optional": true,
								"type": "boolean"
							}
						}
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "$node.services"
				},
				{
					"action": {
						"cache": false,
						"name": "$node.actions",
						"params": {
							"onlyLocal": {
								"optional": true,
								"type": "boolean"
							},
							"skipInternal": {
								"optional": true,
								"type": "boolean"
							},
							"withEndpoints": {
								"optional": true,
								"type": "boolean"
							}
						}
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "$node.actions"
				},
				{
					"action": {
						"cache": false,
						"name": "$node.events",
						"params": {
							"onlyLocal": {
								"optional": true,
								"type": "boolean"
							},
							"skipInternal": {
								"optional": true,
								"type": "boolean"
							},
							"withEndpoints": {
								"optional": true,
								"type": "boolean"
							}
						}
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "$node.events"
				},
				{
					"action": {
						"cache": false,
						"name": "$node.health"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "$node.health"
				},
				{
					"action": {
						"cache": false,
						"name": "$node.stats"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "$node.stats"
				},
				{
					"action": {
						"cache": false,
						"name": "math.add"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "math.add"
				},
				{
					"action": {
						"cache": false,
						"name": "math.sub"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "math.sub"
				},
				{
					"action": {
						"cache": false,
						"name": "math.mult",
						"params": {
							"a": {
								"type": "number"
							},
							"b": {
								"type": "number"
							}
						}
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "math.mult"
				},
				{
					"action": {
						"cache": false,
						"name": "math.div"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "math.div"
				},
				{
					"action": {
						"cache": true,
						"name": "posts.find"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "posts.find"
				},
				{
					"action": {
						"cache": false,
						"name": "posts.delayed"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "posts.delayed"
				},
				{
					"action": {
						"cache": {
							"keys": [
								"id"
							]
						},
						"name": "posts.get"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "posts.get"
				},
				{
					"action": {
						"cache": false,
						"name": "posts.author"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "posts.author"
				}
			]);
		});
	});

	it.skip("should return list of services", () => {
		let service = {
			name: "math",
			settings: {}
		};
		broker.registerRemoteService("node-3", service);
		broker.registerAction("node-3", {
			name: "math.pow",
			cache: true,
			service
		});

		return broker.call("$node.services", { withActions: true }).then(res => {
			expect(res).toEqual([{
				"actions": {
					"$node.actions": {
						"cache": false,
						"name": "$node.actions",
						"params": {
							"onlyLocal": {
								"optional": true,
								"type": "boolean"
							},
							"skipInternal": {
								"optional": true,
								"type": "boolean"
							},
							"withEndpoints": {
								"optional": true,
								"type": "boolean"
							}
						},
						"version": undefined
					},
					"$node.health": {
						"cache": false,
						"name": "$node.health",
						"version": undefined
					},
					"$node.list": {
						"cache": false,
						"name": "$node.list",
						"version": undefined
					},
					"$node.services": {
						"cache": false,
						"name": "$node.services",
						"params": {
							"onlyLocal": {
								"optional": true,
								"type": "boolean"
							},
							"skipInternal": {
								"optional": true,
								"type": "boolean"
							},
							"withActions": {
								"optional": true,
								"type": "boolean"
							}
						},
						"version": undefined
					},
					"$node.stats": {
						"cache": false,
						"name": "$node.stats",
						"version": undefined
					}
				},
				"name": "$node",
				"nodes": [
					"server-1"
				],
				"settings": {},
				"version": undefined
			},
			{
				"actions": {
					"math.add": {
						"cache": false,
						"name": "math.add",
						"version": undefined
					},
					"math.div": {
						"cache": false,
						"name": "math.div",
						"version": undefined
					},
					"math.mult": {
						"cache": false,
						"name": "math.mult",
						"params": {
							"a": {
								"type": "number"
							},
							"b": {
								"type": "number"
							}
						},
						"version": undefined
					},
					"math.pow": {
						"cache": true,
						"name": "math.pow"
					},
					"math.sub": {
						"cache": false,
						"name": "math.sub",
						"version": undefined
					}
				},
				"name": "math",
				"nodes": [
					"server-1",
					"node-3"
				],
				"settings": {},
				"version": undefined
			},
			{
				"actions": {
					"posts.author": {
						"cache": false,
						"name": "posts.author",
						"version": undefined
					},
					"posts.delayed": {
						"cache": false,
						"name": "posts.delayed",
						"version": undefined
					},
					"posts.find": {
						"cache": true,
						"name": "posts.find",
						"version": undefined
					},
					"posts.get": {
						"cache": {
							"keys": [
								"id"
							]
						},
						"name": "posts.get",
						"version": undefined
					}
				},
				"name": "posts",
				"nodes": [
					"server-1"
				],
				"settings": {},
				"version": undefined
			}]);
		});
	});

	it("should return health of node", () => {
		return broker.call("$node.health").then(res => {
			expect(res).toBeDefined();
			expect(res.cpu).toBeDefined();
			expect(res.mem).toBeDefined();
			expect(res.net).toBeDefined();
			expect(res.os).toBeDefined();
			expect(res.process).toBeDefined();
			expect(res.time).toBeDefined();
		});
	});

	it("should return statistics of node", () => {
		return broker.call("$node.stats").then(res => {
			expect(res).toBeDefined();
			expect(res.requests).toBeDefined();
		});
	});

	it.skip("should return list of remote nodes", () => {
		let info = {
			nodeID: "server-2",
			services: []
		};
		broker.registry.nodes.processNodeInfo(info.nodeID, info);

		return broker.call("$node.list").then(res => {
			expect(res).toBeInstanceOf(Array);
			expect(res.length).toBe(2);
			expect(res[0].id).toBe("server-1");
			expect(res[0].local).toBe(true);
			//expect(res[0].services.length).toBe(3);
			expect(res[1]).toEqual({"services": [], "available": true, "id": "server-2", "lastHeartbeatTime": jasmine.any(Number), "nodeID": "server-2"});
		});
	});

});

describe("Test local call", () => {

	let broker = new ServiceBroker({ metrics: true });

	let actionHandler = jest.fn(ctx => ctx);

	broker.createService({
		name: "posts",
		actions: {
			find: actionHandler
		}
	});

	it("should return context & call the action handler", () => {
		return broker.call("posts.find").then(ctx => {
			expect(ctx).toBeDefined();
			expect(ctx.broker).toBe(broker);
			expect(ctx.action.name).toBe("posts.find");
			expect(ctx.nodeID).toBe(broker.nodeID);
			expect(ctx.params).toBeDefined();
			expect(actionHandler).toHaveBeenCalledTimes(1);
			expect(actionHandler).toHaveBeenCalledWith(ctx);
		});
	});

	it("should set params to context", () => {
		let params = { a: 1 };
		return broker.call("posts.find", params).then(ctx => {
			expect(ctx.params).toEqual({ a: 1});
		});
	});

	it("should create a sub context of parent context", () => {
		let parentCtx = new Context();
		parentCtx.params = {
			a: 5,
			b: 2
		};
		parentCtx.meta = {
			user: "John",
			roles: ["user"],
			status: true
		};

		let params = { a: 1 };
		let meta = {
			user: "Jane",
			roles: ["admin"],
			verified: true
		};
		parentCtx.metrics = true;
		parentCtx.requestID = "12345";

		return broker.call("posts.find", params, { parentCtx, meta }).then(ctx => {
			expect(ctx.id).not.toBe(parentCtx.id);
			expect(ctx.params).toBe(params);
			expect(ctx.meta).toEqual({ user: "Jane", roles: ["admin"], status: true, verified: true });
			expect(ctx.level).toBe(2);
			expect(ctx.metrics).toBe(true);
			expect(ctx.parentID).toBe(parentCtx.id);
			expect(ctx.requestID).toBe("12345");
		});

	});
});


describe("Test versioned action registration", () => {

	let broker = new ServiceBroker();

	let findV1 = jest.fn(ctx => ctx);
	let findV2 = jest.fn(ctx => ctx);

	broker.createService({
		name: "posts",
		version: 1,

		actions: {
			find: findV1
		}
	});

	broker.createService({
		name: "posts",
		version: 2,

		actions: {
			find: findV2
		}
	});

	it("should call the v1 handler", () => {
		return broker.call("v1.posts.find").then(() => {
			expect(findV1).toHaveBeenCalledTimes(1);
		});
	});

	it("should call the v2 handler", () => {
		return broker.call("v2.posts.find").then(() => {
			expect(findV2).toHaveBeenCalledTimes(1);
		});
	});

});




describe("Test cachers", () => {

	let broker = new ServiceBroker({
		cacher: new MemoryCacher()
	});

	let handler = jest.fn(() => "Action result");

	broker.createService({
		name: "user",
		actions: {
			get: {
				cache: true,
				handler
			},

			save(ctx) {
				ctx.emit("cache.clean");
			}
		}
	});

	it("should call action handler because the cache is empty", () => {
		return broker.call("user.get").then(res => {
			expect(res).toBe("Action result");
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	it("should NOT call action handler because the cache is loaded", () => {
		handler.mockClear();

		return broker.call("user.get").then(res => {
			expect(res).toBe("Action result");
			expect(handler).toHaveBeenCalledTimes(0);
		});
	});

	it("clear the cache with `save` action", () => {
		handler.mockClear();

		return broker.call("user.save").then(() => {
			expect(handler).toHaveBeenCalledTimes(0);
		});
	});

	it("should NOT call action handler because the cache is loaded", () => {
		handler.mockClear();

		return broker.call("user.get").then(res => {
			expect(res).toBe("Action result");
			expect(handler).toHaveBeenCalledTimes(0);
		});
	});

});

