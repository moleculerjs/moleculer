"use strict";

const ServiceBroker = require("../src/service-broker");

const logger = require("pino")({ level: "info" });

const broker = new ServiceBroker({ logger });

broker.logger.info("hi");