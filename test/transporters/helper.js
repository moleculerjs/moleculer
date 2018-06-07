"use strict";

const _ = require("lodash");
const ServiceBroker = require("../../src/service-broker");

const H = {
	createBroker(opts) {
		let broker = new ServiceBroker(_.cloneDeep(opts));
		return broker;
	},

	createBrokers(nodeIDs, opts) {
		return nodeIDs.map(nodeID => H.createBroker(_.defaultsDeep({ nodeID, logger: false }, opts)));
	}
};

module.exports = H;
