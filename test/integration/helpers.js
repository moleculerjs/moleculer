"use strict";

const _ = require("lodash");
const ServiceBroker = require("../../src/service-broker");

const H = {
	createNode(opts, services) {
		let node = new ServiceBroker(_.defaultsDeep(opts, { logger: false, transporter: "Fake" }));
		if (services)
			H.addServices(node, services);
		return node;
	},

	addServices(broker, services) {
		services.forEach(service => broker.createService(_.cloneDeep(service)));
	},

	removeServices(broker, serviceNames) {
		serviceNames.forEach(name => {
			let svc = broker.getLocalService(name);
			if (svc)
				broker.destroyService(svc);
		});
	},

	hasService(broker, fullName, nodeID) {
		return broker.registry.services.has(fullName, nodeID);
	},

	hasAction(broker, name) {
		return broker.registry.actions.get(name) != null;
	},

	isActionAvailable(broker, name) {
		return broker.registry.actions.isAvailable(name);
	},

	getNode(broker, nodeID) {
		return broker.registry.nodes.get(nodeID);
	},

	getActionNodes(broker, actionName) {
		const list = broker.registry.actions.get(actionName);
		if (list)
			return list.endpoints.map(ep => ep.id);

		/* istanbul ignore next */
		return [];
	},

	getEventNodes(broker,eventName) {
		return broker.registry.events.getAllEndpoints(eventName).map(node => node.id);
	}
};

module.exports = H;
