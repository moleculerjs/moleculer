"use strict";

const hostname = require("os").hostname();

module.exports = {
	namespace: "docker",
	nodeID: `worker-${hostname}`,
	logger: true,
	logLevel: "info",
	transporter: {
		type: "TCP",
		options: {
		}
	},
	hotReload: true
};
