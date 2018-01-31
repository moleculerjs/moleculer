/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const net 			= require("net");
const EventEmitter 	= require("events");
const Promise		= require("bluebird");
const Parser		= require("./parser");

/**
 * TCP Reader for TcpTransporter
 *
 * @class TcpReader
 * @extends {EventEmitter}
 */
class TcpReader extends EventEmitter {

	/**
	 * Creates an instance of TcpReader.
	 *
	 * @param {any} transporter
	 * @param {any} opts
	 * @memberof TcpReader
	 */
	constructor(transporter, opts) {
		super();

		this.server = null;
		this.opts = opts;
		this.transporter = transporter;
		this.logger = transporter.logger;
		//this.nodeID = transporter.nodeID;
	}

	/**
	 * Listening a TCP port
	 *
	 * @returns {Promise}
	 * @memberof TcpReader
	 */
	listen() {
		return new Promise((resolve, reject) => {

			const server = net.createServer(socket => this.onTcpClientConnected(socket));

			server.on("error", err => {
				this.logger.error("Server error.", err);
				reject(err);
			});

			server.listen(this.opts.port, () => {
				this.opts.port = this.server.address().port;
				this.logger.info(`TCP server is listening on ${this.opts.port}.`);
				this.connected = true;

				resolve(this.opts.port);
			});

			this.server = server;
		});
	}

	/**
	 * New TCP socket is received.
	 *
	 * @param {Socket} socket
	 * @memberof TcpReader
	 */
	onTcpClientConnected(socket) {
		socket.setNoDelay();

		const address = socket.address().address;
		//this.logger.info(address);
		this.logger.info(`TCP client '${address}' is connected.`);

		const parser = new Parser();
		socket.pipe(parser);

		parser.on("data", (type, message) => {
			this.logger.info(`TCP client '${address}' data received. Type:`, type);
			this.logger.info(message.toString());

			// TODO this.messageHandler(type, message);
		});

		parser.on("error", err => {
			this.logger.warn("Packet parser error!", err);
		});

		socket.on("error", err => {
			this.logger.warn(`TCP client '${address}' error!`, err);
			this.removeSocket(socket);
		});

		socket.on("close", hadError => {
			this.logger.info(`TCP client '${address}' is disconnected! Had error:`, hadError);
			this.removeSocket(socket);
		});
	}

	/**
	 * Close the TCP server.
	 *
	 * @memberof TcpReader
	 */
	close() {
		if (this.server && this.server.listening)
			this.server.close();
	}
}

module.exports = TcpReader;
