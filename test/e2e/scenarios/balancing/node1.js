const { createNode } = require("../../utils");

const broker = createNode("node1");
broker.loadService("./test.service.js");

broker.start();
