const _ 								= require("lodash");
const crypto 							= require("crypto");

const iv = Buffer.from(crypto.randomBytes(16));
const password = Buffer.from(crypto.randomBytes(32));

module.exports = {
	name: "aes",
	actions: {
		encrypt(ctx) {
			const encrypter = crypto.createCipheriv("aes-256-ctr", password, iv);
			return ctx.params.pipe(encrypter);
		},

		decrypt(ctx) {
			const decrypter = crypto.createDecipheriv("aes-256-ctr", password, iv);
			return ctx.params.pipe(decrypter);
		}
	}
};
