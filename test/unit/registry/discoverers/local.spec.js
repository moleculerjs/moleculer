"use strict";

const LocalDiscoverer = require("../../../../src/registry/discoverers").Local;
const ServiceBroker = require("../../../../src/service-broker");

describe("Test LocalDiscoverer 'discoverNode' method", () => {

	it("should do nothing if no transporter", async () => {
		const broker = new ServiceBroker({ logger: false });
		const discoverer = new LocalDiscoverer();
		discoverer.init(broker.registry);

		await discoverer.discoverNode("node-1");

		await discoverer.stop();
	});

	it("should call transit.discoverNode if has transporter", async () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
		const discoverer = new LocalDiscoverer();
		discoverer.init(broker.registry);
		broker.transit.discoverNode = jest.fn(() => Promise.resolve());

		await discoverer.discoverNode("node-1");

		expect(broker.transit.discoverNode).toBeCalledTimes(1);
		expect(broker.transit.discoverNode).toBeCalledWith("node-1");

		await discoverer.stop();
	});
});

describe("Test LocalDiscoverer 'discoverAllNodes' method", () => {

	it("should do nothing if no transporter", async () => {
		const broker = new ServiceBroker({ logger: false });
		const discoverer = new LocalDiscoverer();
		discoverer.init(broker.registry);

		await discoverer.discoverAllNodes();

		await discoverer.stop();
	});

	it("should call transit.discoverNode if has transporter", async () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
		const discoverer = new LocalDiscoverer();
		discoverer.init(broker.registry);
		broker.transit.discoverNodes = jest.fn(() => Promise.resolve());

		await discoverer.discoverAllNodes();

		expect(broker.transit.discoverNodes).toBeCalledTimes(1);
		expect(broker.transit.discoverNodes).toBeCalledWith();

		await discoverer.stop();
	});
});

describe("Test LocalDiscoverer 'sendLocalNodeInfo' method", () => {

	it("should do nothing if no transporter", async () => {
		const broker = new ServiceBroker({ logger: false });
		const discoverer = new LocalDiscoverer();
		discoverer.init(broker.registry);

		await discoverer.sendLocalNodeInfo("node-3");

		await discoverer.stop();
	});

	it("should call transit.sendNodeInfo if has transporter", async () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
		const discoverer = new LocalDiscoverer();
		discoverer.init(broker.registry);
		const info = { a: 5 };
		broker.getLocalNodeInfo = jest.fn(() => info);
		broker.transit.sendNodeInfo = jest.fn();
		broker.transit.tx.makeBalancedSubscriptions = jest.fn();

		await discoverer.sendLocalNodeInfo("node-3");

		expect(broker.transit.sendNodeInfo).toBeCalledTimes(1);
		expect(broker.transit.sendNodeInfo).toBeCalledWith(info, "node-3");

		expect(broker.transit.tx.makeBalancedSubscriptions).toBeCalledTimes(0);

		await discoverer.stop();
	});

	it("should call makeBalancedSubscriptions if has transporter & balancer disabled", async () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
		const discoverer = new LocalDiscoverer();
		discoverer.init(broker.registry);
		const info = { a: 5 };
		broker.getLocalNodeInfo = jest.fn(() => info);
		broker.transit.sendNodeInfo = jest.fn();
		broker.transit.tx.makeBalancedSubscriptions = jest.fn(() => Promise.resolve());
		broker.options.disableBalancer = true;

		await discoverer.sendLocalNodeInfo();

		expect(broker.transit.sendNodeInfo).toBeCalledTimes(1);
		expect(broker.transit.sendNodeInfo).toBeCalledWith(info, undefined);

		expect(broker.transit.tx.makeBalancedSubscriptions).toBeCalledTimes(1);

		await discoverer.stop();
	});
});
