/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const net 			= require("net");
const EventEmitter 	= require("events");
const Promise		= require("bluebird");

/**
 * TCP Writer for TcpTransporter
 *
 * @class TcpWriter
 * @extends {EventEmitter}
 */
class TcpWriter extends EventEmitter {

	/**
	 * Creates an instance of TcpWriter.
	 *
	 * @param {any} transporter
	 * @param {any} opts
	 * @memberof TcpWriter
	 */
	constructor(transporter, opts) {
		super();

		this.sockets = new Map();
		this.opts = opts;

		this.transporter = transporter;
		this.logger = transporter.logger;
		//this.nodeID = transporter.nodeID;

		// Start timeout handler
		// if (maxConnections > 0 && keepAliveTimeout > 0) {
		// 	timer = scheduler.scheduleAtFixedRate(this::manageTimeouts, 1, 1, TimeUnit.SECONDS);
		// }
	}

	/**
	 * Connect to a remote node
	 * @param {String} nodeID
	 */
	connect(nodeID) {
		// TODO resolve host, port by nodeID
		return new Promise((resolve, reject) => {
			const socket = net.connect({ host, port }, () => resolve(socket));

			socket.on("error", err => {
				reject(err);
			});

			socket.unref();
		});
	}

	/**
	 * Send a message to a remote node
	 * @param {String} nodeID
	 * @param {Number} type
	 * @param {Buffer} data
	 */
	send(nodeID, type, data) {
		return new Promise((resolve, reject) => {

			let socket = this.sockets.get(nodeID);
			if (socket)
				return socket;

			return this.connect(nodeID);
		}).then(socket => {
			return new Promise(resolve => {

				// Create binary payload
				const header = Buffer.from(6);
				header.writeInt32BE(data.length, 1);
				header.writeInt8(type);
				const crc = header[1] ^ header[2] ^ header[3] ^ header[4] ^ header[5];
				header[0] = crc;

				const payload = Buffer.concat([header, data]);

				socket.write(payload, () => {
					this.logger.info(`${type} packet sent to ${nodeID}.`);
					resolve();
				});
			});
		});
	}

	/**
	 * Close the TCP sockets.
	 *
	 * @memberof TcpWriter
	 */
	close() {
		// TODO Stop timeout handler

		// Close live sockets
		this.sockets.forEach((socket) => socket.end());
	}
}

module.exports = TcpWriter;
