## Clickstream benchmark toole

We have developed a tool for performance tests, which utilizes ECS Fargate to continuously send test data to Clickstream. The number of ECS Service tasks can be increased or decreased to adjust the RPS (Requests per Second).

Follow below step to start your Clickstream performance test
1. Add configuration file:

Please download your `amplifyconfiguration.json` file from your web console of the solution, then copy it to the root
folder which at the same level as README file. then you can execute the following command to create and send your sample
data.

In the `amplifyconfiguration.json` file, we will only parse `appId`, `endpoint` and `isCompressEvents` three parameter
to run the program.

2. Start performance test:
Run below script to start performance test
```
./create-ecs-performance-test.sh <testName> <taskNumber> <region>
```

<testName>: the suffix of the ECS cluster name, for example: if <testName> is **MyTest**, you ECS cluster name is **clickstream-sample-data-cluster-MyTest**
<taskNumber>: the number of your ECS service tasks, you can change it from the ECS console after the cluster created.
<region>: the region where the ECS cluster created.
For example: 
```
./create-ecs-performance-test.sh MyTest 5 us-east-1
```

According to our testing, if the ECS cluster of performance tool is created in the same region of the Clickstream solution, a task can generate about 200 RPS.
A request payload size is ~2KB and contains 10 events.

3. Clean up performance test resources.
run below script to clean up all resources of performance test tool
```
./cleanup-ecs-performance-test.sh <testName> <region>
```




