#!/bin/sh

echo "Start balancing scenario...";
echo "Transporter: $TRANSPORTER";
echo "Serializer: $SERIALIZER";
export NAMESPACE=balancing;
node node1.js & \
node node2.js & \
node node3.js & \
node scenario.js
