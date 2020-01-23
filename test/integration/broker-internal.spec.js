const ServiceBroker = require("../../src/service-broker");
const { hostname } = require("os");

describe("Test internal services", () => {

	const broker = new ServiceBroker({
		nodeID: "node-master",
		logger: false,
		transporter: null,
		internalServices: true,
		metrics: true,
		metadata: { a: 5 },
	});

	broker.createService({
		name: "greeter",
		settings: {
			anonymous: "John"
		},
		metadata: {
			scaling: true
		},
		actions: {
			hello() { },
			welcome: {
				cache: true,
				params: {
					name: { type: "string" }
				},
				handler() { }
			}
		},
		events: {
			"say.hi"() { },
			"say.hello"() { }
		}
	});

	broker.createService({
		name: "echo",
		version: "alpha",
		actions: {
			reply() { }
		}
	});

	beforeAll(() => Promise.all([broker.start()]));
	afterAll(() => Promise.all([broker.stop()]));

	it("should register $node internal actions", () => {
		expect(broker.registry.actions.isAvailable("$node.list")).toBe(true);
		expect(broker.registry.actions.isAvailable("$node.services")).toBe(true);
		expect(broker.registry.actions.isAvailable("$node.actions")).toBe(true);
		expect(broker.registry.actions.isAvailable("$node.events")).toBe(true);
		expect(broker.registry.actions.isAvailable("$node.health")).toBe(true);
	});

	it("should return node list", () => {
		const localNode = broker.registry.nodes.localNode;

		return broker.call("$node.list").then(res => {
			expect(res).toEqual([{
				"available": true,
				"client": {
					"langVersion": process.version,
					"type": "nodejs",
					"version": broker.MOLECULER_VERSION
				},
				"config": {},
				"cpu": null,
				"cpuSeq": null,
				"id": "node-master",
				"instanceID": localNode.instanceID,
				"ipList": localNode.ipList,
				"hostname": hostname(),
				"lastHeartbeatTime": localNode.lastHeartbeatTime,
				"offlineSince": null,
				"port": null,
				"seq": localNode.seq,
				"local": true,
				"metadata": { a: 5 },
				"udpAddress": null
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
				"metadata": {},
				"version": undefined
			}, {
				"actions": {},
				"name": "greeter",
				"nodes": ["node-master"],
				"settings": {
					"anonymous": "John"
				},
				"metadata": {
					"scaling": true
				},
				"version": undefined
			}, {
				"actions": {},
				"name": "echo",
				"nodes": ["node-master"],
				"settings": {},
				"metadata": {},
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
						"name": "greeter.hello",
						"rawName": "hello",
					},
					"greeter.welcome": {
						"cache": true,
						"name": "greeter.welcome",
						"rawName": "welcome",
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
				"metadata": {
					"scaling": true
				},
				"version": undefined
			}, {
				"actions": {
					"alpha.echo.reply": {
						"cache": false,
						"name": "alpha.echo.reply",
						"rawName": "reply",
					}
				},
				"name": "echo",
				"nodes": ["node-master"],
				"settings": {},
				"metadata": {},
				"version": "alpha"
			}]);
		});
	});

	it("should return action list", () => {
		return broker.call("$node.actions").then(res => {
			expect(res).toEqual([{
				"action": {
					"cache": false,
					"tracing": false,
					"name": "$node.list",
					"rawName": "list",
					"params": {
						"onlyAvailable": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"withServices": {
							"optional": true,
							"type": "boolean",
							"convert": true
						}
					}
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.list"
			}, {
				"action": {
					"cache": false,
					"tracing": false,
					"name": "$node.services",
					"rawName": "services",
					"params": {
						"onlyLocal": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"onlyAvailable": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"skipInternal": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"withActions": {
							"optional": true,
							"type": "boolean",
							"convert": true
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
					"tracing": false,
					"name": "$node.actions",
					"rawName": "actions",
					"params": {
						"onlyLocal": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"onlyAvailable": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"skipInternal": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"withEndpoints": {
							"optional": true,
							"type": "boolean",
							"convert": true
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
					"tracing": false,
					"name": "$node.events",
					"rawName": "events",
					"params": {
						"onlyLocal": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"onlyAvailable": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"skipInternal": {
							"optional": true,
							"type": "boolean",
							"convert": true
						},
						"withEndpoints": {
							"optional": true,
							"type": "boolean",
							"convert": true
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
					"tracing": false,
					"name": "$node.health",
					"rawName": "health",
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.health"
			}, {
				"action": {
					"cache": false,
					"tracing": false,
					"name": "$node.options",
					"rawName": "options",
					"params": {}
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.options"
			}, {
				"action": {
					"cache": false,
					"tracing": false,
					"name": "$node.metrics",
					"rawName": "metrics",
					"params": {
						types: { type: "multi", optional: true, rules: [ { type: "string" }, { type: "array", items: "string" } ] },
						includes: { type: "multi", optional: true, rules: [ { type: "string" }, { type: "array", items: "string" } ] },
						excludes: { type: "multi", optional: true, rules: [ { type: "string" }, { type: "array", items: "string" } ] }
					}
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.metrics"
			}, {
				"action": {
					"cache": false,
					"name": "greeter.hello",
					"rawName": "hello",
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "greeter.hello"
			}, {
				"action": {
					"cache": true,
					"name": "greeter.welcome",
					"rawName": "welcome",
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
					"name": "alpha.echo.reply",
					"rawName": "reply",
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
					"name": "greeter.hello",
					"rawName": "hello",
				},
				"available": true,
				"count": 1,
				"endpoints": [{
					"available": true,
					"nodeID": "node-master",
					"state": true
				}],
				"hasLocal": true,
				"name": "greeter.hello"
			}, {
				"action": {
					"cache": true,
					"name": "greeter.welcome",
					"rawName": "welcome",
					"params": {
						"name": {
							"type": "string"
						}
					}
				},
				"available": true,
				"count": 1,
				"endpoints": [{
					"available": true,
					"nodeID": "node-master",
					"state": true
				}],
				"hasLocal": true,
				"name": "greeter.welcome"
			}, {
				"action": {
					"cache": false,
					"name": "alpha.echo.reply",
					"rawName": "reply",
				},
				"available": true,
				"count": 1,
				"endpoints": [{
					"available": true,
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

	it("should return event list (withEndpoints)", () => {
		return broker.call("$node.events", { withEndpoints: true }).then(res => {
			expect(res).toEqual([{
				"available": true,
				"count": 1,
				"endpoints": [{
					"available": true,
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
					"available": true,
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

	it("should return health of node", () => {
		return broker.call("$node.health").then(res => {
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

	it("should return metrics", () => {
		return broker.call("$node.metrics", {
			includes: ["moleculer.broker.**"]
		}).then(res => {
			expect(res).toEqual([
				{
					"description": "Moleculer namespace",
					"labelNames": [],
					"name": "moleculer.broker.namespace",
					"type": "info",
					"unit": undefined,
					"values": [
						{
							"key": "",
							"labels": {},
							"timestamp": expect.any(Number),
							"value": ""
						}
					]
				},
				{
					"description": "ServiceBroker started",
					"labelNames": [],
					"name": "moleculer.broker.started",
					"type": "gauge",
					"unit": undefined,
					"values": [
						{
							"key": "",
							"labels": {},
							"timestamp": expect.any(Number),
							"value": 1
						}
					]
				},
				{
					"description": "Number of local services",
					"labelNames": [],
					"name": "moleculer.broker.local.services.total",
					"type": "gauge",
					"unit": undefined,
					"values": [
						{
							"key": "",
							"labels": {},
							"timestamp": expect.any(Number),
							"value": 3
						}
					]
				},
				{
					"description": "Number of local middlewares",
					"labelNames": [],
					"name": "moleculer.broker.middlewares.total",
					"type": "gauge",
					"unit": undefined,
					"values": [
						{
							"key": "",
							"labels": {},
							"timestamp": expect.any(Number),
							"value": 13
						}
					]
				}
			]);
		});
	});

});

