/* eslint-disable no-console */

const Promise 							= require("bluebird");
const _ 								= require("lodash");
const fs 								= require("fs");
//const { ServiceBroker } 				= require("../../../");
const { createBrokers } 				= require("../helper");
let { extendExpect, protectReject } 	= require("../../unit/utils");
const crypto 							= require("crypto");

extendExpect(expect);

const iv = Buffer.from(crypto.randomBytes(16));
const password = Buffer.from(crypto.randomBytes(32));

const AESService = {
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

const filename = __dirname + "/assets/banner.png";
const filename2 = __dirname + "/assets/received.png";

module.exports = function(transporter, serializer, meta)  {

	describe("Test streaming", () => {

		// Creater brokers
		const [master, slaveA, slaveB] = createBrokers(["master", "slaveA", "slaveB"], {
			namespace: "streaming",
			transporter,
			serializer
		});
		// Load services
		[slaveA, slaveB].forEach(broker => broker.createService(AESService));

		let originalHash;

		// Start & Stop
		beforeAll(() => {
			return Promise.all([master.start(), slaveA.start(), slaveB.start()])
				.then(() => getSHA(filename))
				.then(hash => originalHash = hash);
		});
		afterAll(() => Promise.all([master.stop(), slaveA.stop(), slaveB.stop()]));

		it("should encode & decode the data and send as streams", () => {
			return master.waitForServices("aes")
				.then(() => Promise.all(_.times(1, () => {
					const s1 = fs.createReadStream(filename);
					return master.call("aes.encrypt", s1)
						.then(s2 => master.call("aes.decrypt", s2))
						.then(s3 => {
							return new Promise(resolve => {
								const s4 = fs.createWriteStream(filename2);
								s4.on("close", () => getSHA(filename2).then(hash => resolve(hash)));
								s3.pipe(s4);
							});
						})
						.catch(protectReject)
						.then(hash => {
							expect(hash).toBe(originalHash);
							fs.unlinkSync(filename2);
						});
				})));
		});
	});

};

function getSHA(filename) {
	return new Promise((resolve, reject) => {
		let hash = crypto.createHash("sha1");
		let stream = fs.createReadStream(filename);
		stream.on("error", err => reject(err));
		stream.on("data", chunk => hash.update(chunk));
		stream.on("end", () => resolve(hash.digest("hex")));
	});
}
