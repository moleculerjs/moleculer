"use strict";

jest.mock("cluster", () => ({
	isPrimary: true,
	isMaster: true,
	fork: jest.fn(),
	on: jest.fn(),
	setupPrimary: jest.fn(),
	disconnect: jest.fn(),
	worker: null
}));

const cluster = require("cluster");
const MoleculerRunner = require("../../src/runner");

describe("Test MoleculerRunner worker node args", () => {
	const originalNodeOptions = process.env.MOLECULER_WORKER_NODE_OPTIONS;
	const originalReserveMb = process.env.MOLECULER_AUTO_WORKER_HEAP_RESERVE;

	afterEach(() => {
		delete process.env.MOLECULER_WORKER_NODE_OPTIONS;
		delete process.env.MOLECULER_AUTO_WORKER_HEAP_RESERVE;
		if (originalNodeOptions !== undefined) {
			process.env.MOLECULER_WORKER_NODE_OPTIONS = originalNodeOptions;
		}
		if (originalReserveMb !== undefined) {
			process.env.MOLECULER_AUTO_WORKER_HEAP_RESERVE = originalReserveMb;
		}
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe("parseNodeArgsString", () => {
		const runner = new MoleculerRunner();

		it("should return empty array for empty values", () => {
			expect(runner.parseNodeArgsString()).toEqual([]);
			expect(runner.parseNodeArgsString(null)).toEqual([]);
			expect(runner.parseNodeArgsString("")).toEqual([]);
			expect(runner.parseNodeArgsString("   ")).toEqual([]);
		});

		it("should split node args by whitespace", () => {
			expect(
				runner.parseNodeArgsString("--max-old-space-size=768 --trace-warnings")
			).toEqual(["--max-old-space-size=768", "--trace-warnings"]);
		});

		it("should keep quoted tokens intact", () => {
			expect(runner.parseNodeArgsString(`--require "./path with space.js"`)).toEqual([
				"--require",
				"./path with space.js"
			]);
			expect(runner.parseNodeArgsString(`--require './path with space.js'`)).toEqual([
				"--require",
				"./path with space.js"
			]);
		});

		it("should flatten arrays", () => {
			expect(
				runner.parseNodeArgsString(["--max-old-space-size=256", "--trace-warnings"])
			).toEqual(["--max-old-space-size=256", "--trace-warnings"]);
		});
	});

	describe("resolveWorkerNodeArgs", () => {
		it("should merge env and CLI flag args", () => {
			process.env.MOLECULER_WORKER_NODE_OPTIONS = "--max-old-space-size=512";
			const runner = new MoleculerRunner();
			runner.flags = { workerNodeArgs: "--trace-warnings" };

			expect(runner.resolveWorkerNodeArgs()).toEqual([
				"--max-old-space-size=512",
				"--trace-warnings"
			]);
		});

		it("should return empty array when neither env nor flag is set", () => {
			const runner = new MoleculerRunner();
			runner.flags = {};
			expect(runner.resolveWorkerNodeArgs()).toEqual([]);
		});
	});

	describe("processFlags", () => {
		it("should parse --worker-node-args", () => {
			const runner = new MoleculerRunner();
			runner.processFlags([
				"node",
				"moleculer-runner",
				"--worker-node-args=--max-old-space-size=768 --trace-warnings",
				"services"
			]);

			expect(runner.flags.workerNodeArgs).toBe(
				"--max-old-space-size=768 --trace-warnings"
			);
		});

		it("should parse short -w alias", () => {
			const runner = new MoleculerRunner();
			runner.processFlags([
				"node",
				"moleculer-runner",
				"-w=--max-old-space-size-percentage=25",
				"services"
			]);

			expect(runner.flags.workerNodeArgs).toBe("--max-old-space-size-percentage=25");
		});

		it("should parse --auto-worker-heap-reserve", () => {
			const runner = new MoleculerRunner();
			runner.processFlags([
				"node",
				"moleculer-runner",
				"--instances",
				"3",
				"--auto-worker-heap-reserve",
				"1024",
				"services"
			]);

			expect(runner.flags.autoWorkerHeapReserve).toBe(1024);
		});
	});

	describe("buildWorkerExecArgv with --auto-worker-heap-reserve", () => {
		it("should split remaining memory equally across workers", () => {
			const runner = new MoleculerRunner();
			runner.flags = { autoWorkerHeapReserve: 1024 };
			jest.spyOn(runner, "getAvailableMemoryMb").mockReturnValue(4096);

			expect(runner.buildWorkerExecArgv(3)).toEqual(["--max-old-space-size=1024"]);
		});

		it("should override conflicting heap flags from worker-node-args", () => {
			const runner = new MoleculerRunner();
			runner.flags = {
				autoWorkerHeapReserve: 512,
				workerNodeArgs: "--max-old-space-size=999 --trace-warnings"
			};
			jest.spyOn(runner, "getAvailableMemoryMb").mockReturnValue(4096);

			expect(runner.buildWorkerExecArgv(2)).toEqual([
				"--trace-warnings",
				"--max-old-space-size=1792"
			]);
		});

		it("should read reserve from MOLECULER_AUTO_WORKER_HEAP_RESERVE", () => {
			process.env.MOLECULER_AUTO_WORKER_HEAP_RESERVE = "768";
			const runner = new MoleculerRunner();
			runner.flags = {};
			jest.spyOn(runner, "getAvailableMemoryMb").mockReturnValue(3072);

			expect(runner.buildWorkerExecArgv(3)).toEqual(["--max-old-space-size=768"]);
		});

		it("should throw when reserve leaves no heap for workers", () => {
			const runner = new MoleculerRunner();
			runner.flags = { autoWorkerHeapReserve: 4096 };
			jest.spyOn(runner, "getAvailableMemoryMb").mockReturnValue(4096);

			expect(() => runner.buildWorkerExecArgv(3)).toThrow(
				/Cannot auto-balance worker heap/
			);
		});
	});

	describe("startWorkers", () => {
		it("should call setupPrimary with worker execArgv", () => {
			const runner = new MoleculerRunner();
			runner.flags = { workerNodeArgs: "--max-old-space-size=768" };

			runner.startWorkers(2);

			expect(cluster.setupPrimary).toHaveBeenCalledTimes(1);
			expect(cluster.setupPrimary).toHaveBeenCalledWith({
				execArgv: [...process.execArgv, "--max-old-space-size=768"]
			});
			expect(cluster.fork).toHaveBeenCalledTimes(2);
		});

		it("should not call setupPrimary when no worker args are set", () => {
			const runner = new MoleculerRunner();
			runner.flags = {};

			runner.startWorkers(1);

			expect(cluster.setupPrimary).not.toHaveBeenCalled();
			expect(cluster.fork).toHaveBeenCalledTimes(1);
		});

		it("should apply MOLECULER_WORKER_NODE_OPTIONS via setupPrimary", () => {
			process.env.MOLECULER_WORKER_NODE_OPTIONS =
				"--max-old-space-size=256 --no-warnings";
			const runner = new MoleculerRunner();
			runner.flags = {};

			runner.startWorkers(1);

			expect(cluster.setupPrimary).toHaveBeenCalledWith({
				execArgv: [
					...process.execArgv,
					"--max-old-space-size=256",
					"--no-warnings"
				]
			});
		});

		it("should apply auto heap from --auto-worker-heap-reserve", () => {
			const runner = new MoleculerRunner();
			runner.flags = { autoWorkerHeapReserve: 1024 };
			jest.spyOn(runner, "getAvailableMemoryMb").mockReturnValue(4096);

			runner.startWorkers(3);

			expect(cluster.setupPrimary).toHaveBeenCalledWith({
				execArgv: [...process.execArgv, "--max-old-space-size=1024"]
			});
			expect(cluster.fork).toHaveBeenCalledTimes(3);
		});
	});
});
