/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const net 			= require("net");
const EventEmitter 	= require("events");
const Promise		= require("bluebird");

const { MoleculerError } = require("../../errors");
const { PACKET_GOSSIP_REQ_ID, PACKET_GOSSIP_RES_ID, PACKET_GOSSIP_HELLO_ID } = require("./constants");

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
	}

	/**
	 * Connect to a remote node
	 *
	 * @param {String} nodeID
	 */
	connect(nodeID) {
		const node = this.transporter.getNode(nodeID);
		if (!node)
			return Promise.reject(new MoleculerError(`Missing node info for '${nodeID}'!`));

		const host = this.transporter.getNodeAddress(node);
		const port = node.port;

		this.logger.debug(`Connecting to '${nodeID}' via ${host}:${port}`);

		return new Promise((resolve, reject) => {
			try {
				const socket = net.connect({ host, port }, () => {
					socket.nodeID = nodeID;
					socket.lastUsed = Date.now();

					this.addSocket(nodeID, socket, true);

					this.logger.debug(`Connected successfully to '${nodeID}'.`);

					// Handle racing problem, we send first a HELLO packet with our connection info
					this.transporter.sendHello(nodeID)
						.then(() => resolve(socket))
						.catch(err => reject(err));

					if (this.sockets.size > this.opts.maxConnections)
						this.manageConnections();

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
				if (socket && !socket.destroyed)
					return socket;

				return this.connect(nodeID);
			})
			.then(socket => {
				if ([PACKET_GOSSIP_REQ_ID, PACKET_GOSSIP_RES_ID, PACKET_GOSSIP_HELLO_ID].indexOf(type) == -1)
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
	 * Manage maximum live connections
	 *
	 * @memberof TcpWriter
	 */
	manageConnections() {
		let count = this.sockets.size - this.opts.maxConnections;
		if (count <= 0)
			return;

		const list = [];
		this.sockets.forEach((socket, nodeID) => list.push({ nodeID, lastUsed: socket.lastUsed }));
		list.sort((a,b) => a.lastUsed - b.lastUsed);

		count = Math.min(count, list.length - 1);
		const removable = list.slice(0, count);

		this.logger.warn(`Close ${count} old sockets.`, removable);

		removable.forEach(({ nodeID }) => this.removeSocket(nodeID));
	}

	/**
	 * Save a socket by nodeID
	 *
	 * @param {String} nodeID
	 * @param {Socket} socket
	 * @param {Boolean} force
	 * @returns
	 *
	 * @memberof TcpWriter
	 */
	addSocket(nodeID, socket, force) {
		const s = this.sockets.get(nodeID);
		if (!force && s && !s.destroyed)
			return;

		this.sockets.set(nodeID, socket);
	}

	/**
	 * Remove & close socket by nodeID
	 *
	 * @param {String} nodeID
	 */
	removeSocket(nodeID) {
		const socket = this.sockets.get(nodeID);
		if (socket && !socket.destroyed)
			socket.destroy();

		this.sockets.delete(nodeID);
	}

	/**
	 * Close the TCP sockets.
	 *
	 * @memberof TcpWriter
	 */
	close() {
		// Close all live sockets
		this.sockets.forEach((socket) => {
			if (!socket.destroyed)
				socket.end();
		});

		this.sockets.clear();
	}
}

module.exports = TcpWriter;
