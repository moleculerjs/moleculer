import { Logger } from "./index";
import * as winston from "winston";

Logger.extend(winston.createLogger());
