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
 * TCP Server for TcpTransporter
 *
 * @class TcpServer
 * @extends {EventEmitter}
 */
class TcpServer extends EventEmitter {

	/**
	 * Creates an instance of TcpServer.
	 *
	 * @param {any} transporter
	 * @param {any} opts
	 * @memberof TcpServer
	 */
	constructor(transporter, opts) {
		super();

		this.server = null;
		this.opts = opts;
		this.transporter = transporter;
		this.logger = transporter.logger;
		this.nodeID = transporter.nodeID;

		this.nodeIDBuffer = Buffer.from(this.nodeID);
	}

	/**
	 * Listening a TCP port
	 *
	 * @returns {Promise}
	 * @memberof TcpServer
	 */
	listen() {
		return new Promise((resolve, reject) => {

			const server = net.createServer(socket => this.emit("connect", socket));

			server.on("error", err => {
				this.logger.error("Server error.", err);
				reject(err);
			});

			server.listen(this.opts.tcpPort, () => {
				this.opts.tcpPort = this.server.address().port;
				this.logger.info(`TCP server is listening on ${this.opts.tcpPort}`);
				this.connected = true;

				resolve(this.opts.tcpPort);
			});

			this.server = server;
		});
	}

	static connect(host, port) {
		return new Promise((resolve, reject) => {
			const socket = net.connect({ host, port }, () => resolve(socket));

			socket.on("error", err => {
				reject(err);
			});

			socket.unref();
		});
	}

	/**
	 * Close the TCP server.
	 *
	 * @memberof TcpServer
	 */
	close() {
		if (this.server && this.server.listening)
			this.server.close();
	}
}

module.exports = TcpServer;
