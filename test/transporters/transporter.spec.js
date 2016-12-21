const Transporter = require("../../src/transporters/base");

describe("Test Transporter", () => {

	it("check constructor", () => {
		let trans = new Transporter();
		expect(trans).toBeDefined();
		expect(trans.opts).toBeDefined();
		expect(trans.init).toBeDefined();
		expect(trans.connect).toBeDefined();
		expect(trans.disconnect).toBeDefined();
		expect(trans.emit).toBeDefined();
		expect(trans.subscribe).toBeDefined();
		expect(trans.request).toBeDefined();
	});

	it("check constructor with options", () => {
		let opts = { id: 5 };
		let trans = new Transporter(opts);
		expect(trans).toBeDefined();
		expect(trans.opts).toBe(opts);
		expect(trans.init).toBeDefined();
		expect(trans.connect).toBeDefined();
		expect(trans.disconnect).toBeDefined();
		expect(trans.emit).toBeDefined();
		expect(trans.subscribe).toBeDefined();
		expect(trans.request).toBeDefined();
	});

	it("check init", () => {
		let broker = {};
		let trans = new Transporter();

		trans.init(broker);
		expect(trans.broker).toBe(broker);
	});
});
