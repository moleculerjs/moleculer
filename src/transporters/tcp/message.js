/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Writable = require("stream").Writable;

/**
 * TCP message handler
 *
 * @class Message
 */
class Message {

	/**
	 * Creates an instance of Message.
	 *
	 * @memberof Message
	 */
	constructor() {
		this.frames = [];
	}

	/**
	 *
	 *
	 * @returns
	 * @memberof Message
	 */
	frameCount() {
		return this.frames.length;
	}

	/**
	 *
	 *
	 * @static
	 * @param {any} buf
	 * @returns
	 * @memberof Message
	 */
	static fromBuffer(buf) {
		const message = new Message();

		if (buf.length >= 3 + 4) {
			if (buf[0] == 0x4d && buf[1] == 0x4f && buf[2] == 0x4c) {
				let offset = 3;
				const length = buf.readUInt32BE(offset);
				offset += 4;

				if (buf.length < 3 + 4 + length)
					throw new Error("Message is short");

				while (offset < 3 + 4 + length) {
					const frameType = buf.readUInt8(offset);
					offset++;

					const frameLength = buf.readUInt32BE(offset);
					offset += 4;

					const packet = buf.slice(offset, offset + frameLength);
					offset += frameLength;

					message.addFrame(frameType, packet);
				}

			} else
				throw new Error("Invalid message sign");
		} else
			throw new Error("Message has no header");

		return message;
	}

	/**
	 *
	 *
	 * @param {any} type
	 * @param {any} packet
	 * @memberof Message
	 */
	addFrame(type, packet) {
		if (Buffer.isBuffer(packet))
			this.frames.push([type, packet.length, packet]);
		else {
			const buf = Buffer.from(packet);
			this.frames.push([type, buf.length, buf]);
		}
	}

	/**
	 *
	 *
	 * @param {any} type
	 * @returns
	 * @memberof Message
	 */
	getFrame(type) {
		return this.frames.find(frame => type == frame[0]);
	}

	getFrameData(type) {
		const frame = this.getFrame(type);
		if (frame)
			return frame[2];
	}

	/**
	 *
	 *
	 * @returns
	 * @memberof Message
	 */
	toBuffer() {
		let offset = 0;
		let length = this.frames.reduce((l, item) => l + 1 + 4 + item[1], 0);

		let buf = Buffer.allocUnsafe(3 + 4 + length);

		// Header
		offset = buf.write("MOL", offset, 3, "ascii");

		// Full message length
		offset = buf.writeUInt32BE(length, offset);

		// Frames
		this.frames.forEach(([type, len, packet]) => {
			offset = buf.writeUInt8(type, offset);
			offset = buf.writeUInt32BE(len, offset);

			if (Buffer.isBuffer(packet)) {
				offset += packet.copy(buf, offset);
			} else {
				offset = buf.write(packet, offset, len);
			}
		});

		return buf;
	}

	static getParser() {
		return new Parser();
	}
}


class Parser extends Writable {

	constructor(options) {
		super(options);

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

			if (packet.length > 2 * 1024 * 1024) { // TODO
				cb(new Error(`Incoming packet is larger than the 'maxPacketSize' limit (${packet.length} > ${maxPacketSize})!`));
			}

			// Check the CRC
			const crc = packet[1] ^ packet[2] ^ packet[3] ^ packet[4] ^ packet[5];
			if (crc !== packet[0]) {
				cb(new Error("Invalid packet CRC!"));
			}
			const length = (packet[1] << 24) | (packet[1] << 16) | (packet[1] << 8) | (packet[1] & 0xff);

			// The chunk contain a message
			if (packet.length >= length) {
				const msg = packet.slice(0, length);
				const type = packet[5];

				this.emit("packet", type, msg);

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

Message.Parser = Parser;

module.exports = Message;
