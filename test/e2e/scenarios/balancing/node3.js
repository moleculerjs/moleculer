const { createNode } = require("../../utils");

const broker = createNode("node3");
broker.loadService("./test.service.js");

broker.start();
