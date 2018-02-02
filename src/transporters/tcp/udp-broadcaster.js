/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const EventEmitter 	= require("events");
const Promise		= require("bluebird");
const dgram 		= require("dgram");

/**
 * UDP Discovery Server for TcpTransporter
 *
 * @class UdpServer
 * @extends {EventEmitter}
 */
class UdpServer extends EventEmitter {

	/**
	 * Creates an instance of UdpServer.
	 *
	 * @param {any} transporter
	 * @param {any} opts
	 * @memberof UdpServer
	 */
	constructor(transporter, opts) {
		super();

		this.server = null;
		this.discoverTimer = null;

		this.opts = opts;
		this.transporter = transporter;
		this.logger = transporter.logger;
		this.nodeID = transporter.nodeID;
		this.namespace = transporter.broker.namespace;
	}

	/**
	 * Bind an UDP port
	 *
	 * @returns {Promise}
	 * @memberof UdpServer
	 */
	bind() {
		return new Promise((resolve, reject) => {

			const server = dgram.createSocket({type: "udp4", reuseAddr: this.opts.udpReuseAddr });

			server.on("message", this.onMessage.bind(this));

			server.on("error", err => {
				this.logger.error("UDP server binding error!", err);
				reject(err);
			});

			const host = this.opts.udpBindAddress;
			const port = this.opts.multicastPort ? this.opts.multicastPort : (this.opts.broadcastPort || 4445);

			server.bind(port, host, () => {
				this.logger.info(`UDP server is listening on ${port}`);

				if (this.opts.multicastHost) {
					server.addMembership(this.opts.multicastHost);
					server.setMulticastTTL(this.opts.multicastTTL || 1);
				} else {
					server.setBroadcast(true);
				}

				// Send first discover message after 1 sec
				setTimeout(() => this.discover(), 1000);

				this.startDiscovering();

				resolve();
			});

			this.server = server;
		});
	}

	/**
	 * Broadcast a discover message with TCP server port & nodeID
	 *
	 * @memberof UdpServer
	 */
	discover() {
		// Create an UDP beacon message
		const message = Buffer.from([this.namespace, this.nodeID, this.opts.port].join("|"));

		// Get destination
		const host = this.opts.multicastHost ? this.opts.multicastHost : this.opts.broadcastAddress;
		const port = this.opts.multicastPort ? this.opts.multicastPort : (this.opts.broadcastPort || 4445);

		// Send beacon
		this.server.send(message, port, host, (err, bytes) => {
			if (err) {
				this.logger.warn("Discover packet broadcast error.", err);
				return;
			}
			this.logger.info(`Discover packet sent. Size: ${bytes}`);
		});
	}

	/**
	 * Incoming message handler
	 *
	 * @param {Buffer} data
	 * @param {anyObject} rinfo
	 * @returns
	 * @memberof UdpServer
	 */
	onMessage(data, rinfo) {
		const msg = data.toString();
		this.logger.info(`UDP message received from ${rinfo.address}. Size: ${rinfo.size}`);
		this.logger.info(data.toString());

		// TODO: Can it receive multiple messages?
		try {
			const parts = msg.split("|");
			if (parts.length != 3) {
				this.logger.warn("Malformed UDP packet received", msg);
			}
			if (parts[0] == this.namespace)
				this.emit("message", parts[1], rinfo.address, parts[2]);

		} catch(err) {
			this.logger.warn("UDP packet process error!", err, msg, rinfo);
		}
	}

	/**
	 * Start auto discovering
	 *
	 * @memberof UdpServer
	 */
	startDiscovering() {
		if (!this.discoverTimer)
			this.discoverTimer = setInterval(() => this.discover(), (this.opts.multicastPeriod || 60) * 1000);
	}

	/**
	 * Stop auto discovering
	 *
	 * @memberof UdpServer
	 */
	stopDiscovering() {
		if (this.discoverTimer)
			clearInterval(this.discoverTimer);
	}

	/**
	 * Close the binded UDP port.
	 *
	 * @memberof UdpServer
	 */
	close() {
		this.stopDiscovering();

		if (this.server)
			this.server.close();
	}
}

module.exports = UdpServer;
