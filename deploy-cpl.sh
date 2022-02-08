#!/bin/sh
cd cpl-app-test
npm install
expo install react-native-safe-area-context@3.2.0
expo login -u $1 -p $2 --non-interactive
expo publish --quiet --send-to $3 --release-channel $4 --non-interactive