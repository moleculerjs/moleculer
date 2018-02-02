/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const net 			= require("net");
const EventEmitter 	= require("events");
const Promise		= require("bluebird");

const HEADER_SIZE	= 6;

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
		const node = this.transporter.getNode(nodeID);
		if (!node)
			throw new Error(`Missing node info for '${nodeID}'!`);

		const host = this.transporter.getNodeAddress(node);
		const port = node.port;

		this.logger.debug(`Connecting to '${nodeID}' via ${host}:${port}`);

		return new Promise((resolve, reject) => {
			const socket = net.connect({ host, port }, () => {
				this.sockets.set(nodeID, socket);
				socket.nodeID = nodeID;

				this.logger.debug(`Connected successfully to '${nodeID}'.`);

				resolve(socket);
				reject = null;
			});

			socket.on("error", err => {
				this.removeSocket(nodeID);
				this.emit("error", err, nodeID);

				if (reject)
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
		return Promise.resolve()
			.then(() => {
				let socket = this.sockets.get(nodeID);
				if (socket)
					return socket;

				return this.connect(nodeID);
			})
			.then(socket => {
				return new Promise((resolve, reject) => {

					// Create binary payload
					const header = Buffer.alloc(HEADER_SIZE);
					header.writeInt32BE(data.length + HEADER_SIZE, 1);
					header.writeInt8(type, 5);
					const crc = header[1] ^ header[2] ^ header[3] ^ header[4] ^ header[5];
					header[0] = crc;

					const payload = Buffer.concat([header, data]);

					try {

						socket.write(payload, (asd) => {
							//this.logger.info(`${type} packet sent to ${nodeID}.`);
							//this.logger.info(data.toString()); // TODO
							resolve();
						});
					} catch(err) {
						this.removeSocket(nodeID);
						reject(err);
					}
				});
			});
	}

	/**
	 * Remove socket by nodeID
	 *
	 * @param {String} nodeID
	 */
	removeSocket(nodeID) {
		this.sockets.delete(nodeID);
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
