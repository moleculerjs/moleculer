import { Logger } from "../../../index";
import * as bunyan from "bunyan";
import * as pino from "pino";
import * as winston from "winston";

Logger.extend(bunyan.createLogger({ name: "moleculer" }));
Logger.extend(pino());
Logger.extend(winston.createLogger());
