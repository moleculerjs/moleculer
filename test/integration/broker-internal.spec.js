const ServiceBroker = require("../../src/service-broker");
const Promise = require("bluebird");

describe("Test internal services", () => {

	const broker = new ServiceBroker({
		nodeID: "node-master",
		statistics: true,
		internalServices: true
	});

	broker.createService({
		name: "greeter",
		settings: {
			anonymous: "John"
		},
		actions: {
			hello() {},
			welcome: {
				cache: true,
				params: {
					name: { type: "string" }
				},
				handler() {}
			}
		},
		events: {
			"say.hi"() {},
			"say.hello"() {}
		}
	});

	broker.createService({
		name: "echo",
		version: "alpha",
		actions: {
			reply() {}
		}
	});

	beforeAll(() => Promise.all([broker.start()]));
	afterAll(() => Promise.all([broker.stop()]));

	it("should register $node.stats internal action", () => {
		expect(broker.registry.actions.isAvailable("$node.list")).toBe(true);
		expect(broker.registry.actions.isAvailable("$node.services")).toBe(true);
		expect(broker.registry.actions.isAvailable("$node.actions")).toBe(true);
		expect(broker.registry.actions.isAvailable("$node.events")).toBe(true);
		expect(broker.registry.actions.isAvailable("$node.health")).toBe(true);
		expect(broker.registry.actions.isAvailable("$node.stats")).toBe(true);
	});

	it("should return node list", () => {
		const localNode = broker.registry.nodes.localNode;

		return broker.call("$node.list").then(res => {
			expect(res).toEqual([{
				"available": true,
				"client": {
					"langVersion": "v6.10.0",
					"type": "nodejs",
					"version": "0.10.0"
				},
				"config": {},
				"cpu": null,
				"id": "node-master",
				"ipList": localNode.ipList,
				"lastHeartbeatTime": localNode.lastHeartbeatTime,
				"local": true,
				"port": null
			}]);
		});
	});

	it("should return service list", () => {
		return broker.call("$node.services").then(res => {
			expect(res).toEqual([{
				"actions": {},
				"name": "$node",
				"nodes": ["node-master"],
				"settings": {},
				"version": undefined
			}, {
				"actions": {},
				"name": "greeter",
				"nodes": ["node-master"],
				"settings": {
					"anonymous": "John"
				},
				"version": undefined
			}, {
				"actions": {},
				"name": "echo",
				"nodes": ["node-master"],
				"settings": {},
				"version": "alpha"
			}]);
		});
	});

	it("should return service list (skipInternal, withActions)", () => {
		return broker.call("$node.services", { skipInternal: true, withActions: true }).then(res => {
			expect(res).toEqual([{
				"actions": {
					"greeter.hello": {
						"cache": false,
						"name": "greeter.hello"
					},
					"greeter.welcome": {
						"cache": true,
						"name": "greeter.welcome",
						"params": {
							"name": {
								"type": "string"
							}
						}
					}
				},
				"name": "greeter",
				"nodes": ["node-master"],
				"settings": {
					"anonymous": "John"
				},
				"version": undefined
			}, {
				"actions": {
					"alpha.echo.reply": {
						"cache": false,
						"name": "alpha.echo.reply"
					}
				},
				"name": "echo",
				"nodes": ["node-master"],
				"settings": {},
				"version": "alpha"
			}]);
		});
	});

	it("should return action list", () => {
		return broker.call("$node.actions").then(res => {
			expect(res).toEqual([{
				"action": {
					"cache": false,
					"name": "$node.list"
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.list"
			}, {
				"action": {
					"cache": false,
					"name": "$node.services",
					"params": {
						"onlyLocal": {
							"optional": true,
							"type": "boolean"
						},
						"skipInternal": {
							"optional": true,
							"type": "boolean"
						},
						"withActions": {
							"optional": true,
							"type": "boolean"
						}
					}
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.services"
			}, {
				"action": {
					"cache": false,
					"name": "$node.actions",
					"params": {
						"onlyLocal": {
							"optional": true,
							"type": "boolean"
						},
						"skipInternal": {
							"optional": true,
							"type": "boolean"
						},
						"withEndpoints": {
							"optional": true,
							"type": "boolean"
						}
					}
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.actions"
			}, {
				"action": {
					"cache": false,
					"name": "$node.events",
					"params": {
						"onlyLocal": {
							"optional": true,
							"type": "boolean"
						},
						"skipInternal": {
							"optional": true,
							"type": "boolean"
						},
						"withEndpoints": {
							"optional": true,
							"type": "boolean"
						}
					}
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.events"
			}, {
				"action": {
					"cache": false,
					"name": "$node.health"
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.health"
			}, {
				"action": {
					"cache": false,
					"name": "$node.stats"
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.stats"
			}, {
				"action": {
					"cache": false,
					"name": "greeter.hello"
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "greeter.hello"
			}, {
				"action": {
					"cache": true,
					"name": "greeter.welcome",
					"params": {
						"name": {
							"type": "string"
						}
					}
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "greeter.welcome"
			}, {
				"action": {
					"cache": false,
					"name": "alpha.echo.reply"
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "alpha.echo.reply"
			}]);
		});
	});

	it("should return action list (skipInternal, withEndpoints)", () => {
		return broker.call("$node.actions", { skipInternal: true, withEndpoints: true }).then(res => {
			expect(res).toEqual([{
				"action": {
					"cache": false,
					"name": "greeter.hello"
				},
				"available": true,
				"count": 1,
				"endpoints": [{
					"nodeID": "node-master",
					"state": true
				}],
				"hasLocal": true,
				"name": "greeter.hello"
			}, {
				"action": {
					"cache": true,
					"name": "greeter.welcome",
					"params": {
						"name": {
							"type": "string"
						}
					}
				},
				"available": true,
				"count": 1,
				"endpoints": [{
					"nodeID": "node-master",
					"state": true
				}],
				"hasLocal": true,
				"name": "greeter.welcome"
			}, {
				"action": {
					"cache": false,
					"name": "alpha.echo.reply"
				},
				"available": true,
				"count": 1,
				"endpoints": [{
					"nodeID": "node-master",
					"state": true
				}],
				"hasLocal": true,
				"name": "alpha.echo.reply"
			}]);
		});
	});

	it("should return event list", () => {
		return broker.call("$node.events").then(res => {
			expect(res).toEqual([{
				"available": true,
				"count": 1,
				"event": {
					"name": "say.hi"
				},
				"group": "greeter",
				"hasLocal": true,
				"name": "say.hi"
			}, {
				"available": true,
				"count": 1,
				"event": {
					"name": "say.hello"
				},
				"group": "greeter",
				"hasLocal": true,
				"name": "say.hello"
			}]);
		});
	});

	it("should return action event (withEndpoints)", () => {
		return broker.call("$node.events", { withEndpoints: true }).then(res => {
			expect(res).toEqual([{
				"available": true,
				"count": 1,
				"endpoints": [{
					"nodeID": "node-master",
					"state": true
				}],
				"event": {
					"name": "say.hi"
				},
				"group": "greeter",
				"hasLocal": true,
				"name": "say.hi"
			}, {
				"available": true,
				"count": 1,
				"endpoints": [{
					"nodeID": "node-master",
					"state": true
				}],
				"event": {
					"name": "say.hello"
				},
				"group": "greeter",
				"hasLocal": true,
				"name": "say.hello"
			}]);
		});
	});

});

