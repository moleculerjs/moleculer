const ServiceBroker = require("../../src/service-broker");
const Cacher = require("../../src/cachers/base");

describe("Test BaseCacher", () => {

	it("check constructor", () => {
		let cacher = new Cacher();
		expect(cacher).toBeDefined();
		expect(cacher.opts).toBeDefined();
		expect(cacher.prefix).toBe("");
		expect(cacher.opts.ttl).toBeNull();
		expect(cacher.init).toBeDefined();
		expect(cacher.get).toBeDefined();
		expect(cacher.set).toBeDefined();
		expect(cacher.del).toBeDefined();
		expect(cacher.clean).toBeDefined();
	});

	it("check constructor with options", () => {
		let opts = { prefix: "TEST", ttl: 500 };
		let cacher = new Cacher(opts);
		expect(cacher).toBeDefined();
		expect(cacher.opts).toEqual(opts);
		expect(cacher.prefix).toBe("TEST");
		expect(cacher.opts.ttl).toBe(500);
	});

	it("check init", () => {
		let broker = new ServiceBroker();
		let cacher = new Cacher();

		cacher.init(broker);
		expect(cacher.broker).toBe(broker);
		expect(cacher.logger).toBeDefined();
	});
});
