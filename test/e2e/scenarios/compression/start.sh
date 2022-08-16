#!/bin/bash

echo "Start compression scenario...";
echo "Transporter: $TRANSPORTER";
echo "Serializer: $SERIALIZER";
echo "Discoverer: $DISCOVERER";

export NAMESPACE=compression;
node node1.js & \
node scenario.js
