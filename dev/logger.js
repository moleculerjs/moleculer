"use strict";

const ServiceBroker = require("../src/service-broker");
/*
const logger = require("pino")({ level: "info" });

const broker = new ServiceBroker({ logger });

*/

const bunyan = require("bunyan");

const logger = bunyan.createLogger({ name: "my-broker" });

const broker = new ServiceBroker({ logger });

broker.logger.info("hi");
