#!/bin/bash

echo "Start basic scenario...";
echo "Transporter: $TRANSPORTER";
echo "Serializer: $SERIALIZER";
echo "Discoverer: $DISCOVERER";

export NAMESPACE=basic;
node node1.js & \
node scenario.js
