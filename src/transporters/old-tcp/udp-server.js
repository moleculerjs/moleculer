/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const EventEmitter 	= require("events");
const Promise		= require("bluebird");
const dgram 		= require("dgram");

const Message		= require("./message");

const { MSG_FRAME_NAMESPACE, MSG_FRAME_NODEID, MSG_FRAME_PORT } = require("./constants");

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

		this.nodeIDBuffer = Buffer.from(this.nodeID/* + "\0"*/);
		this.namespaceBuffer = Buffer.from(this.namespace/* + "\0"*/);
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

			server.bind(this.opts.udpPort, this.opts.udpAddress, () => {
				this.logger.info(`UDP server is listening on ${this.opts.udpAddress}:${this.opts.udpPort}`);
				server.setBroadcast(true);
				this.startDiscovering();
				resolve();
				this.discover();
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
		/*
		let len = 4 + this.namespaceBuffer.length + this.nodeIDBuffer.length;
		let buf = Buffer.allocUnsafe(3 + 4 + len);
		let offset = 0;
		offset = buf.write("MOL", offset, 3, "ascii");
		offset = buf.writeInt32BE(len, offset);
		offset = buf.writeInt16BE(this.opts.tcpPort, offset);
		offset += this.namespaceBuffer.copy(buf, 7);
		offset += this.nodeIDBuffer.copy(buf, 7);
*/

		const message = new Message();
		message.addFrame(MSG_FRAME_NAMESPACE, this.namespaceBuffer);
		message.addFrame(MSG_FRAME_NODEID, this.nodeIDBuffer);
		message.addFrame(MSG_FRAME_PORT, "" + this.opts.tcpPort);


		this.server.send(message.toBuffer(), this.opts.udpPort, this.opts.udpBroadcastAddress, (err, bytes) => {
			if (err) {
				this.logger.warn("Discover packet broadcast error.", err);
				return;
			}
			//this.logger.info(`Discover packet sent. Size: ${bytes}`);
		});
	}

	/**
	 * Incoming message handler
	 *
	 * @param {Buffer} msg
	 * @param {anyObject} rinfo
	 * @returns
	 * @memberof UdpServer
	 */
	onMessage(msg, rinfo) {
		//this.logger.info(`UDP message received from ${rinfo.address}. Size: ${rinfo.size}`);
		//this.logger.info(msg.toString());

		// TODO: Can it receive multiple messages?

		try {
			const message = Message.fromBuffer(msg);
			const ns = message.getFrameData(MSG_FRAME_NAMESPACE);
			if (ns == this.namespace)
				this.emit("message", message, rinfo);

		} catch(err) {
			this.emit("message error", err, msg, rinfo);
		}
	}

	/**
	 * Start auto discovering
	 *
	 * @memberof UdpServer
	 */
	startDiscovering() {
		if (!this.discoverTimer)
			this.discoverTimer = setInterval(() => this.discover(), 5 * 1000);
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
