/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Writable = require("stream").Writable;

/**
 *
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

					const data = buf.slice(offset, offset + frameLength);
					offset += frameLength;

					message.addFrame(frameType, data);
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
	 * @param {any} data
	 * @memberof Message
	 */
	addFrame(type, data) {
		if (Buffer.isBuffer(data))
			this.frames.push([type, data.length, data]);
		else {
			const buf = Buffer.from(data);
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
		this.frames.forEach(([type, len, data]) => {
			offset = buf.writeUInt8(type, offset);
			offset = buf.writeUInt32BE(len, offset);

			if (Buffer.isBuffer(data)) {
				offset += data.copy(buf, offset);
			} else {
				offset = buf.write(data, offset, len);
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

		let data = chunk;
		if (this.buf && this.buf.length > 0) {
			// There is previous chunk, concatenate them
			data = Buffer.concat([this.buf, chunk]);
			this.buf = null;
		}

		// Find all messages from the chunk
		while (data.length > 0) {

			if (data.length < 3 + 4) {
				// Too short, waiting for the next chunk
				this.buf = Buffer.from(data);
				return cb();
			}

			// Check the prefix
			if (data[0] == 0x4d && data[1] == 0x4f && data[2] == 0x4c) {
				const msgLen = data.readUInt32BE(3);
				const length = msgLen + 3 + 4;

				// Th chunk contain a message
				if (data.length >= length) {
					const part = data.slice(0, length);
					let msg = Message.fromBuffer(part);

					this.emit("data", msg);

					data = data.slice(length);
				} else {
					// The chunk is not contain the whole message.
					// Waiting for the next one.
					this.buf = Buffer.from(data);
					return cb();
				}

			} else {
				// Invalid data. It doesn't start with prefix.
				cb(new Error("Invalid packet"));
			}
		}

		cb();
	}
}

Message.Parser = Parser;

module.exports = Message;
