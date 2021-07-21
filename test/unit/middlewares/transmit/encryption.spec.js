const crypto = require("crypto");
const ServiceBroker = require("../../../../src/service-broker");
const Middleware = require("../../../../src/middlewares").Transmit.Encryption;

describe("Test EncryptionMiddleware", () => {
	const broker = new ServiceBroker({ logger: false });
	const password = "mw-test";

	it("should register hooks", () => {
		const mw = Middleware(password);
		expect(mw.transporterSend).toBeInstanceOf(Function);
		expect(mw.transporterReceive).toBeInstanceOf(Function);
	});

	it("should encrypt the data", () => {
		const mw = Middleware(password);

		const meta = {};
		const next = jest.fn();
		const send = mw.transporterSend.call(broker, next);
		const encrypter = crypto.createCipher("aes-256-cbc", password);

		send("topic", Buffer.from("plaintext data"), meta);

		expect(next).toHaveBeenCalledTimes(1);
		expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
		expect(next.mock.calls[0][1]).toEqual(
			Buffer.concat([encrypter.update("plaintext data"), encrypter.final()])
		);
	});

	it("should encrypt the data with IV", () => {
		const pass = crypto.randomBytes(32);
		const iv = crypto.randomBytes(16);
		const mw = Middleware(pass, "aes-256-ctr", iv);

		const meta = {};
		const next = jest.fn();
		const send = mw.transporterSend.call(broker, next);
		const encrypter = crypto.createCipheriv("aes-256-ctr", pass, iv);

		send("topic", Buffer.from("plaintext data"), meta);

		expect(next).toHaveBeenCalledTimes(1);
		expect(next).toHaveBeenCalledWith("topic", expect.any(Buffer), meta);
		expect(next.mock.calls[0][1]).toEqual(
			Buffer.concat([encrypter.update("plaintext data"), encrypter.final()])
		);
	});

	it("should decrypt data with IV", () => {
		const mw = Middleware(password);

		const meta = {};
		const next = jest.fn();
		const receive = mw.transporterReceive.call(broker, next);
		const encrypter = crypto.createCipher("aes-256-cbc", password);
		const encryptedData = Buffer.concat([
			encrypter.update("plaintext data"),
			encrypter.final()
		]);

		receive("topic", encryptedData, meta);
		expect(next).toHaveBeenCalledTimes(1);
		expect(next).toHaveBeenCalledWith("topic", Buffer.from("plaintext data"), meta);
	});

	it("should decrypt data", () => {
		const pass = crypto.randomBytes(32);
		const iv = crypto.randomBytes(16);
		const mw = Middleware(pass, "aes-256-ctr", iv);

		const meta = {};
		const next = jest.fn();
		const receive = mw.transporterReceive.call(broker, next);
		const encrypter = crypto.createCipheriv("aes-256-ctr", pass, iv);
		const encryptedData = Buffer.concat([
			encrypter.update("plaintext data"),
			encrypter.final()
		]);

		receive("topic", encryptedData, meta);
		expect(next).toHaveBeenCalledTimes(1);
		expect(next).toHaveBeenCalledWith("topic", Buffer.from("plaintext data"), meta);
	});
});
