/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");


module.exports = function TransitLoggerMiddleware(opts) {
	opts = _.defaultsDeep(opts, {
		logger: null,
		logLevel: "info",
		logPacketData: false,
		folder: null,
		extension: ".json",
		packetFilter: ["HEARTBEAT"]
	});

	let logger;
	let nodeID;

	let targetFolder;

	function saveToFile(filename, payload) {
		fs.writeFile(path.join(targetFolder, filename), JSON.stringify(payload, null, 4), () => { /* Silent error */ });
	}

	return {
		created(broker) {
			logger = opts.logger || broker.getLogger("debug");
			nodeID = broker.nodeID;

			if (opts.folder) {
				// TODO recursive mkdir
				targetFolder = path.join(opts.folder, nodeID);
				if (!fs.existsSync(targetFolder))
					fs.mkdirSync(targetFolder);
			}
		},

		transitPublish(next) {
			return packet => {
				if (opts.packetFilter.includes(packet.type)) {
					return next(packet);
				}

				const payload = packet.payload;

				if (opts.logLevel) {
					logger[opts.logLevel](`=> Send ${packet.type} packet to '${packet.target || "<all nodes>"}'`);
					if (opts.logPacketData)
						logger[opts.logLevel]("=>", payload);
				}

				if (targetFolder)
					saveToFile(`${Date.now()}-send-${packet.type}-to-${packet.target || "all"}${opts.extension}`, payload);

				return next(packet);
			};
		},

		transitMessageHandler(next) {
			return (cmd, packet) => {
				if (opts.packetFilter.includes(cmd)) {
					return next(cmd, packet);
				}

				const payload = packet.payload;

				if (opts.logLevel) {
					logger[opts.logLevel](`<= Receive ${cmd} packet from '${payload.sender}'`);
					if (opts.logPacketData)
						logger[opts.logLevel]("<=", packet.payload);
				}

				if (targetFolder)
					saveToFile(`${Date.now()}-receive-${cmd}-from-${payload.sender}${opts.extension}`, payload);

				return next(cmd, packet);
			};
		}
	};
};
