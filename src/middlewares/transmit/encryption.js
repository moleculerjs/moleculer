/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const crypto = require("crypto");

module.exports = function EncryptionMiddleware(password, algorithm = "aes-256-cbc", iv) {
	return {

		transporterSend(next) {
			return (topic, data) => {
				const encrypter = iv ? crypto.createCipheriv(algorithm, password, iv) : crypto.createCipher(algorithm, password);
				const res = Buffer.concat([encrypter.update(data), encrypter.final()]);
				return next(topic, res);
			};
		},

		transporterReceive(next) {
			return (cmd, data) => {
				const decrypter = iv ? crypto.createDecipheriv(algorithm, password, iv) : crypto.createDecipher(algorithm, password);
				const res = Buffer.concat([decrypter.update(data), decrypter.final()]);
				return next(cmd, res);
			};
		}
	};
};
