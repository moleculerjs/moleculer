"use strict";

const H = require("../../src/health");
const ServiceBroker = require("../../src/service-broker");

describe("Test health status methods", () => {
	const broker = new ServiceBroker({ logger: false, transporter: "fake" });

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should return health status", () => {
		let res = H.getHealthStatus(broker);

		expect(res).toBeDefined();
		expect(res.cpu).toBeDefined();
		expect(res.cpu.load1).toBeDefined();
		expect(res.cpu.load5).toBeDefined();
		expect(res.cpu.load15).toBeDefined();
		expect(res.cpu.cores).toBeDefined();
		expect(res.cpu.utilization).toBeDefined();

		expect(res.mem).toBeDefined();
		expect(res.mem.free).toBeDefined();
		expect(res.mem.total).toBeDefined();
		expect(res.mem.percent).toBeDefined();

		expect(res.os).toBeDefined();
		expect(res.os.uptime).toBeDefined();
		expect(res.os.type).toBeDefined();
		expect(res.os.release).toBeDefined();
		expect(res.os.hostname).toBeDefined();
		expect(res.os.arch).toBeDefined();
		expect(res.os.platform).toBeDefined();
		expect(res.os.user).toBeDefined();
		expect(res.net).toBeDefined();
		expect(res.net.ip).toBeDefined();
		expect(res.client).toBeDefined();
		expect(res.process).toBeDefined();
		expect(res.process.pid).toBeDefined();
		expect(res.process.memory).toBeDefined();
		expect(res.process.uptime).toBeDefined();
		expect(res.process.argv).toBeDefined();
		expect(res.time).toBeDefined();
		expect(res.time.now).toBeDefined();
		expect(res.time.iso).toBeDefined();
		expect(res.time.utc).toBeDefined();
	});

});
