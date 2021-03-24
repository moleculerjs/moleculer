const _ = require("lodash");
const path = require("path");
const { ServiceBroker } = require("../../");

function createNode(nodeID, brokerOpts = {}) {
	const broker = new ServiceBroker({
		namespace: process.env.NAMESPACE,
		nodeID,
		logLevel: process.env.LOGLEVEL || "warn",
		transporter: process.env.TRANSPORTER || "TCP",
		...brokerOpts
	});

	broker.loadService(path.join(__dirname, "./services/helper.service.js"));

	return broker;
}

function assert(actual, expected) {
	if (!_.isEqual(actual, expected)) {
		const err = new Error("Assertion error");
		err.actual = actual;
		err.expected = expected;
		throw err;
	}
}

module.exports = {
	assert,
	createNode
};
