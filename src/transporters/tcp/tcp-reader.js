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

		this.sockets = [];
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

				if (reject)
					reject(err);
			});

			server.listen({ port: this.opts.port, exclusive: true }, () => {
				this.opts.port = this.server.address().port;
				this.logger.info(`TCP server is listening on port ${this.opts.port}`);
				this.connected = true;

				resolve(this.opts.port);
				reject = null;
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
		this.sockets.push(socket);

		socket.setNoDelay();

		const address = socket.address().address;
		//this.logger.info(address);
		this.logger.debug(`New TCP client connected from '${address}'`);

		const parser = new Parser(undefined, this.opts.maxPacketSize);
		socket.pipe(parser);

		parser.on("data", (type, message) => {
			//this.logger.info(`TCP data received from '${address}'. Type:`, type);
			//this.logger.info(message.toString());

			this.transporter.onIncomingMessage(type, message);
		});

		parser.on("error", err => {
			this.logger.warn("Packet parser error!", err);
			this.closeSocket(socket, err);
		});

		socket.on("error", err => {
			this.logger.debug(`TCP client '${address}' error!`, err);
			this.closeSocket(socket, err);
		});

		socket.on("close", hadError => {
			this.logger.debug(`TCP client disconnected from '${address}'! Had error:`, !!hadError);
			this.closeSocket(socket);
		});
	}

	/**
	 * Close a client socket
	 *
	 * @param {Socket} socket
	 */
	closeSocket(socket) {
		socket.destroy();

		this.sockets.splice(this.sockets.indexOf(socket), 1);
	}

	/**
	 * Close the TCP server.
	 *
	 * @memberof TcpReader
	 */
	close() {
		if (this.server && this.server.listening) {
			this.server.close();

			// Close all live sockets
			this.sockets.forEach(socket => socket.destroy());
			this.sockets = [];
		}
	}
}

module.exports = TcpReader;
