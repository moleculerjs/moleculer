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

		this.counter = 0;
	}

	/**
	 * Bind an UDP port
	 *
	 * @returns {Promise}
	 * @memberof UdpServer
	 */
	bind() {
		return new Promise((resolve, reject) => {
			if (this.opts.udpDiscovery === false) {
				this.logger.info("UDP Discovery is disabled.");
				return resolve();
			}

			try {
				const server = dgram.createSocket({type: "udp4", reuseAddr: this.opts.udpReuseAddr });

				server.on("message", this.onMessage.bind(this));

				server.on("error", err => {
					this.logger.error("UDP server binding error!", err);

					if (reject)
						reject(err);
				});

				const host = this.opts.udpBindAddress;
				const port = this.opts.broadcastPort || 4445;

				server.bind({ port, host, exclusive: true }, () => {
					this.logger.info(`UDP Discovery Server is listening on port ${port}`);

					try {
						if (this.opts.multicastAddress) {
							server.addMembership(this.opts.multicastAddress);
							server.setMulticastTTL(this.opts.multicastTTL || 1);
						} else {
							server.setBroadcast(true);
						}
					} catch(err) {
						// Silent exception. In cluster it throw error
					}

					// Send first discover message after 1 sec
					setTimeout(() => this.discover(), 1000);

					this.startDiscovering();

					resolve();

					reject = null;
				});

				this.server = server;

			} catch(err) {
				this.logger.warn("Unable to start UDP Discovery Server. Message:", err.message);
				resolve();
			}

		});
	}

	/**
	 * Broadcast a discover message with TCP server port & nodeID
	 *
	 * @memberof UdpServer
	 */
	discover() {
		this.counter++;

		// Create an UDP beacon message
		const message = Buffer.from([this.namespace, this.nodeID, this.opts.port].join("|"));

		// Get destination
		const host = this.opts.multicastAddress ? this.opts.multicastAddress : this.opts.broadcastAddress;
		const port = this.opts.broadcastPort || 4445;

		// Send beacon
		this.server.send(message, port, host, (err/*, bytes*/) => {
			/* istanbul ignore next*/
			if (err) {
				this.logger.warn("Discover packet broadcast error.", err);
				return;
			}
			this.logger.debug("UDP Discover packet sent. Counter:", this.counter);
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
		this.logger.debug(`UDP message received from ${rinfo.address}.`, data.toString());

		try {
			const parts = msg.split("|");
			if (parts.length != 3) {
				this.logger.debug("Malformed UDP packet received", msg);
				return;
			}
			if (parts[0] == this.namespace)
				this.emit("message", parts[1], rinfo.address, parseInt(parts[2], 10));

		} catch(err) {
			/* istanbul ignore next */
			this.logger.debug("UDP packet process error!", err, msg, rinfo);
		}
	}

	/**
	 * Start auto discovering
	 *
	 * @memberof UdpServer
	 */
	startDiscovering() {
		if (!this.discoverTimer) {
			this.discoverTimer = setInterval(() => {
				this.discover();

				if (this.opts.maxUdpDiscovery && this.counter >= this.opts.maxUdpDiscovery)
					this.stopDiscovering();

			}, (this.opts.broadcastPeriod || 5) * 1000);

			this.discoverTimer.unref();

			this.logger.info("UDP discovery started.");
		}
	}

	/**
	 * Stop auto discovering
	 *
	 * @memberof UdpServer
	 */
	stopDiscovering() {
		if (this.discoverTimer) {
			clearInterval(this.discoverTimer);
			this.discoverTimer = null;

			this.logger.info("UDP discovery stopped.");
		}

	}

	/**
	 * Close the binded UDP port.
	 *
	 * @memberof UdpServer
	 */
	close() {
		this.stopDiscovering();

		if (this.server) {
			this.server.close();
			this.server = null;
		}
	}
}

module.exports = UdpServer;
