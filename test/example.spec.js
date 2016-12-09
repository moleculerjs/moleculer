"use strict";

let _ = require("lodash");
let Service = require("../src/service");
let ServiceBroker = require("../src/service-broker");
let broker = new ServiceBroker();

describe("Create demo service", () => {

	let schema = {
		settings: {
			name: "posts",
			version: 1,
			namespace: "posts"
		},

		actions: {
			find: {
				cache: true,
				rest: true,
				ws: true,
				graphql: true,
				handler(ctx) {
					return Promise.resolve([]);
				}
			}
		},

		events: {
			"request.rest.posts.find"(ctx) {
				console.log(ctx);
			}
		}

	};

	it("test ServiceBroker properties", () => {
		expect(broker.services).toBeDefined();
		expect(broker.services).toBeInstanceOf(Map);

		expect(broker.actions).toBeDefined();
		expect(broker.actions).toBeInstanceOf(Map);

		expect(broker.subscriptions).toBeDefined();
		expect(broker.subscriptions).toBeInstanceOf(Map);

		expect(broker.nodes).toBeDefined();
		expect(broker.nodes).toBeInstanceOf(Map);
		expect(broker.nodes.size).toBe(1);
	});

	it("test broker internal node", () => {
		expect(broker.internalNode).toBeDefined();
		expect(broker.internalNode.id).toBe("internal");
		expect(broker.internalNode.name).toBe("Internal Service Node");
	});

	it("test service create", () => {
		broker.registerService = jest.fn();


		let service = new Service(broker, broker.internalNode, _.cloneDeep(schema));

		expect(service).toBeDefined();
		expect(broker.registerService.mock.calls.length).toBe(1);


	});

});