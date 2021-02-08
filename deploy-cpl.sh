#!/bin/sh
cd cpl-app
git pull
expo login -u $1 -p $2
expo publish --quiet --send-to $3 --release-channel $4 --non-interactive