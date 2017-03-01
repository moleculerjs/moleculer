"use strict";

let Promise	= require("bluebird");
let ServiceBroker = require("../../src/service-broker");

let broker = new ServiceBroker({ validation: true });
broker.loadService(__dirname + "/../../benchmark/user.service");

broker.start();

console.log(" --- CALL ---");
//broker.call("users.empty").then(res => console.log(res));
broker.call("users.validate", { id: 5 }).then(res => console.log(res));
