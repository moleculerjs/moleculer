/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const net 			= require("net");
const EventEmitter 	= require("events");
const Promise		= require("bluebird");

const { PACKET_GOSSIP_REQ_ID, PACKET_GOSSIP_RES_ID } = require("./constants");

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
		if (opts.maxKeepAliveConnections > 0 && opts.keepAliveTimeout > 0) {
			this.timer = setInterval(() => this.manageTimeouts(), 30 * 1000);
		}
	}

	/**
	 * Connect to a remote node
	 *
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
			try {
				const socket = net.connect({ host, port }, () => {
					this.sockets.set(nodeID, socket);
					socket.nodeID = nodeID;
					socket.lastUsed = Date.now();

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

			} catch(err) {
				if (reject)
					reject(err);
			}
		});
	}

	/**
	 * Send a message to a remote node
	 *
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
				if ([PACKET_GOSSIP_REQ_ID, PACKET_GOSSIP_RES_ID].indexOf(type) == -1)
					socket.lastUsed = Date.now();

				return new Promise((resolve, reject) => {

					// Create binary payload
					const header = Buffer.alloc(HEADER_SIZE);
					header.writeInt32BE(data.length + HEADER_SIZE, 1);
					header.writeInt8(type, 5);
					const crc = header[1] ^ header[2] ^ header[3] ^ header[4] ^ header[5];
					header[0] = crc;

					const payload = Buffer.concat([header, data]);

					try {
						socket.write(payload, () => {
							//this.logger.info(`${type} packet sent to ${nodeID}.`);
							//this.logger.info(data.toString());
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
	 * Manage maxKeepAliveConnections & keepAliveTimeout
	 *
	 * @memberof TcpWriter
	 */
	manageTimeouts() {
		if (this.sockets.size <= this.opts.maxKeepAliveConnections)
			return;

		const timeLimit = Date.now() - (this.opts.keepAliveTimeout * 1000);

		const removable = [];
		this.sockets.forEach((socket, nodeID) => {
			if (socket.lastUsed < timeLimit)
				removable.push(nodeID);
		});

		this.logger.info("Close ${removable.length} timed out sockets.", removable); // TODO

		removable.forEach(nodeID => this.removeSocket(nodeID));
	}

	/**
	 * Remove socket by nodeID
	 *
	 * @param {String} nodeID
	 */
	removeSocket(nodeID) {
		const socket = this.sockets.get(nodeID);
		if (socket && !socket.destroyed)
			socket.end();

		this.sockets.delete(nodeID);
	}

	/**
	 * Close the TCP sockets.
	 *
	 * @memberof TcpWriter
	 */
	close() {
		// Stop timeout handler
		if (this.timer)
			clearInterval(this.timer);

		// Close all live sockets
		this.sockets.forEach((socket) => {
			if (!socket.destroyed)
				socket.end();
		});
	}
}

module.exports = TcpWriter;
