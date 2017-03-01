const ServiceBroker = require("../../src/service-broker");
const MemoryCacher = require("../../src/cachers/memory");
const Context = require("../../src/context");
const utils = require("../../src/utils");
const lolex = require("lolex");

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
		internalActions: true 			
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

	it("should return list of services", () => {
		return broker.call("$node.services").then(res => {
			expect(res).toEqual([
				{"name": "math", "version": undefined}, 
				{"name": "posts", "version": undefined}
			]);
		});
	});

	it("should return list of actions", () => {
		return broker.call("$node.actions").then(res => {
			expect(res).toEqual([
				{"name": "$node.list"}, 
				{"name": "$node.services"}, 
				{"name": "$node.actions"}, 
				{"name": "$node.health"}, 
				{"name": "$node.stats"}, 

				{"name": "math.add"}, 
				{"name": "math.sub"}, 
				{"name": "math.mult"}, 
				{"name": "math.div"}, 
				
				{"name": "posts.find"}, 
				{"name": "posts.delayed"}, 
				{"name": "posts.get"}, 
				{"name": "posts.author"}
			]);
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
			actions: {}
		};
		broker.processNodeInfo(info.nodeID, info);

		return broker.call("$node.list").then(res => {
			expect(res).toBeDefined();
			expect(res).toEqual([
				{"available": true, "nodeID": "server-2"}
			]);
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
		expect(handler).toHaveBeenCalledWith(p);

		broker.emitLocal("test.event.demo", "data");
		expect(handler).toHaveBeenCalledTimes(2);
		expect(handler).toHaveBeenCalledWith("data");
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

	let broker = new ServiceBroker();

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
			expect(ctx.nodeID).toBeUndefined();
			expect(ctx.params).toBeDefined();
			expect(actionHandler).toHaveBeenCalledTimes(1);
			expect(actionHandler).toHaveBeenCalledWith(ctx);
		});
	});
		
	it("should set params to context", () => {
		let params = { a: 1 };
		return broker.call("posts.find", params).then(ctx => {
			expect(ctx.params).toBe(params);
			expect(ctx.params.a).toBe(params.a);
		});
	});

	it("should create a sub context of parent context", () => {
		let parentCtx = new Context({
			params: {
				a: 5,
				b: 2
			}
		});		
		let params = { a: 1 };

		return broker.call("posts.find", params, { parentCtx }).then(ctx => {
			expect(ctx.params).toBe(params);
			expect(ctx.params.a).toBe(1);
			expect(ctx.params.b).not.toBeDefined();
			expect(ctx.level).toBe(2);
			expect(ctx.parent).toBe(parentCtx);
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

describe("Test with metrics timer", () => {
	let clock;
	beforeAll(() => {
		clock = lolex.install();
	});

	afterAll(() => {
		clock.uninstall();
	});

	let broker= new ServiceBroker({
		metrics: true,
		statistics: true,
		metricsNodeTime: 5 * 1000
	});

	broker.getNodeHealthInfo = jest.fn(() => Promise.resolve());
	broker.emit = jest.fn();

	it("should create metrics timer", () => {
		return broker.start().then(() => {
			expect(broker.metricsTimer).toBeDefined();
		});
	});

	it("should send metrics events", () => {
		clock.tick(6000);

		expect(broker.emit).toHaveBeenCalledTimes(1); // node.health is async
		expect(broker.getNodeHealthInfo).toHaveBeenCalledTimes(1);
	});

	it("should destroy metrics timer", () => {
		broker.stop();
		expect(broker.metricsTimer).toBeNull();
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