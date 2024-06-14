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
import { S3BucketProps } from '../../../ingestion-server-v2-stack'
import { Duration, CfnCondition, Fn } from 'aws-cdk-lib';
import { IVpc, SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import {
  ApplicationProtocol,
  Protocol,
  ApplicationLoadBalancer,
  IpAddressType,
  ApplicationTargetGroup,
  CfnLoadBalancer,
  TargetType,
  ApplicationListener,
  CfnListener,
  SslPolicy,
  ListenerAction,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { RESOURCE_ID_PREFIX } from '../../server/ingestion-server';
// import { addECSTargetsToListener } from '../../server/private/alb';

export const PROXY_PORT = 8088;

function createECSTargets(
  scope : Construct, 
  vpc: IVpc, 
  httpListener: ApplicationListener,
  httpsListener: ApplicationListener,
) {
  const targetGroup = new ApplicationTargetGroup(scope, 'ECS', {
    protocol: ApplicationProtocol.HTTP,
    vpc: vpc,
    port: PROXY_PORT,
    targetType: TargetType.IP,
    healthCheck: {
      enabled: true,
      protocol: Protocol.HTTP,
      port: PROXY_PORT.toString(),
      path: '/health',
      interval: Duration.seconds(10),
      timeout: Duration.seconds(6),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
    },
  });

  httpListener.addTargetGroups('ECS', {
    targetGroups: [targetGroup],
  });

  httpsListener.addTargetGroups('ECS', {
    targetGroups: [targetGroup],
  });

  return targetGroup;
}

export interface ApplicationLoadBalancerProps {
  vpc: IVpc;
  publicSubnets: string;
  privateSubnets: string;
  isPrivateSubnetsCondition: CfnCondition;
  certificateArn: string;
  domainName: string;
  sg: SecurityGroup;
  endpointPath: string;
  ipAddressType: IpAddressType;
  protocol: string;
  ports: {
    http: number;
    https: number;
  };
  albLogBucket: S3BucketProps;
  enableAccessLog: string;
  isHttps: CfnCondition;
  isHttp: CfnCondition;
}

export class ApplicationLoadBalancerV2 extends Construct {
  public readonly alb: ApplicationLoadBalancer;
  public readonly targetGroup: ApplicationTargetGroup;
  public readonly httpListener: ApplicationListener;
  public readonly httpsListener: ApplicationListener;

  constructor(scope: Construct, id: string, props: ApplicationLoadBalancerProps) {
    super(scope, id);
    const { alb, targetGroup, httpListener, httpsListener } = createApplicationLoadBalancer(this, props);
    this.alb = alb;
    this.targetGroup = targetGroup;
    this.httpListener = httpListener;
    this.httpsListener = httpsListener;
  }
}

function createApplicationLoadBalancer(
  scope: Construct,
  props: ApplicationLoadBalancerProps,
) {
  const alb = new ApplicationLoadBalancer(scope, `${RESOURCE_ID_PREFIX}alb`, {
    vpc: props.vpc,
    internetFacing: true,
    ipAddressType: props.ipAddressType,
    securityGroup: props.sg,
    idleTimeout: Duration.minutes(3),
    vpcSubnets: {
      subnetType: SubnetType.PUBLIC,
    },
    dropInvalidHeaderFields: true,
  });

  const enableAlbAccessLogCondition = new CfnCondition(scope, 'EnableAlbAccessLog', {
    expression: Fn.conditionEquals(props.enableAccessLog, true),
  });

  const baseAlbAttributes: any[] = [
    {
      Key: 'deletion_protection.enabled',
      Value: 'false',
    },
    {
      Key: 'idle_timeout.timeout_seconds',
      Value: '180',
    },
    {
      Key: 'routing.http.drop_invalid_header_fields.enabled',
      Value: 'true',
    },
  ];

  const enableAccessLogAlbAttributes: any[] = [
    ... baseAlbAttributes,
    {
      Key: 'access_logs.s3.enabled',
      Value: 'true',
    },
    {
      Key: 'access_logs.s3.bucket',
      Value: props.albLogBucket.s3BucketName,
    },
    {
      Key: 'access_logs.s3.prefix',
      Value: Fn.join('', [props.albLogBucket.prefix ? props.albLogBucket.prefix : '', 'alb-log']),
    },
  ];

  const cfnAlb = alb.node.defaultChild as CfnLoadBalancer;
  cfnAlb.addPropertyOverride('LoadBalancerAttributes',
    Fn.conditionIf(enableAlbAccessLogCondition.logicalId, enableAccessLogAlbAttributes, baseAlbAttributes));

  const httpListener = new ApplicationListener(scope, 'HttpListener', {
    loadBalancer: alb,
    port: props.ports.http,
    protocol: ApplicationProtocol.HTTP,
  });

  (httpListener.node.defaultChild as CfnListener).cfnOptions.condition = props.isHttp;

  const httpsListener = new ApplicationListener(scope, 'HttpsListener', {
    loadBalancer: alb,
    port: props.ports.https,
    protocol: ApplicationProtocol.HTTPS,
    sslPolicy: SslPolicy.TLS12,
    certificates: [{ certificateArn: props.certificateArn }],
  });

  (httpsListener.node.defaultChild as CfnListener).cfnOptions.condition = props.isHttps;

  const httpsRedirectListener = new ApplicationListener(scope, 'HttpsRedirectListener', {
    loadBalancer: alb,
    port: 80,
    protocol: ApplicationProtocol.HTTP,
  });

  httpsRedirectListener.addAction('RedirectToHTTPS', {
    action: ListenerAction.redirect({
      protocol: ApplicationProtocol.HTTPS,
      port: `${props.ports.https}`,
    }),
  });

  (httpsRedirectListener.node.defaultChild as CfnListener).cfnOptions.condition = props.isHttps;

  cfnAlb.addPropertyOverride('Scheme',
    Fn.conditionIf(props.isPrivateSubnetsCondition.logicalId, 'internal', 'internet-facing').toString());

  cfnAlb.addPropertyOverride('Subnets',
    Fn.conditionIf(props.isPrivateSubnetsCondition.logicalId, Fn.split(',', props.privateSubnets), Fn.split(',', props.publicSubnets)));

  const targetGroup = createECSTargets(scope, props.vpc, httpListener, httpsListener);

  return { alb, targetGroup, httpListener, httpsListener };
}
