#!/bin/bash
cd /home/ratsweb/source/MAYZ/mayz-mainnet-incentivized-program-job
# If you need to pull latest changes:
git pull
# Run your job (replace with your actual command, e.g. node, ts-node, etc.)
npm install --production
# npx ts-node src/index.ts
npm run start