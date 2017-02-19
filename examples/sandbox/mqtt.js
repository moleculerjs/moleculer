let mqtt = require("mqtt");
let client  = mqtt.connect("mqtt://nas");

client.on("connect", function () {
	client.subscribe("presence");
	client.publish("presence", "Hello mqtt");
});

client.on("message", function (topic, message) {
  // message is Buffer
	console.log(message.toString());
	client.end();
 });