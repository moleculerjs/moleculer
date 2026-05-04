import ServiceBroker = require("./service-broker");
import Service = require("./service");
import type { BrokerOptions } from "./service-broker";
import { Worker } from "cluster";

declare namespace Runner {
	/**
	 * Pluggable strategy used by the HotReload middleware to load,
	 * reload and invalidate service modules. Allows alternative module
	 * systems (e.g. ESM) to plug their own loading mechanism.
	 */
	export interface ReloadStrategy {
		/**
		 * Whether the strategy relies on Node's CJS module tree
		 * (`require.cache` / `module.children`) to discover service
		 * dependencies. When `false` (e.g. ESM), the middleware uses
		 * `getAllUserFiles` / `getImporters` instead.
		 */
		usesNodeModuleTree?: boolean;

		/** Load a service file (used when a new file appears). */
		loadService(filename: string): Service | Promise<Service>;

		/** Reload a service file (called after destroyService). */
		reloadService(filename: string): Service | Promise<Service>;

		/** Drop a single file from the module cache (no-op if unsupported). */
		invalidate(filename: string): void | Promise<void>;

		/** Drop the whole module cache before a broker restart. */
		invalidateAll(): void | Promise<void>;

		/**
		 * Optional. Return all user files known to the strategy. Used by
		 * the HotReload middleware to discover transitive dependencies
		 * when no native module graph is available.
		 */
		getAllUserFiles?(): Promise<string[]>;

		/**
		 * Optional. Return the transitive closure of files that import
		 * `filename` (BFS, cycle-safe, excludes `filename` itself).
		 */
		getImporters?(filename: string): Promise<string[]>;
	}

	/**
	 * Parsed CLI flags
	 */
	export interface RunnerFlags {
		/**
		 * Path to load configuration from a file
		 */
		config?: string;

		/**
		 * Start REPL mode
		 */
		repl?: boolean;

		/**
		 * Enable hot reload mode
		 */
		hot?: boolean;

		/**
		 * Silent mode. No logger
		 */
		silent?: boolean;

		/**
		 * Load .env file from current directory
		 */
		env?: boolean;

		/**
		 * Load .env files by glob pattern
		 */
		envfile?: string;

		/**
		 * Number of node instances to start in cluster mode
		 */
		instances?: number;

		/**
		 * File mask for loading services
		 */
		mask?: string;
	}
}

/**
 * Moleculer Runner
 */
declare class Runner {
	worker: Worker | null;
	broker: ServiceBroker | null;

	folders?: string[];

	/**
	 * Watch folders for hot reload
	 */
	watchFolders: string[];

	/**
	 * Reload strategy used by the HotReload middleware (optional;
	 * provided e.g. by the ESM runner).
	 */
	reloadStrategy?: Runner.ReloadStrategy;

	/**
	 * Parsed CLI flags
	 */
	flags: Runner.RunnerFlags | null;

	/**
	 * Loaded configuration file
	 */
	configFile: Partial<BrokerOptions>;

	/**
	 * Merged configuration
	 */
	config: Partial<BrokerOptions>;

	/**
	 * Process command line arguments
	 */
	processFlags(args: string[]): void;

	/**
	 * Load environment variables from '.env' file
	 */
	loadEnvFile(): void;

	/**
	 * Load configuration file
	 *
	 * Try to load a configuration file in order to:
	 *
	 *		- load file defined in MOLECULER_CONFIG env var
	 * 		- try to load file which is defined in CLI option with --config
	 * 		- try to load the `moleculer.config.js` file if exist in the cwd
	 * 		- try to load the `moleculer.config.json` file if exist in the cwd
	 */
	loadConfigFile(): Promise<void>;

	/**
	 * Normalize a value from env variable
	 */
	normalizeEnvValue(value: string): string | number | boolean;

	/**
	 * Overwrite config values from environment variables
	 */
	overwriteFromEnv(obj: any, prefix?: string): any;

	/**
	 * Merge broker options from config file & env variables
	 */
	mergeOptions(): void;

	/**
	 * Check if a path is a directory
	 */
	isDirectory(path: string): boolean;

	/**
	 * Check if a path is a service file
	 */
	isServiceFile(path: string): boolean;

	/**
	 * Load services from files or directories
	 */
	loadServices(): void;

	/**
	 * Start cluster workers
	 */
	startWorkers(instances: number): void;

	/**
	 * Load service from NPM module
	 */
	loadNpmModule(name: string): Service;

	/**
	 * Start Moleculer broker
	 */
	startBroker(): Promise<ServiceBroker>;

	/**
	 * Restart broker
	 */
	restartBroker(): Promise<ServiceBroker>;

	/**
	 * Start runner
	 */
	start(args: string[]): Promise<void|ServiceBroker>;
}

export = Runner;
