const ServiceBroker = require("../../src/service-broker");
const { MoleculerError } = require("../../src/errors");
const _ = require("lodash");
const { protectReject } = require("../unit/utils");

describe("Test Service mixins", () => {

	let flowCreated = [];
	let flowStarted = [];
	let flowStopped = [];
	let flowHooks = [];

	let mixinL2 = {
		name: "mixinL2",

		settings: {
			a: 2,
			b: "Steve",
			c: "John"
		},

		metadata: {
			priority: 5,
			tag: "other"
		},

		hooks: {
			before: {
				"*"() {
					flowHooks.push("mixinL2-before-all");
				},
				beta() {
					flowHooks.push("mixinL2-before-beta");
				}
			},
			after: {
				beta() {
					flowHooks.push("mixinsL2-after-beta");
					return "Change result";
				}
			}
		},

		actions: {
			alpha: {
				handler() {
					return "From mixinL2";
				}
			},

			beta: {
				handler() {
					return "From mixinL2";
				}
			},

			charlie(ctx) {
				return {
					msg: "From mixinL2",
					action: _.omit(ctx.action, ["handler", "service", "metrics"])
				};
			},

			echo: {
				params: {
					id: "string"
				},
				handler() {
					return "From mixinL2";
				}
			}
		},

		methods: {
			mars: jest.fn(),
			jupiter: jest.fn()
		},

		events: {
			"oxygen": {
				handler: jest.fn()
			}
		},

		created: jest.fn(() => flowCreated.push("mixinL2")),
		started: jest.fn(() => flowStarted.push("mixinL2")),
		stopped: jest.fn(() => flowStopped.push("mixinL2"))
	};

	let mixin1L1 = {
		name: "mixin1L1",
		mixins: [mixinL2],
		settings: {
			b: 500,
			d: "Adam"
		},

		metadata: {
			scalable: true,
			priority: 3
		},

		hooks: {
			after: {
				beta(ctx, res) {
					flowHooks.push("mixin1L1-after-beta");
					return res;
				},
				"*"(ctx, res) {
					flowHooks.push("mixin1L1-after-all");
					return res;
				}
			}
		},

		actions: {
			beta() {
				return "From mixin1L1";
			},

			gamma() {
				return "From mixin1L1";
			},

			echo(ctx) {
				return {
					msg: "From mixin1L1",
					action: _.omit(ctx.action, ["handler", "service", "metrics"])
				};
			},
			foxtrot() {
				return "From mixin1L1";
			}
		},

		methods: {
			jupiter: jest.fn(),
			saturn: jest.fn()
		},

		events: {
			"oxygen": jest.fn(),
			"hydrogen": jest.fn(),
			"nitrogen": {
				group: "pnictogen",
				handler: jest.fn()
			}
		},

		created: jest.fn(() => flowCreated.push("mixin1L1")),
		stopped: jest.fn(() => flowStopped.push("mixin1L1"))
	};

	let mixin2L1 = {
		name: "mixin2L1",
		mixins: [mixinL2],
		settings: {
			b: 600,
			e: "Susan"
		},

		dependencies: "math",

		hooks: {
			error: {
				"*": [
					function(ctx, err) {
						flowHooks.push("mixin2L1-error-all-1");
						throw err;
					},
					function(ctx, err) {
						flowHooks.push("mixin2L1-error-all-2");
						throw err;
					}
				]
			}
		},

		actions: {
			gamma() {
				return "From mixin2L1";
			},

			delta() {
				return "From mixin2L1";
			},
			charlie: {
				cache: {
					keys: ["name"]
				}
			}
		},

		methods: {
			jupiter: jest.fn(),
			uranus: jest.fn(),
			venus: jest.fn()
		},

		events: {
			"oxygen": jest.fn(),
			"hydrogen": jest.fn()
		},

		created: jest.fn(() => flowCreated.push("mixin2L1")),
		started: jest.fn(() => flowStarted.push("mixin2L1"))
	};

	let mainSchema = {
		name: "main",

		mixins: [
			mixin1L1,
			mixin2L1
		],

		dependencies: [
			"posts",
			{ name: "users", version: 2 }
		],

		settings: {
			a: 999,
			f: "Bill"
		},

		metadata: {
			minMemory: "2g"
		},

		hooks: {
			before: {
				"*"() {
					flowHooks.push("main-before-all");
				},
				beta() {
					flowHooks.push("main-before-beta");
				}
			},
			after: {
				beta(ctx, res) {
					flowHooks.push("main-after-beta");
					return res;
				}
			},
			error: {
				"*"(ctx, err) {
					flowHooks.push("main-error-all");
					throw err;
				},
				zulu(ctx, err) {
					flowHooks.push("main-error-zulu");
					throw err;
				}
			}
		},

		actions: {
			tango() {
				return "From main";
			},
			charlie: {
				params: {
					name: "string"
				}
			},
			zulu() {
				throw new MoleculerError("Zulu error");
			},

			foxtrot: false
		},

		methods: {
			uranus: jest.fn()
		},

		events: {
			"oxygen": jest.fn(),
			"carbon": jest.fn(),
			"nitrogen": jest.fn()
		},

		created: jest.fn(() => flowCreated.push("main")),
		started: jest.fn(() => flowStarted.push("main")),
		stopped: jest.fn(() => flowStopped.push("main"))
	};

	let broker = new ServiceBroker({ logger: false });

	let svc = broker.createService(mainSchema);
	svc.waitForServices = jest.fn(() => Promise.resolve());

	// console.log(svc.schema);

	it("should call every created handler", () => {
		expect(mainSchema.created).toHaveBeenCalledTimes(1);
		expect(mixin1L1.created).toHaveBeenCalledTimes(1);
		expect(mixin2L1.created).toHaveBeenCalledTimes(1);
		expect(mixinL2.created).toHaveBeenCalledTimes(2);
		expect(flowCreated.join("-")).toBe("mixinL2-mixin2L1-mixinL2-mixin1L1-main");

		return broker.start();
	});

	it("should call every start handler", () => {
		expect(mainSchema.started).toHaveBeenCalledTimes(1);
		expect(mixin2L1.started).toHaveBeenCalledTimes(1);
		expect(mixinL2.started).toHaveBeenCalledTimes(2);
		expect(flowStarted.join("-")).toBe("mixinL2-mixin2L1-mixinL2-main");
	});

	it("should merge settings", () => {
		expect(svc.settings).toEqual({
			a: 999,
			b: 500,
			c: "John",
			d: "Adam",
			e: "Susan",
			f: "Bill"
		});
	});

	it("should merge dependencies", () => {
		expect(svc.schema.dependencies).toEqual([
			"posts",
			{ name: "users", version: 2 },
			"math"
		]);
		expect(svc.waitForServices).toHaveBeenCalledTimes(1);
		expect(svc.waitForServices).toHaveBeenCalledWith(["posts", { name: "users", version: 2 }, "math"], 0);
	});

	it("should merge metadata", () => {
		expect(svc.metadata).toEqual({
			priority: 3,
			tag: "other",
			scalable: true,
			minMemory: "2g"
		});
	});

	it("should call 'beta' action", () => {
		flowHooks = [];
		return broker.call("main.beta").catch(protectReject).then(res => {
			expect(res).toBe("Change result");
			expect(flowHooks).toEqual([
				"mixinL2-before-all",
				"mixinL2-before-all",
				"main-before-all",
				"mixinL2-before-beta",
				"mixinL2-before-beta",
				"main-before-beta",
				"main-after-beta",
				"mixin1L1-after-beta",
				"mixinsL2-after-beta",
				"mixinsL2-after-beta",
				"mixin1L1-after-all"
			]);
		});
	});

	it("should call 'delta' action", () => {
		flowHooks = [];
		return broker.call("main.delta").catch(protectReject).then(res => {
			expect(res).toBe("From mixin2L1");
			expect(flowHooks).toEqual([
				"mixinL2-before-all",
				"mixinL2-before-all",
				"main-before-all",
				"mixin1L1-after-all"
			]);
		});
	});

	it("should call 'gamma' action", () => {
		flowHooks = [];
		return broker.call("main.gamma").catch(protectReject).then(res => {
			expect(res).toBe("From mixin1L1");
			expect(flowHooks).toEqual([
				"mixinL2-before-all",
				"mixinL2-before-all",
				"main-before-all",
				"mixin1L1-after-all"
			]);
		});
	});

	it("should call 'alpha' action", () => {
		flowHooks = [];
		return broker.call("main.alpha").catch(protectReject).then(res => {
			expect(res).toBe("From mixinL2");
			expect(flowHooks).toEqual([
				"mixinL2-before-all",
				"mixinL2-before-all",
				"main-before-all",
				"mixin1L1-after-all"
			]);
		});
	});

	it("should call 'tango' action", () => {
		flowHooks = [];
		return broker.call("main.tango").catch(protectReject).then(res => {
			expect(res).toBe("From main");
			expect(flowHooks).toEqual([
				"mixinL2-before-all",
				"mixinL2-before-all",
				"main-before-all",
				"mixin1L1-after-all"
			]);
		});
	});

	it("should call 'charlie' action", () => {
		flowHooks = [];
		return broker.call("main.charlie", { name: "John" }).catch(protectReject).then(res => {
			expect(res.msg).toBe("From mixinL2");
			expect(res.action).toEqual({
				cache: {
					keys: ["name"]
				},
				name: "main.charlie",
				rawName: "charlie",
				params: {
					"name": "string"
				}
			});
			expect(flowHooks).toEqual([
				"mixinL2-before-all",
				"mixinL2-before-all",
				"main-before-all",
				"mixin1L1-after-all"
			]);
		});
	});

	it("should call 'echo' action", () => {
		flowHooks = [];
		return broker.call("main.echo", { id: "1" }).catch(protectReject).then(res => {
			expect(res.msg).toBe("From mixin1L1");
			expect(res.action).toEqual({
				cache: false,
				name: "main.echo",
				rawName: "echo",
				params: {
					"id": "string"
				}
			});
			expect(flowHooks).toEqual([
				"mixinL2-before-all",
				"mixinL2-before-all",
				"main-before-all",
				"mixin1L1-after-all"
			]);
		});
	});

	it("should call 'zulu' action", () => {
		flowHooks = [];
		return broker.call("main.zulu").then(protectReject).catch(err => {
			expect(err.message).toBe("Zulu error");
			expect(flowHooks).toEqual([
				"mixinL2-before-all",
				"mixinL2-before-all",
				"main-before-all",
				"main-error-zulu",
				"main-error-all",
				"mixin2L1-error-all-1",
				"mixin2L1-error-all-2",
			]);
		});
	});

	it("should not call 'foxtrot' action", () => {
		return broker.call("main.foxtrot").catch(err => {
			expect(err.name).toBe("ServiceNotFoundError");
		});
	});

	it("should call 'jupiter' method", () => {
		svc.jupiter();
		expect(mixin1L1.methods.jupiter).toHaveBeenCalledTimes(1);
	});

	it("should call 'uranus' method", () => {
		svc.uranus();
		expect(mainSchema.methods.uranus).toHaveBeenCalledTimes(1);
	});

	it("should call 'saturn' method", () => {
		svc.saturn();
		expect(mixin1L1.methods.saturn).toHaveBeenCalledTimes(1);
	});

	it("should call 'mars' method", () => {
		svc.mars();
		expect(mixinL2.methods.mars).toHaveBeenCalledTimes(1);
	});

	it("should call 'venus' method", () => {
		svc.venus();
		expect(mixin2L1.methods.venus).toHaveBeenCalledTimes(1);
	});

	it("should call 'oxygen' event handlers", () => {
		let payload = { a: 5 };
		broker.broadcastLocal("oxygen", payload);

		expect(mainSchema.events.oxygen).toHaveBeenCalledTimes(1);
		expect(mainSchema.events.oxygen).toHaveBeenCalledWith(payload, broker.nodeID, "oxygen", expect.any(broker.ContextFactory));

		expect(mixin1L1.events.oxygen).toHaveBeenCalledTimes(1);
		expect(mixin1L1.events.oxygen).toHaveBeenCalledWith(payload, broker.nodeID, "oxygen", expect.any(broker.ContextFactory));

		expect(mixin2L1.events.oxygen).toHaveBeenCalledTimes(1);
		expect(mixin2L1.events.oxygen).toHaveBeenCalledWith(payload, broker.nodeID, "oxygen", expect.any(broker.ContextFactory));

		expect(mixinL2.events.oxygen.handler).toHaveBeenCalledTimes(2);
		expect(mixinL2.events.oxygen.handler).toHaveBeenCalledWith(payload, broker.nodeID, "oxygen", expect.any(broker.ContextFactory));
	});

	it("should call 'carbon' event handlers", () => {
		let payload = { a: 5 };
		broker.broadcastLocal("carbon", payload);

		expect(mainSchema.events.carbon).toHaveBeenCalledTimes(1);
		expect(mainSchema.events.carbon).toHaveBeenCalledWith(payload, broker.nodeID, "carbon", expect.any(broker.ContextFactory));
	});

	it("should call 'hydrogen' event handlers", () => {
		let payload = { a: 5 };
		broker.broadcastLocal("hydrogen", payload);

		expect(mixin1L1.events.hydrogen).toHaveBeenCalledTimes(1);
		expect(mixin1L1.events.hydrogen).toHaveBeenCalledWith(payload, broker.nodeID, "hydrogen", expect.any(broker.ContextFactory));

		expect(mixin2L1.events.hydrogen).toHaveBeenCalledTimes(1);
		expect(mixin2L1.events.hydrogen).toHaveBeenCalledWith(payload, broker.nodeID, "hydrogen", expect.any(broker.ContextFactory));
	});

	it("should call 'nitrogen' event handlers without group", () => {
		let payload = { a: 5 };
		broker.broadcastLocal("nitrogen", payload);

		expect(mixin1L1.events.nitrogen.handler).toHaveBeenCalledTimes(1);
		expect(mixin1L1.events.nitrogen.handler).toHaveBeenCalledWith(payload, broker.nodeID, "nitrogen", expect.any(broker.ContextFactory));

		expect(mainSchema.events.nitrogen).toHaveBeenCalledTimes(1);
		expect(mainSchema.events.nitrogen).toHaveBeenCalledWith(payload, broker.nodeID, "nitrogen", expect.any(broker.ContextFactory));
	});

	it("should call 'nitrogen' event handlers with group", () => {
		mixin1L1.events.nitrogen.handler.mockClear();
		mainSchema.events.nitrogen.mockClear();

		let payload = { a: 5 };
		broker.broadcastLocal("nitrogen", payload, "pnictogen");

		expect(mixin1L1.events.nitrogen.handler).toHaveBeenCalledTimes(1);
		expect(mixin1L1.events.nitrogen.handler).toHaveBeenCalledWith(payload, broker.nodeID, "nitrogen", expect.any(broker.ContextFactory));

		expect(mainSchema.events.nitrogen).toHaveBeenCalledTimes(1);
		expect(mainSchema.events.nitrogen).toHaveBeenCalledWith(payload, broker.nodeID, "nitrogen", expect.any(broker.ContextFactory));
	});

	it("should call 'nitrogen' event handlers with wrong group", () => {
		mixin1L1.events.nitrogen.handler.mockClear();
		mainSchema.events.nitrogen.mockClear();

		let payload = { a: 5 };
		broker.broadcastLocal("nitrogen", payload, "other");

		expect(mixin1L1.events.nitrogen.handler).toHaveBeenCalledTimes(0);
		expect(mainSchema.events.nitrogen).toHaveBeenCalledTimes(0);
	});

	it("calling broker.stop", () => {
		return broker.stop();
	});

	it("should called stop handler", () => {
		expect(mainSchema.stopped).toHaveBeenCalledTimes(1);
		expect(mixin1L1.stopped).toHaveBeenCalledTimes(1);
		expect(mixinL2.stopped).toHaveBeenCalledTimes(2);

		expect(flowStopped.join("-")).toBe("main-mixin1L1-mixinL2-mixinL2");
	});

});
