/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */
import { IngestionAuthenticationProps } from '@aws/clickstream-base-lib';
import { join } from 'path';
import { CustomResource, Duration, CfnResource, CfnCondition, Fn } from 'aws-cdk-lib';
import { PolicyStatement, Policy, CfnPolicy } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { SolutionNodejsFunction } from '../../private/function';

export interface UpdateAlbRulesCustomResourceV2Props {
  appIds: string[];
  clickStreamSDK: boolean;
  targetGroupArn: string;
  loadBalancerArn: string;
  authenticationProps: IngestionAuthenticationProps;
  certificateArn?: string;
  endpointPath: string;
  domainName?: string;
  protocol: string;
}

export function updateAlbRulesCustomResourceV2(
  scope: Construct,
  props: UpdateAlbRulesCustomResourceV2Props,
) {
  const fn = createUpdateAlbRulesLambda(scope, props.authenticationProps);
  const provider = new Provider(
    scope,
    'updateAlbRulesCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, 'updateAlbRulesCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      appIds: props.appIds,
      clickStreamSDK: props.clickStreamSDK,
      targetGroupArn: props.targetGroupArn,
      loadBalancerArn: props.loadBalancerArn,
      authenticationSecretArn: props.authenticationProps.authenticationSecretArn,
      enableAuthentication: props.authenticationProps.enableAuthentication,
      endpointPath: props.endpointPath,
      domainName: props.domainName,
      certificateArn: props.certificateArn,
      protocol: props.protocol,
    },
  });
  return { customResource: cr, fn };
}

function createUpdateAlbRulesLambda(scope: Construct, authenticationProps: IngestionAuthenticationProps): SolutionNodejsFunction {
  const policyStatements = [
    new PolicyStatement({
      actions: [
        'elasticloadbalancing:DescribeListeners',
        'elasticloadbalancing:ModifyListener',
        'elasticloadbalancing:CreateListener',
        'elasticloadbalancing:DeleteListener',
      ],
      resources: ['*'],
    }),
    new PolicyStatement({
      actions: [
        'elasticloadbalancing:DescribeRules',
        'elasticloadbalancing:CreateRule',
        'elasticloadbalancing:DeleteRule',
        'elasticloadbalancing:ModifyRule',
      ],
      resources: ['*'],
    }),
  ];

  const role = createLambdaRole(scope, 'updateAlbRulesLambdaRole', false, policyStatements);

  const authPolicy = new Policy(scope, 'updateAlbRulesLambdaAuthPolicy', {
    statements: [
      new PolicyStatement({
        actions: [
          'secretsmanager:GetSecretValue',
        ],
        resources: [authenticationProps.authenticationSecretArn],
      }),
    ],
  });
  authPolicy.attachToRole(role);

  const authEnableCondition = new CfnCondition(
    scope,
    'authEnableCondition',
    {
      expression: Fn.conditionEquals(authenticationProps.enableAuthentication, true),
    },
  );
  (authPolicy.node.defaultChild as CfnPolicy).cfnOptions.condition = authEnableCondition;

  const fn = new SolutionNodejsFunction(scope, 'updateAlbRulesLambda', {
    entry: join(
      __dirname,
      'update-alb-rules-v2',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(5),
    logConf: {
      retention: RetentionDays.ONE_WEEK,
    },
    role,
  });
  fn.node.addDependency(role);
  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource,
    rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('UpdateALBRuleV2'),
  );

  return fn;
}
