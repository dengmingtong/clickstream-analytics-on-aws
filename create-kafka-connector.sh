#!/bin/bash

# export AWS_PROFILE=cs

stackName=$1

cp main.ts src/    

cat ./src/main.ts | sed -e "s/new KafkaS3SinkConnectorStack.*$/new KafkaS3SinkConnectorStack(app, '${stackName}', {/g;"  > ./src/main-tmp.ts 
cat ./src/main-tmp.ts  | grep 'new KafkaS3SinkConnectorStack('
mv ./src/main-tmp.ts ./src/main.ts


# global region
KafkaBrokers=''
KafkaTopic=''
SecurityGroupId=''
MskClusterName=''
SubnetIds=''
LogS3Bucket=''
LogS3Prefix=''
DataS3Bucket=''
DataS3Prefix=''
PluginS3Bucket=''
PluginS3Prefix=''
MaxWorkerCount=''
MinWorkerCount=''
WorkerMcuCount=''
TimeZone=''
CustomConnectorConfiguration=''
FlushSize=''
PluginUrl=''
ProjectId=''
RotateIntervalMS=''
CustomAdditionInfo=''

npx cdk synth $stackName

cat << END | tee /tmp/cmd
npx cdk deploy $stackName \
--parameters SubnetIds=$SubnetIds \
--parameters LogS3Bucket=$LogS3Bucket \
--parameters LogS3Prefix=$LogS3Prefix \
--parameters DataS3Bucket=$DataS3Bucket \
--parameters DataS3Prefix=$DataS3Prefix \
--parameters PluginS3Bucket=$PluginS3Bucket \
--parameters PluginS3Prefix=$PluginS3Prefix \
--parameters KafkaBrokers=$KafkaBrokers \
--parameters KafkaTopic=$KafkaTopic \
--parameters SecurityGroupId=$SecurityGroupId \
--parameters MskClusterName=$MskClusterName \
--parameters MaxWorkerCount=$MaxWorkerCount \
--parameters MinWorkerCount=$MinWorkerCount \
--parameters WorkerMcuCount=$WorkerMcuCount \
--parameters TimeZone=$TimeZone \
--parameters CustomConnectorConfiguration=$CustomConnectorConfiguration \
--parameters FlushSize=$FlushSize \
--parameters CustomAdditionInfo=$CustomAdditionInfo \
--parameters PluginUrl=$PluginUrl \
--parameters ProjectId=$ProjectId \
--parameters RotateIntervalMS=$RotateIntervalMS
END

$(cat /tmp/cmd)