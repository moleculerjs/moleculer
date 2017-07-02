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
		settings: {
			b: 600,
			e: "Susan"
		},

		actions :{
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

	//console.log(svc.schema);

	it("should call every created handler", () => {
		expect(mainSchema.created).toHaveBeenCalledTimes(1);
		expect(mixin1L1.created).toHaveBeenCalledTimes(1);
		expect(mixin2L1.created).toHaveBeenCalledTimes(1);
		expect(mixinL2.created).toHaveBeenCalledTimes(1);

		return broker.start();
	});		
	/*
	it("should call every start handler", () => {
		expect(mainStartedHandler).toHaveBeenCalledTimes(1);
	});

	it("should called event handler", () => {
		broker.emit("oxygen", { id: 1, name: "John" });
		expect(mainEventHandler).toHaveBeenCalledTimes(1);
		expect(mainEventHandler).toHaveBeenCalledWith({ id: 1, name: "John" }, undefined, "oxygen");

		return broker.stop();
	});		

	it("should called stop handler", () => {
		expect(mainStoppedHandler).toHaveBeenCalledTimes(1);
	});	
*/
});
