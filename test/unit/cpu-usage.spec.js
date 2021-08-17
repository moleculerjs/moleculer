"use strict";

const os = require("os");
jest.useFakeTimers();

const getCpuUsage = require("../../src/cpu-usage");

describe("getCpuUsage", () => {
	it("should report cpu usage", () => {
		os.cpus = jest
			.fn()
			.mockImplementationOnce(() => [
				{
					times: {
						user: 1,
						nice: 2,
						sys: 3,
						idle: 4,
						irq: 5
					}
				}
			])
			.mockImplementationOnce(() => [
				{
					times: {
						user: 2,
						nice: 3,
						sys: 4,
						idle: 5,
						irq: 6
					}
				}
			])
			.mockImplementationOnce(() => [
				{
					times: {
						user: 3,
						nice: 3,
						sys: 3,
						idle: 3,
						irq: 3
					}
				}
			]);

		const result = getCpuUsage(100);
		jest.runAllTimers();
		return expect(result).resolves.toEqual({ avg: 70, usages: [70] });
	});

	it("should return rejected promise on missing cpu data", () => {
		os.cpus = jest.fn().mockImplementationOnce(() => undefined);

		const result = getCpuUsage(100);
		jest.runAllTimers();
		return expect(result).rejects.toBeInstanceOf(Error);
	});
});
