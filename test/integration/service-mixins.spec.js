let ServiceBroker = require("../../src/service-broker");

describe.only("Test Service mixins", () => {

	let mixinL2 = {
		name: "mixinL2",

		settings: {
			a: 2,
			b: "Steve",
			c: "John"
		},

		actions: {
			alpha: {
				handler(ctx) {
					return "From mixinL2";
				}
			},

			beta: {
				handler(ctx) {
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

		created: jest.fn(),
		started: jest.fn(),
		stopped: jest.fn()
	};

	let mixin1L1 = {
		name: "mixin1L1",
		mixins: [mixinL2],
		settings: {
			b: 500,
			d: "Adam"
		},

		actions: {
			beta(ctx) {
				return "From mixin1L1";
			},

			gamma(ctx) {
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

		created: jest.fn(),
		stopped: jest.fn()
	};

	let mixin2L1 = {
		name: "mixin2L1",
		mixins: [mixinL2],
		settings: {
			b: 600,
			e: "Susan"
		},

		actions: {
			gamma(ctx) {
				return "From mixin2L1";
			},

			delta(ctx) {
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

		created: jest.fn(),
		started: jest.fn()
	};

	let mainSchema = {
		name: "main",

		mixins: [
			mixin1L1,
			mixin2L1
		],

		settings: {
			a: 999,
			f: "Bill"
		},

		actions: {
			tango(ctx) {
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

		created: jest.fn(),
		started: jest.fn(),
		stopped: jest.fn()
	};

	let broker = new ServiceBroker();

	let svc = broker.createService(mainSchema);

	// console.log(svc.schema);

	it("should call every created handler", () => {
		expect(mainSchema.created).toHaveBeenCalledTimes(1);
		expect(mixin1L1.created).toHaveBeenCalledTimes(1);
		expect(mixin2L1.created).toHaveBeenCalledTimes(1);
		expect(mixinL2.created).toHaveBeenCalledTimes(2);

		return broker.start();
	});

	it("should call every start handler", () => {
		expect(mainSchema.started).toHaveBeenCalledTimes(1);
		expect(mixin2L1.started).toHaveBeenCalledTimes(1);
		expect(mixinL2.started).toHaveBeenCalledTimes(2);
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
		broker.emit("oxygen", payload);

		expect(mainSchema.events.oxygen).toHaveBeenCalledTimes(1);
		expect(mainSchema.events.oxygen).toHaveBeenCalledWith(payload, undefined, "oxygen");

		expect(mixin1L1.events.oxygen).toHaveBeenCalledTimes(1);
		expect(mixin1L1.events.oxygen).toHaveBeenCalledWith(payload, undefined, "oxygen");

		expect(mixin2L1.events.oxygen).toHaveBeenCalledTimes(1);
		expect(mixin2L1.events.oxygen).toHaveBeenCalledWith(payload, undefined, "oxygen");

		expect(mixinL2.events.oxygen).toHaveBeenCalledTimes(2);
		expect(mixinL2.events.oxygen).toHaveBeenCalledWith(payload, undefined, "oxygen");
	});

	it("should call 'carbon' event handlers", () => {
		let payload = { a: 5 };
		broker.emit("carbon", payload);

		expect(mainSchema.events.carbon).toHaveBeenCalledTimes(1);
		expect(mainSchema.events.carbon).toHaveBeenCalledWith(payload, undefined, "carbon");
	});

	it("should call 'hydrogen' event handlers", () => {
		let payload = { a: 5 };
		broker.emit("hydrogen", payload);

		expect(mixin1L1.events.hydrogen).toHaveBeenCalledTimes(1);
		expect(mixin1L1.events.hydrogen).toHaveBeenCalledWith(payload, undefined, "hydrogen");

		expect(mixin2L1.events.hydrogen).toHaveBeenCalledTimes(1);
		expect(mixin2L1.events.hydrogen).toHaveBeenCalledWith(payload, undefined, "hydrogen");
	});

	it("calling broker.stop", () => {
		return broker.stop();
	});

	it("should called stop handler", () => {
		expect(mainSchema.stopped).toHaveBeenCalledTimes(1);
		expect(mixin1L1.stopped).toHaveBeenCalledTimes(1);
		expect(mixinL2.stopped).toHaveBeenCalledTimes(2);
	});

});
