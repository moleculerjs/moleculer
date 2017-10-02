let ServiceBroker = require("../../src/service-broker");

describe("Test Service mixins", () => {

	let flowCreated = [];
	let flowStarted = [];
	let flowStopped = [];

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
			}
		},

		methods: {
			mars: jest.fn(),
			jupiter: jest.fn()
		},

		events: {
			"oxygen": jest.fn()
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

		actions: {
			beta() {
				return "From mixin1L1";
			},

			gamma() {
				return "From mixin1L1";
			}
		},

		methods: {
			jupiter: jest.fn(),
			saturn: jest.fn()
		},

		events: {
			"oxygen": jest.fn(),
			"hydrogen": jest.fn()
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

		actions: {
			gamma() {
				return "From mixin2L1";
			},

			delta() {
				return "From mixin2L1";
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

		actions: {
			tango() {
				return "From main";
			}
		},

		methods: {
			uranus: jest.fn()
		},

		events: {
			"oxygen": jest.fn(),
			"carbon": jest.fn(),
		},

		created: jest.fn(() => flowCreated.push("main")),
		started: jest.fn(() => flowStarted.push("main")),
		stopped: jest.fn(() => flowStopped.push("main"))
	};

	let broker = new ServiceBroker();

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
		return broker.call("main.beta").then(res => {
			expect(res).toBe("From mixin1L1");
		});
	});

	it("should call 'delta' action", () => {
		return broker.call("main.delta").then(res => {
			expect(res).toBe("From mixin2L1");
		});
	});

	it("should call 'gamma' action", () => {
		return broker.call("main.gamma").then(res => {
			expect(res).toBe("From mixin1L1");
		});
	});

	it("should call 'alpha' action", () => {
		return broker.call("main.alpha").then(res => {
			expect(res).toBe("From mixinL2");
		});
	});

	it("should call 'tango' action", () => {
		return broker.call("main.tango").then(res => {
			expect(res).toBe("From main");
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
		expect(mainSchema.events.oxygen).toHaveBeenCalledWith(payload, broker.nodeID, "oxygen");

		expect(mixin1L1.events.oxygen).toHaveBeenCalledTimes(1);
		expect(mixin1L1.events.oxygen).toHaveBeenCalledWith(payload, broker.nodeID, "oxygen");

		expect(mixin2L1.events.oxygen).toHaveBeenCalledTimes(1);
		expect(mixin2L1.events.oxygen).toHaveBeenCalledWith(payload, broker.nodeID, "oxygen");

		expect(mixinL2.events.oxygen).toHaveBeenCalledTimes(2);
		expect(mixinL2.events.oxygen).toHaveBeenCalledWith(payload, broker.nodeID, "oxygen");
	});

	it("should call 'carbon' event handlers", () => {
		let payload = { a: 5 };
		broker.broadcastLocal("carbon", payload);

		expect(mainSchema.events.carbon).toHaveBeenCalledTimes(1);
		expect(mainSchema.events.carbon).toHaveBeenCalledWith(payload, broker.nodeID, "carbon");
	});

	it("should call 'hydrogen' event handlers", () => {
		let payload = { a: 5 };
		broker.broadcastLocal("hydrogen", payload);

		expect(mixin1L1.events.hydrogen).toHaveBeenCalledTimes(1);
		expect(mixin1L1.events.hydrogen).toHaveBeenCalledWith(payload, broker.nodeID, "hydrogen");

		expect(mixin2L1.events.hydrogen).toHaveBeenCalledTimes(1);
		expect(mixin2L1.events.hydrogen).toHaveBeenCalledWith(payload, broker.nodeID, "hydrogen");
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
