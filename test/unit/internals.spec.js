"use strict";

const ServiceBroker = require("../../src/service-broker");
const { MoleculerClientError } = require("../../src/errors");
const { protectReject } = require("./utils");

describe("Test health status methods", () => {
	const broker = new ServiceBroker({ logger: false, transporter: "fake", metrics: true });

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should call getNodeList", () => {
		broker.registry.getNodeList = jest.fn();

		return broker.call("$node.list").catch(protectReject).then(() => {
			expect(broker.registry.getNodeList).toHaveBeenCalledTimes(1);
		});
	});

	it("should call getServiceList", () => {
		broker.registry.getServiceList = jest.fn(() => [
			{
				name: "users",
				nodeID: "node-1",
				actions: {
					find() {},
					get() {},
					protected: { protected: true }
				}
			},
			{
				name: "users",
				nodeID: "node-2",
				actions: {
					find() {},
					get() {},
					login: {
						protected: true
					},
					logout: {}
				}
			},
			{
				name: "posts",
				version: 2,
				nodeID: "node-3",
				actions: {
					find() {},
					get() {}
				}
			},
		]);

		let opts = { skipInternal: true, withActions: true };
		return broker.call("$node.services", opts).catch(protectReject).then(res => {
			expect(broker.registry.getServiceList).toHaveBeenCalledTimes(1);
			expect(broker.registry.getServiceList).toHaveBeenCalledWith(opts);

			expect(res).toEqual([{
				"actions": {
					"find": {},
					"get": {},
					"logout": {}
				},
				"name": "users",
				"nodes": ["node-1", "node-2"]
			}, {
				"actions": {
					"find": {},
					"get": {}
				},
				"name": "posts",
				"nodes": ["node-3"],
				"version": 2
			}]);
		});
	});

	it("should call getActionList", () => {
		broker.registry.getActionList = jest.fn();

		let opts = { skipInternal: true };
		return broker.call("$node.actions", opts).catch(protectReject).then(() => {
			expect(broker.registry.getActionList).toHaveBeenCalledTimes(1);
			expect(broker.registry.getActionList).toHaveBeenCalledWith(opts);
		});
	});

	it("should call getEventList", () => {
		broker.registry.getEventList = jest.fn();

		let opts = { skipInternal: true };
		return broker.call("$node.events", opts).catch(protectReject).then(() => {
			expect(broker.registry.getEventList).toHaveBeenCalledTimes(1);
			expect(broker.registry.getEventList).toHaveBeenCalledWith(opts);
		});
	});

	it("should call getHealthStatus", () => {
		broker.getHealthStatus = jest.fn();
		return broker.call("$node.health").catch(protectReject).then(() => {
			expect(broker.getHealthStatus).toHaveBeenCalledTimes(1);
		});
	});

	it("should return broker.options", () => {
		return broker.call("$node.options").catch(protectReject).then(res => {
			expect(res).toEqual(broker.options);
		});
	});

	it("should call MetricsRegistry.list", () => {
		broker.metrics.list = jest.fn();

		let opts = { includes: "moleculer.**", excludes: ["process.**"], types: "info" };

		return broker.call("$node.metrics", opts).catch(protectReject).then(() => {
			expect(broker.metrics.list).toHaveBeenCalledTimes(1);
			expect(broker.metrics.list).toHaveBeenCalledWith(opts);
		});
	});

	it("should throw error if metrics is disabled", () => {
		broker.isMetricsEnabled = jest.fn(() => false);
		broker.metrics.list = jest.fn();

		let opts = { includes: "moleculer.**", excludes: ["process.**"], types: "info" };

		return broker.call("$node.metrics", opts).then(protectReject).catch(err => {
			expect(err).toBeInstanceOf(MoleculerClientError);
			expect(err.name).toBe("MoleculerClientError");
			expect(err.type).toBe("METRICS_DISABLED");
			expect(err.code).toBe(400);
			expect(err.message).toBe("Metrics feature is disabled");

			expect(broker.metrics.list).toHaveBeenCalledTimes(0);
		});
	});

});
