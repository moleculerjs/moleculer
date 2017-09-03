"use strict";

const H = require("../../src/health");
H.getHealthStatus = jest.fn();
const ServiceBroker = require("../../src/service-broker");
const { protectReject } = require("./utils");

describe("Test health status methods", () => {
	const broker = new ServiceBroker({ transporter: "fake", statistics: true });

	it("should call nodes.list", () => {
		broker.registry.nodes.list = jest.fn();

		return broker.call("$node.list").catch(protectReject).then(() => {
			expect(broker.registry.nodes.list).toHaveBeenCalledTimes(1);
		});
	});

	it("should call services.list", () => {
		broker.registry.services.list = jest.fn(() => [
			{
				name: "users",
				nodeID: "node-1",
				actions: {
					find() {},
					get() {}
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
					}
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
			expect(broker.registry.services.list).toHaveBeenCalledTimes(1);
			expect(broker.registry.services.list).toHaveBeenCalledWith(opts);

			expect(res).toEqual([{
				"actions": {
					"find": {},
					"get": {}
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

	it("should call actions.list", () => {
		broker.registry.actions.list = jest.fn();

		let opts = { skipInternal: true };
		return broker.call("$node.actions", opts).catch(protectReject).then(() => {
			expect(broker.registry.actions.list).toHaveBeenCalledTimes(1);
			expect(broker.registry.actions.list).toHaveBeenCalledWith(opts);
		});
	});

	it("should call events.list", () => {
		broker.registry.events.list = jest.fn();

		let opts = { skipInternal: true };
		return broker.call("$node.events", opts).catch(protectReject).then(() => {
			expect(broker.registry.events.list).toHaveBeenCalledTimes(1);
			expect(broker.registry.events.list).toHaveBeenCalledWith(opts);
		});
	});

	it("should call getHealthStatus", () => {
		return broker.call("$node.health").catch(protectReject).then(() => {
			expect(H.getHealthStatus).toHaveBeenCalledTimes(1);
		});
	});

	it("should call statistics.snapshot", () => {
		broker.statistics.snapshot = jest.fn();

		return broker.call("$node.stats").catch(protectReject).then(() => {
			expect(broker.statistics.snapshot).toHaveBeenCalledTimes(1);
		});
	});

});
