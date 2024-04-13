#!/bin/bash

# Variables
SIMPLE_REGION=$1
DOCKERFILE_PATH="./Dockerfile"
IMAGE_NAME="clickstream-sample-data"
TAG=$SIMPLE_REGION
AWS_REGION=""
AWS_ACCOUNT_ID=""
ECR_REPO_NAME="clickstream-sample-data-repo"
NUMBER_OF_TASKS=$2
CLUSTER_NAME="clickstream-sample-data-cluster-${SIMPLE_REGION}"
SERVICE_NAME="clickstream-sample-data-service-${SIMPLE_REGION}"
TASK_DEFINITION_NAME="clickstream-sample-data-task-${SIMPLE_REGION}"
SUBNET_ID=""
SECURITY_GROUP_ID=""
LOG_GROUP_NAME="/ecs/clickstream-sample-data-log-${SIMPLE_REGION}"
ROLE_NAME="clickstream-sample-data-ecs-task-role-${AWS_REGION}"
ROLE="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"

cp -f "amplifyconfiguration-${SIMPLE_REGION}.json" amplifyconfiguration.json

# Create a CloudWatch log group if it doesn't exist
LOG_GROUP_EXISTS=$(aws logs describe-log-groups --log-group-name-prefix "${LOG_GROUP_NAME}" --query 'logGroups[?logGroupName==`'${LOG_GROUP_NAME}'`]' --output text --region ${AWS_REGION})

if [ -z "$LOG_GROUP_EXISTS" ]; then
  echo "start create log group"
  aws logs create-log-group --log-group-name "${LOG_GROUP_NAME}" --region ${AWS_REGION}
fi

# Check if the role exists
ROLE_EXISTS=$(aws iam list-roles --query 'Roles[?RoleName==`'${ROLE_NAME}'`].RoleName' --output text)

if [ -z "$ROLE_EXISTS" ]; then
  echo "start create role"
  # Create a trust policy file
  echo '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' > TrustPolicy.json


  # Create the role with the trust policy
  aws iam create-role --role-name "${ROLE_NAME}" --assume-role-policy-document file://TrustPolicy.json

  # Attach the permission
  aws iam attach-role-policy --role-name "${ROLE_NAME}" --policy-arn "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
  aws iam attach-role-policy --role-name "${ROLE_NAME}" --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
fi

# Clean up the trust policy file
rm -f TrustPolicy.json

# Full image name with AWS account ID and region
FULL_IMAGE_NAME="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${TAG}"

# Get the login command from ECR and execute it directly
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build your Docker image locally
docker build -t $IMAGE_NAME -f $DOCKERFILE_PATH .

# Check if ECR repository exists
REPO_EXISTS=$(aws ecr describe-repositories --repository-names "${ECR_REPO_NAME}" --region ${AWS_REGION} 2>&1)

if [ $? -ne 0 ]; then
  # If the repository does not exist in ECR, create it.
  aws ecr create-repository --repository-name "${ECR_REPO_NAME}" --region ${AWS_REGION}
fi

# Tag the Docker image with the full image name
docker tag $IMAGE_NAME:latest $FULL_IMAGE_NAME

# Push Docker image to ECR
docker push $FULL_IMAGE_NAME

# Create a task definition file
cat > task-definition.json << EOF
{
  "family": "${TASK_DEFINITION_NAME}",
  "executionRoleArn": "${ROLE}",
  "taskRoleArn": "${ROLE}",
  "containerDefinitions": [
    {
      "name": "${IMAGE_NAME}",
      "image": "${FULL_IMAGE_NAME}",
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "${LOG_GROUP_NAME}",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ClickStream-Test"
        }
      }    
    }
  ], 
  "networkMode": "awsvpc",  
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048"
}
EOF


# Register the task definition with ECS
aws ecs register-task-definition --region $AWS_REGION  --cli-input-json file://task-definition.json

# Check if the ECS cluster exists
CLUSTER_EXISTS=$(aws ecs describe-clusters --clusters "${CLUSTER_NAME}" --region ${AWS_REGION} | jq -r .clusters[0].status)

if [ "$CLUSTER_EXISTS" != "ACTIVE" ]; then
  # If the cluster does not exist, create it
  aws ecs create-cluster --cluster-name "${CLUSTER_NAME}" --region ${AWS_REGION} --settings name=containerInsights,value=enabled
fi

# Check if the ECS service exists
SERVICE_EXISTS=$(aws ecs describe-services --services "${SERVICE_NAME}" --cluster "${CLUSTER_NAME}" --region ${AWS_REGION} | jq -r .services[0].status)

if [ "$SERVICE_EXISTS" != "ACTIVE" ]; then
  # If the service does not exist, create it
  aws ecs create-service --service-name "${SERVICE_NAME}" --desired-count ${NUMBER_OF_TASKS} --task-definition "${TASK_DEFINITION_NAME}" --cluster "${CLUSTER_NAME}" --region ${AWS_REGION} --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}"
else
  # If the service exists, update the service with the new task definition and desired task count
  aws ecs update-service --service "${SERVICE_NAME}" --desired-count ${NUMBER_OF_TASKS} --task-definition "${TASK_DEFINITION_NAME}" --cluster "${CLUSTER_NAME}" --region ${AWS_REGION} --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP_ID]}"
fi

