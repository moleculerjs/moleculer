/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const { makeDirs } = require("../../utils");

module.exports = function TransitLoggerMiddleware(opts) {
	opts = _.defaultsDeep(opts, {
		logger: null,
		logLevel: "info",
		logPacketData: false,
		folder: null,
		colors: {
			receive: "grey",
			send: "grey"
		},
		extension: ".json",
		packetFilter: ["HEARTBEAT"]
	});

	let logger;
	let nodeID;

	let targetFolder;

	function saveToFile(filename, payload) {
		fs.writeFile(path.join(targetFolder, filename), JSON.stringify(payload, null, 4), () => { /* Silent error */ });
	}

	const coloringSend = opts.colors && opts.colors.send ? opts.colors.send.split(".").reduce((a,b) => a[b], chalk) : s => s;
	const coloringReceive = opts.colors && opts.colors.receive ? opts.colors.receive.split(".").reduce((a,b) => a[b], chalk) : s => s;

	return {
		created(broker) {
			logger = opts.logger || broker.getLogger("debug");
			nodeID = broker.nodeID;

			if (opts.folder) {
				targetFolder = path.join(opts.folder, nodeID);
				makeDirs(targetFolder);
			}
		},

		transitPublish(next) {
			return packet => {
				if (opts.packetFilter.includes(packet.type)) {
					return next(packet);
				}

				const payload = packet.payload;

				if (opts.logLevel) {
					logger[opts.logLevel](coloringSend(`=> Send ${packet.type} packet to '${packet.target || "<all nodes>"}'`));
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
					logger[opts.logLevel](coloringReceive(`<= Receive ${cmd} packet from '${payload.sender}'`));
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
