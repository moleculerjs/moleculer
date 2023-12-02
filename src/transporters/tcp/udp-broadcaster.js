/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const EventEmitter = require("events");
const os = require("os");
const dgram = require("dgram");
const ipaddr = require("ipaddr.js");
const { randomInt } = require("../../../src/utils");

/**
 * Import types
 *
 * @typedef {import("./udp-broadcaster")} UdpBroadcasterClass
 */

/**
 * UDP Discovery Server for TcpTransporter
 *
 * @class UdpServer
 * @extends {EventEmitter}
 * @implements {UdpBroadcasterClass}
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

		this.servers = [];
		this.discoverTimer = null;

		this.opts = opts;
		this.transporter = transporter;
		this.logger = transporter.logger;
		this.nodeID = transporter.nodeID;
		this.namespace = transporter.broker.namespace;
		this.Promise = transporter.broker.Promise;

		this.counter = 0;
	}

	/**
	 * Bind UDP port
	 *
	 * @returns {Promise}
	 * @memberof UdpServer
	 */
	bind() {
		if (this.opts.udpDiscovery === false) {
			this.logger.info("UDP Discovery is disabled.");
			return this.Promise.resolve();
		}

		return this.Promise.resolve()
			.then(() => {
				// Start multicast listener
				if (this.opts.udpMulticast) {
					// Bind only one interface
					if (this.opts.udpBindAddress)
						return this.startServer(
							this.opts.udpBindAddress,
							this.opts.udpPort,
							this.opts.udpMulticast,
							this.opts.udpMulticastTTL
						);

					// Binding all interfaces
					const ipList = this.getInterfaceAddresses();
					return this.Promise.all(
						ipList.map(ip =>
							this.startServer(
								ip,
								this.opts.udpPort,
								this.opts.udpMulticast,
								this.opts.udpMulticastTTL
							)
						)
					);
				}
			})
			.then(() => {
				// Start broadcast listener
				if (this.opts.udpBroadcast)
					return this.startServer(this.opts.udpBindAddress, this.opts.udpPort);
			})
			.then(() => {
				// Send first discover message after ~1 sec
				setTimeout(() => this.discover(), randomInt(500) + 500);

				this.startDiscovering();
			});
	}

	/**
	 * Start an UDP broadcast/multicast server
	 *
	 * @param {String?} host
	 * @param {Number?} port
	 * @param {String=} multicastAddress
	 * @param {Number=} ttl
	 */
	startServer(host, port, multicastAddress, ttl) {
		return new this.Promise(resolve => {
			try {
				const server = dgram.createSocket({
					type: "udp4",
					reuseAddr: this.opts.udpReuseAddr
				});

				server.on("message", this.onMessage.bind(this));

				server.on("error", err => {
					this.logger.warn("UDP server binding error!", err);
					resolve();
				});

				host = host || "0.0.0.0";
				port = port || 4445;

				/** @type {import("dgram").BindOptions} */
				const bindOptions = { port, address: host, exclusive: true };

				server.bind(bindOptions, () => {
					try {
						if (multicastAddress) {
							this.logger.info(
								`UDP Multicast Server is listening on ${host}:${port}. Membership: ${multicastAddress}`
							);
							server.setMulticastInterface(host);
							server.addMembership(multicastAddress, host);
							server.setMulticastTTL(ttl || 1);
							server.destinations = [multicastAddress];
						} else {
							this.logger.info(
								`UDP Broadcast Server is listening on ${host}:${port}`
							);
							server.setBroadcast(true);

							if (typeof this.opts.udpBroadcast == "string")
								server.destinations = [this.opts.udpBroadcast];
							else if (Array.isArray(this.opts.udpBroadcast))
								server.destinations = this.opts.udpBroadcast;
							else server.destinations = this.getBroadcastAddresses();

							this.logger.info(
								"    Broadcast addresses:",
								server.destinations.join(", ")
							);
						}
					} catch (err) {
						// In cluster it throw error
						this.logger.debug("UDP multicast membership error. Message:", err.message);
					}

					this.servers.push(server);

					resolve();
				});
			} catch (err) {
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
		if (this.servers.length === 0) return;

		this.counter++;

		// Create an UDP discover message
		const message = Buffer.from([this.namespace, this.nodeID, this.opts.port].join("|"));
		const port = this.opts.udpPort || 4445;

		this.servers.forEach(server => {
			if (!server.destinations) return;

			server.destinations.forEach(host => {
				// Send discover message
				server.send(message, port, host, (err /*, bytes*/) => {
					/* istanbul ignore next*/
					if (err) {
						this.logger.warn(
							`Discovery packet broadcast error to '${host}:${port}'. Error`,
							err
						);
						return;
					}
					this.logger.debug(`Discovery packet sent to '${host}:${port}'`);
				});
			});
		});
	}

	/**
	 * Incoming message handler
	 *
	 * @param {Buffer} data
	 * @param {Record<string, any>} rinfo
	 * @returns
	 * @memberof UdpServer
	 */
	onMessage(data, rinfo) {
		const msg = data.toString();
		this.logger.debug(`UDP message received from ${rinfo.address}.`, data.toString());

		try {
			const parts = msg.split("|");
			if (parts.length !== 3) {
				this.logger.debug("Malformed UDP packet received", msg);
				return;
			}
			if (parts[0] == this.namespace)
				this.emit("message", parts[1], rinfo.address, parseInt(parts[2], 10));
		} catch (err) {
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
			this.discoverTimer = setInterval(
				() => {
					this.discover();

					if (this.opts.udpMaxDiscovery && this.counter >= this.opts.udpMaxDiscovery)
						this.stopDiscovering();
				},
				(this.opts.udpPeriod || 30) * 1000
			);

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

		this.servers.forEach(server => server.close());
		this.servers = [];
	}

	/**
	 * Get IPv4 broadcast addresses for all interfaces
	 *
	 * @returns {Array<String>}
	 * @memberof UdpServer
	 */
	getBroadcastAddresses() {
		const list = [];
		const interfaces = os.networkInterfaces();
		for (let iface in interfaces) {
			for (let i in interfaces[iface]) {
				const f = interfaces[iface][i];
				if (f.family === "IPv4") {
					list.push(ipaddr.IPv4.broadcastAddressFromCIDR(f.cidr).toString());
				}
			}
		}
		return list;
	}

	/**
	 * Get all interface IPv4 addresses
	 *
	 * @returns {Array<String>}
	 * @memberof UdpServer
	 */
	getInterfaceAddresses() {
		const list = [];
		const interfaces = os.networkInterfaces();
		for (let iface in interfaces) {
			for (let i in interfaces[iface]) {
				const f = interfaces[iface][i];
				if (f.family === "IPv4") {
					list.push(f.address);
				}
			}
		}
		return list;
	}
}

module.exports = UdpServer;
