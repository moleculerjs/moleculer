import Logger = require("./base");
import { LEVELS } from "./base";

import Formatted = require("./formatted");
import Bunyan = require("./bunyan");
import Console = require("./console");
import Datadog = require("./datadog");
import Debug = require("./debug");
import File = require("./file");
import Log4js = require("./log4js");
import Pino = require("./pino");
import Winston = require("./winston");

export {
	Logger as Base,
	Formatted,
	Bunyan,
	Console,
	Datadog,
	Debug,
	File,
	Log4js,
	Pino,
	Winston,
	LEVELS
};

export type { LogLevels } from "./base";

export declare function resolve(opt: Record<string, any> | string): Logger;
export declare function register(name: string, value: Logger): void;
