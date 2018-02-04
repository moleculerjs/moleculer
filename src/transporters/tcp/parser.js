/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Writable = require("stream").Writable;
const { resolvePacketType } = require("./constants");

/**
 * TCP packet parser
 */
class Parser extends Writable {

	/**
	 * Create an instance of Parser
	 *
	 * @param {*} options
	 */
	constructor(options, maxPacketSize) {
		super(options);

		this.maxPacketSize = maxPacketSize;

		this.buf = null;
	}

	_write(chunk, encoding, cb) {

		let packet = chunk;
		if (this.buf && this.buf.length > 0) {
			// There is previous chunk, concatenate them
			packet = Buffer.concat([this.buf, chunk]);
			this.buf = null;
		}

		// Find all messages from the chunk
		while (packet.length > 0) {

			if (packet.length < 6) {
				// Too short, waiting for the next chunk
				this.buf = Buffer.from(packet);
				return cb();
			}

			if (this.maxPacketSize && packet.length > this.maxPacketSize) {
				return cb(new Error(`Incoming packet is larger than the 'maxPacketSize' limit (${packet.length} > ${this.maxPacketSize})!`));
			}

			// Check the CRC
			const crc = packet[1] ^ packet[2] ^ packet[3] ^ packet[4] ^ packet[5];
			if (crc !== packet[0]) {
				return cb(new Error("Invalid packet CRC!"));
			}

			const length = packet.readInt32BE(1);

			// The chunk contain a message
			if (packet.length >= length) {
				const msg = packet.slice(6, length);
				const type = resolvePacketType(packet[5]);

				this.emit("data", type, msg);

				// Remove processed message from incoming data
				packet = packet.slice(length);
			} else {
				// The chunk is not contain the whole message.
				// Waiting for the next one.
				this.buf = Buffer.from(packet);
				return cb();
			}

		}

		cb();
	}
}

module.exports = Parser;
