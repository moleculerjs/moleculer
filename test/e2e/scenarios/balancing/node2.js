const { createNode } = require("../../utils");

const broker = createNode("node2");
broker.loadService("./test.service.js");

broker.start();
