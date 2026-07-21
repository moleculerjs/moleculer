/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const crypto = require("crypto");

/**
 * This is a AES encryption middleware to protect the whole
 * Moleculer transporter communication with AES.
 *
 * @param {String|Buffer} password
 * @param {String?} algorithm
 * @param {String|Buffer?} iv Required for IV-based algorithms (e.g. CBC, CTR). If omitted,
 *                            the algorithm must not use an IV (e.g. ECB) and the password
 *                            must match the key length of the algorithm.
 */
module.exports = function EncryptionMiddleware(password, algorithm = "aes-256-cbc", iv) {
	if (!password || password.length === 0) {
		/* istanbul ignore next */
		throw new Error("Must be set a password for encryption");
	}

	let logger;

	return {
		name: "Encryption",

		created() {
			logger = this.logger;
			/* istanbul ignore next */
			this.logger.info(`The transmission is ENCRYPTED by '${algorithm}'.`);
		},

		transporterSend(next) {
			return (topic, data, meta) => {
				const encrypter = crypto.createCipheriv(
					algorithm,
					password,
					iv != null ? iv : null
				);
				const res = Buffer.concat([encrypter.update(data), encrypter.final()]);
				return next(topic, res, meta);
			};
		},

		transporterReceive(next) {
			return (cmd, data, s) => {
				try {
					const decrypter = crypto.createDecipheriv(
						algorithm,
						password,
						iv != null ? iv : null
					);
					const res = Buffer.concat([decrypter.update(data), decrypter.final()]);
					return next(cmd, res, s);
				} catch (err) {
					logger.error("Received packet decryption error.", err);
				}
			};
		}
	};
};
