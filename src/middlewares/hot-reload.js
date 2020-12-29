/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const fs = require("fs");
const kleur = require("kleur");
const path = require("path");
const watch = require("recursive-watch");
const _ = require("lodash");

const { clearRequireCache, makeDirs, isFunction, isString } = require("../utils");

/* istanbul ignore next */
module.exports = function HotReloadMiddleware(broker) {

	const cache = new Map();

	let projectFiles = new Map();
	let prevProjectFiles = new Map();
	let hotReloadModules = [];
	let extraFiles = null;

	function hotReloadService(service) {
		const relPath = path.relative(process.cwd(), service.__filename);

		broker.logger.info(`Hot reload '${service.name}' service...`, kleur.grey(relPath));

		return broker.destroyService(service)
			.then(() => {
				if (fs.existsSync(service.__filename)) {
					return broker.loadService(service.__filename);
				}
			});

	}

	/**
	 * Detect service dependency graph & watch all dependent files & services.
	 *
	 */
	function watchProjectFiles() {

		if (!broker.started || !process.mainModule) return;

		cache.clear();
		prevProjectFiles = projectFiles;
		projectFiles = new Map();

		// Read the main module
		const mainModule = process.mainModule || require.main;

		// Process the whole module tree
		processModule(mainModule, null, 0, null);

		if (extraFiles != null) {
			Object.entries(extraFiles).forEach(([fName, restartType]) => {
				const watchItem = getWatchItem(fName);
				if (restartType == "broker")
					watchItem.brokerRestart = true;
				else if (restartType == "allServices")
					watchItem.allServices = true;
				else if (isString(restartType))
					watchItem.services.push(restartType);
				else if (Array.isArray(restartType))
					watchItem.services.push(...restartType);
			});
		}

		const needToReload = new Set();

		// Debounced Service reloader function
		const reloadServices = _.debounce(() => {
			needToReload.forEach(svc => {
				if (svc.__filename && !fs.existsSync(svc.__filename))
					needToReload.delete(svc);
			});
			broker.logger.info(kleur.bgMagenta().white().bold(`Reload ${needToReload.size} service(s)`));

			needToReload.forEach(svc => {
				if (typeof svc == "string")
					return broker.loadService(svc);

				return hotReloadService(svc);
			});
			needToReload.clear();

		}, 500);

		// Close previous watchers
		stopAllFileWatcher(prevProjectFiles);

		// Watching project files
		broker.logger.debug("");
		broker.logger.debug(kleur.yellow().bold("Watching the following project files:"));

		projectFiles.forEach((watchItem, fName) => {
			// Delete if file doesn't exist anymore
			if (!fs.existsSync(fName))
				projectFiles.delete(fName);
		});

		projectFiles.forEach((watchItem, fName) => {
			const relPath = path.relative(process.cwd(), fName);
			if (watchItem.brokerRestart)
				broker.logger.debug(`  ${relPath}:`, kleur.grey("restart broker."));
			else if (watchItem.allServices)
				broker.logger.debug(`  ${relPath}:`, kleur.grey("reload all services."));
			else if (watchItem.services.length > 0) {
				broker.logger.debug(`  ${relPath}:`, kleur.grey(`reload ${watchItem.services.length} service(s) & ${watchItem.others.length} other(s).`)/*, watchItem.services, watchItem.others*/);
				watchItem.services.forEach(svcFullname => broker.logger.debug(kleur.grey(`    ${svcFullname}`)));
				watchItem.others.forEach(filename => broker.logger.debug(kleur.grey(`    ${path.relative(process.cwd(), filename)}`)));
			}
			// Create watcher
			watchItem.watcher = fs.watch(fName, (eventType) => {
				const relPath = path.relative(process.cwd(), fName);
				broker.logger.info(kleur.magenta().bold(`The '${relPath}' file is changed. (Event: ${eventType})`));

				// Clear from require cache
				clearRequireCache(fName);
				if (watchItem.others.length > 0) {
					watchItem.others.forEach(f => clearRequireCache(f));
				}

				if (watchItem.brokerRestart && broker.runner && isFunction(broker.runner.restartBroker)) {
					broker.logger.info(kleur.bgMagenta().white().bold("Action: Restart broker..."));
					stopAllFileWatcher(projectFiles);
					// Clear the whole require cache
					require.cache.length = 0;
					return broker.runner.restartBroker();

				} else if (watchItem.allServices) {
					// Reload all services
					broker.services.forEach(svc => {
						if (svc.__filename)
							needToReload.add(svc);
					});
					reloadServices();

				} else if (watchItem.services.length > 0) {
					// Reload certain services
					broker.services.forEach(svc => {
						if (watchItem.services.indexOf(svc.fullName) !== -1)
							needToReload.add(svc);
					});

					if (needToReload.size == 0) {
						// It means, it's a crashed reloaded service, so we
						// didn't find it in the loaded services because
						// the previous hot-reload failed. We should load it
						// broker.loadService
						needToReload.add(relPath);
					}
					reloadServices();
				}
			});
		});

		if (projectFiles.size == 0)
			broker.logger.debug(kleur.grey("  No files."));

	}

	const debouncedWatchProjectFiles = _.debounce(watchProjectFiles, 2000);

	/**
	 * Stop all file watchers
	 */
	function stopAllFileWatcher(items) {
		items.forEach((watchItem) => {
			if (watchItem.watcher) {
				watchItem.watcher.close();
				watchItem.watcher = null;
			}
		});
	}

	/**
	 * Get a watch item
	 *
	 * @param {String} fName
	 * @returns {Object}
	 */
	function getWatchItem(fName) {
		let watchItem = projectFiles.get(fName);
		if (watchItem)
			return watchItem;

		watchItem = {
			services: [],
			allServices: false,
			brokerRestart: false,
			others: []
		};
		projectFiles.set(fName, watchItem);

		return watchItem;
	}

	function isMoleculerConfig(fName) {
		return fName.endsWith("moleculer.config.js")
			|| fName.endsWith("moleculer.config.ts")
			|| fName.endsWith("moleculer.config.json");
	}

	/**
	 * Process module children modules.
	 *
	 * @param {*} mod
	 * @param {*} service
	 * @param {Number} level
	 */
	function processModule(mod, service = null, level = 0, parents = null) {
		const fName = mod.filename;

		// Skip node_modules files, if there is parent project file
		if ((service || parents) && fName.indexOf("node_modules") !== -1)
			if (hotReloadModules.find(modulePath => fName.indexOf(modulePath) !== -1) == null)
				return;

		// Avoid circular dependency in project files
		if (parents && parents.indexOf(fName) !== -1)
			return;

		// console.log(fName);

		// Cache files to avoid cyclic dependencies in node_modules
		if (fName.indexOf("node_modules") !== -1) {
			if (cache.get(fName)) return;
			cache.set(fName, mod);
		}

		if (!service) {
			service = broker.services.find(svc => svc.__filename == fName);
		}

		if (service) {
			// It is a service dependency. We should reload this service if this file has changed.
			const watchItem = getWatchItem(fName);
			if (!watchItem.services.includes(service.fullName))
				watchItem.services.push(service.fullName);

			watchItem.others = _.uniq([].concat(watchItem.others, parents || []));

		} else if (isMoleculerConfig(fName)) {
			const watchItem = getWatchItem(fName);
			watchItem.brokerRestart = true;
		} else {
			// It is not a service dependency, it is a global middleware. We should reload all services if this file has changed.
			if (parents) {
				const watchItem = getWatchItem(fName);
				watchItem.allServices = true;
				watchItem.others = _.uniq([].concat(watchItem.others, parents || []));
			}
		}

		if (mod.children && mod.children.length > 0) {
			if (service) {
				parents = parents ? parents.concat([fName]) : [fName];
			} else if (isMoleculerConfig(fName)) {
				parents = [];
				// const watchItem = getWatchItem(fName);
				// watchItem.brokerRestart = true;
			} else if (parents) {
				parents.push(fName);
			}
			mod.children.forEach(m => processModule(m, service, service ? level + 1 : 0, parents));
		}
	}

	const folderWatchers = [];

	function watchProjectFolders() {
		// Debounced Service loader function
		const needToLoad = new Set();
		const loadServices = _.debounce(() => {
			broker.logger.info(kleur.bgMagenta().white().bold(`Load ${needToLoad.size} service(s)...`));

			needToLoad.forEach(filename => {
				try {
					broker.loadService(filename);
				} catch(err) {
					broker.logger.error(`Failed to load service '${filename}'`, err);
					clearRequireCache(filename);
				}
			});
			needToLoad.clear();

		}, 500);


		if (broker.runner && Array.isArray(broker.runner.folders)) {
			const folders = broker.runner.folders;
			if (folders.length > 0) {
				folderWatchers.length = 0;

				broker.logger.debug("");
				broker.logger.debug(kleur.yellow().bold("Watching the following folder(s):"));

				folders.forEach(folder => {
					makeDirs(folder);
					broker.logger.debug(`  ${path.relative(process.cwd(), folder)}/`);
					folderWatchers.push({
						path: folder,
						watcher: watch(folder, (filename) => {
							if (filename.endsWith(".service.js") || filename.endsWith(".service.ts")) {
								broker.logger.debug(`There is changes in '${folder}' folder: `, path.basename(filename));
								const isLoaded = broker.services.some(svc => svc.__filename == filename);
								const fileExists = fs.existsSync(filename);
								if (!isLoaded && fileExists) {
									// This is a new file. We should wait for the file fully copied.
									needToLoad.add(filename);
									loadServices();
								}
							}
						})
					});
				});
			}
		}
	}

	function stopProjectFolderWatchers() {
		broker.logger.debug("");
		broker.logger.debug("Stop watching folders.");
		folderWatchers.forEach(item => item.watcher && item.watcher());
	}

	/**
	 * Expose middleware
	 */
	return {
		name: "HotReload",

		// After broker started
		started(broker) {
			if (broker.options.hotReload == null) {
				return;
			} else if (typeof broker.options.hotReload === "object") {
				if (Array.isArray(broker.options.hotReload.modules)) {
					hotReloadModules = broker.options.hotReload.modules.map(moduleName => `/node_modules/${moduleName}/`);
				}
				if (broker.options.hotReload.extraFiles) {
					/**
					 * **Example:**
					 * ```js
					 * hotReload: {
					 * 	extraFiles: {
					 * 		"./configuration.json": "broker", // reload the broker
					 * 		"./common.js": "allServices", // reload all services
					 * 		"./database": "v1.posts", // reload a service
					 * 		"./database": ["v1.posts", "users"], // reload multiple services
					 * 	}
					 * }
					 * ```
					 */
					extraFiles = broker.options.hotReload.extraFiles;
				}
			} else if (broker.options.hotReload !== true) {
				return;
			}

			watchProjectFiles();

			watchProjectFolders();
		},

		serviceStarted() {
			// Re-watch new services if broker has already started and a new service started.
			if (broker.started) {
				debouncedWatchProjectFiles();
			}
		},

		stopped() {
			stopProjectFolderWatchers();
		}
	};

};
