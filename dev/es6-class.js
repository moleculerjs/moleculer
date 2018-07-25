const ServiceBroker = require("../src/service-broker");
const broker = new ServiceBroker();

broker.loadService("./examples/es6.class.service.js");
broker.start();
