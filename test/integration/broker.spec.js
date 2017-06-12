const Promise = require("bluebird");
const ServiceBroker = require("../../src/service-broker");
const MemoryCacher = require("../../src/cachers/memory");
const FakeTransporter = require("../../src/transporters/fake");
const Context = require("../../src/context");
const utils = require("../../src/utils");

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

		expect(broker.hasAction("v2.mailer.send")).toBe(true);

		broker.call("v2.mailer.send").then(() => {
			expect(handler).toHaveBeenCalledTimes(1);
		});

	});


	it("should load all services", () => {
		let count = broker.loadServices("./test/services");
		expect(count).toBe(3);

		expect(broker.hasAction("math.add")).toBe(true);
		expect(broker.hasAction("users.get")).toBe(true);

		expect(broker.getService("posts").name).toBe("posts");
	});
});


describe("Test broker.registerInternalActions", () => {
	let broker = new ServiceBroker({
		statistics: true,
		internalActions: true,
		nodeID: "server-1",
		transporter: new FakeTransporter()
	});

	it("should register $node.stats internal action", () => {
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
						"name": "$node.services"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "$node.services"
				},
				{
					"action": {
						"cache": false,
						"name": "$node.actions"
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "$node.actions"
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
						"name": "math.add",
						"version": undefined
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "math.add"
				},
				{
					"action": {
						"cache": false,
						"name": "math.sub",
						"version": undefined
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
						},
						"version": undefined
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "math.mult"
				},
				{
					"action": {
						"cache": false,
						"name": "math.div",
						"version": undefined
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "math.div"
				},
				{
					"action": {
						"cache": true,
						"name": "posts.find",
						"version": undefined
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "posts.find"
				},
				{
					"action": {
						"cache": false,
						"name": "posts.delayed",
						"version": undefined
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
						"name": "posts.get",
						"version": undefined
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "posts.get"
				},
				{
					"action": {
						"cache": false,
						"name": "posts.author",
						"version": undefined
					},
					"available": true,
					"count": 1,
					"hasLocal": true,
					"name": "posts.author"
				}
			]);
		});
	});

	it("should return list of services", () => {
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
						"name": "$node.actions"
					},
					"$node.health": {
						"cache": false,
						"name": "$node.health"
					},
					"$node.list": {
						"cache": false,
						"name": "$node.list"
					},
					"$node.services": {
						"cache": false,
						"name": "$node.services"
					},
					"$node.stats": {
						"cache": false,
						"name": "$node.stats"
					}
				},
				"name": "$node",
				"nodes": [null],
				"settings": {},
				"version": undefined
			}, {
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
						"name": "math.pow",
					},
					"math.sub": {
						"cache": false,
						"name": "math.sub",
						"version": undefined
					}
				},
				"name": "math",
				"nodes": [null, "node-3"],
				"settings": {},
				"version": undefined
			}, {
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
							"keys": ["id"]
						},
						"name": "posts.get",
						"version": undefined
					}
				},
				"name": "posts",
				"nodes": [null],
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

	it("should return list of remote nodes", () => {
		let info = {
			nodeID: "server-2",
			services: []
		};
		broker.transit.processNodeInfo(info.nodeID, info);

		return broker.call("$node.list").then(res => {
			expect(res).toBeInstanceOf(Array);
			expect(res.length).toBe(2);
			expect(res[0].id).toBeNull();
			expect(res[0].services.length).toBe(3);
			expect(res[1]).toEqual({"services": [], "available": true, "id": "server-2", "lastHeartbeatTime": jasmine.any(Number), "nodeID": "server-2"});
		});
	});

});

describe("Test on/once/off event emitter", () => {

	let broker = new ServiceBroker();
	let handler = jest.fn();

	it("register event handler", () => {
		broker.on("test.event.**", handler);

		broker.emitLocal("test");
		expect(handler).toHaveBeenCalledTimes(0);

		let p = { a: 5 };
		broker.emitLocal("test.event", p);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(p, undefined);

		broker.emitLocal("test.event.demo", "data");
		expect(handler).toHaveBeenCalledTimes(2);
		expect(handler).toHaveBeenCalledWith("data", undefined);
	});

	it("unregister event handler", () => {
		handler.mockClear();
		broker.off("test.event.**", handler);

		broker.emitLocal("test");
		broker.emitLocal("test.event");
		broker.emitLocal("test.event.demo");
		expect(handler).toHaveBeenCalledTimes(0);
	});

	it("register once event handler", () => {
		handler.mockClear();
		broker.once("request", handler);

		broker.emitLocal("request");
		expect(handler).toHaveBeenCalledTimes(1);

		broker.emitLocal("request");
		expect(handler).toHaveBeenCalledTimes(1);
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
			expect(ctx.nodeID).toBeNull();
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
			roles: ["user"]
		};		

		let params = { a: 1 };
		let meta = {
			user: "Jane",
			roles: ["admin"]
		};
		parentCtx.metrics = true;

		return broker.call("posts.find", params, { parentCtx, meta }).then(ctx => {
			expect(ctx.params).toBe(params);
			expect(ctx.meta).toEqual({ user: "Jane", roles: ["admin"] });
			expect(ctx.level).toBe(2);
			expect(ctx.parentID).toBe(parentCtx.id);
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

	it("should return with the correct action", () => {
		expect(broker.hasAction("v1.posts.find")).toBe(true);
		expect(broker.hasAction("v2.posts.find")).toBe(true);

		expect(broker.hasAction("v3.posts.find")).toBe(false);
	});

	it("should call the v1 handler", () => {
		return broker.call("v1.posts.find").then(ctx => {
			expect(findV1).toHaveBeenCalledTimes(1);
		});
	});

	it("should call the v2 handler", () => {
		return broker.call("v2.posts.find").then(ctx => {
			expect(findV2).toHaveBeenCalledTimes(1);
		});
	});
		
});

describe("Test middleware system", () => {

	describe("Test with sync & async middlewares", () => {
		let flow = [];
		let mw1Sync = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;		
				});
			};
		};

		let mw2Async = handler => {
			return ctx => {
				flow.push("B2");
				return new Promise(resolve => {
					setTimeout(() => {
						flow.push("B2P");
						resolve();
					}, 10);
				}).then(() => {
					return handler(ctx);
				}).then(res => {
					flow.push("A2");
					return res;
				});		
			};
		};

		let broker = new ServiceBroker({ validation: false });
		broker.use(mw2Async);
		broker.use(mw1Sync);

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };
		});

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});
		
		it("should register plugins", () => {
			expect(broker.middlewares.length).toBe(2);
		});

		it("should call all middlewares functions & master", () => {
			let p = broker.call("test.foo");		
			expect(utils.isPromise(p)).toBe(true);
			return p.then(res => {
				expect(res).toEqual({ user: "icebob" });
				expect(master).toHaveBeenCalledTimes(1);

				expect(flow.join("-")).toBe("B1-B2-B2P-MASTER-A2-A1");
			});
		});	
	});

	describe("Test with SYNC break", () => {
		let flow = [];
		let mw1 = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;		
				});
			};
		};

		let mw2 = handler => {
			return ctx => {
				flow.push("B2");
				// Don't call handler, break the chain
				return Promise.resolve({ user: "bobcsi" });
			};
		};

		let mw3 = handler => {
			return ctx => {
				flow.push("B3");
				return handler(ctx).then(res => {
					flow.push("A3");
					return res;		
				});
			};
		};

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };
		});

		let broker = new ServiceBroker({ validation: false });
		broker.use(mw3, mw2, mw1);

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});
		
		it("should register plugins", () => {
			expect(broker.middlewares.length).toBe(3);
		});	

		it("should call only mw1 & mw2 middlewares functions", () => {
			let p = broker.call("test.foo");		
			expect(utils.isPromise(p)).toBe(true);
			return p.then(res => {
				expect(res).toEqual({ user: "bobcsi" });
				expect(master).toHaveBeenCalledTimes(0);
				expect(flow.join("-")).toBe("B1-B2-A1");
			});
		});
	});

	describe("Test middleware system with ASYNC break", () => {
		let flow = [];
		let mw1 = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;		
				});
			};
		};

		let mw2 = handler => {
			return ctx => {
				flow.push("B2");
				return new Promise(resolve => {
					setTimeout(() => {
						flow.push("B2P");
						resolve({ user: "bobcsi" });
					}, 10);				
				});
			};
		};

		let mw3 = handler => {
			return ctx => {
				flow.push("B3");
				return handler(ctx).then(res => {
					flow.push("A3");
					return res;		
				});
			};
		};

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };

		});

		let broker = new ServiceBroker({ validation: false });
		broker.use(mw3, mw2, mw1);

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});
		
		it("should register plugins", () => {
			expect(broker.middlewares.length).toBe(3);
		});	

		it("should call only mw1 & mw2 middlewares functions", () => {
			let p = broker.call("test.foo");		
			expect(utils.isPromise(p)).toBe(true);
			return p.then(res => {
				expect(res).toEqual({ user: "bobcsi" });
				expect(master).toHaveBeenCalledTimes(0);
				expect(flow.join("-")).toBe("B1-B2-B2P-A1");
			});
		});
	});

	describe("Test with Error", () => {
		let flow = [];
		let mw1 = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;		
				});
			};
		};

		let mw2 = handler => {
			return ctx => {
				flow.push("B2");
				return Promise.reject(new Error("Something happened in mw2"));
			};
		};

		let master = jest.fn(() => {
			return new Promise(resolve => {
				flow.push("MASTER");
				resolve({ user: "icebob" });
			});
		});

		let broker = new ServiceBroker({ validation: false });
		broker.use(mw2, mw1);

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});

		it("should call only mw1 & mw2 middlewares functions", () => {
			let p = broker.call("test.foo");		
			expect(utils.isPromise(p)).toBe(true);
			return p.catch(err => {
				expect(err.message).toEqual("Something happened in mw2");
				expect(flow.join("-")).toBe("B1-B2");
			});
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
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});
	
});

describe.skip("Test validation", () => {

});