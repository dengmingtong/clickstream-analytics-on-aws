#!/bin/bash

stackName=$1

cp main.ts src/

sleep 2

cat ./src/main.ts | sed -e "s/new IngestionServerStack.*\/\/To Kafka$/new IngestionServerStack(app, '${stackName}', { \/\/To Kafka/g;"  > ./src/main-tmp.ts 
cat ./src/main-tmp.ts  | grep 'new IngestionServerStack(' | grep Kafka
mv ./src/main-tmp.ts ./src/main.ts 

CustomAdditionInfo=''

npx cdk synth $stackName

cat << END | tee /tmp/cmd
npx cdk deploy $stackName \
--parameters CustomAdditionInfo=$CustomAdditionInfo
END

$(cat /tmp/cmd)