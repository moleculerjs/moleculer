#!/bin/sh

echo "Transporter: $TRANSPORTER";
echo "Serializer: $SERIALIZER";

export NAMESPACE=balancing;

echo "Start balancing scenario...";
node node1.js & \
node node2.js & \
node node3.js & \
node scenario.js

case $TRANSPORTER in
  (NATS|STAN|AMQP)
  	export DISABLEBALANCER=true;
	echo "Start balancing scenario with disabled balancer...";

	node node1.js & \
	node node2.js & \
	node node3.js & \
	node scenario.js
	;;
esac
