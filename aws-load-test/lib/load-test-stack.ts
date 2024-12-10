import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class LoadTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with a single NAT Instance instead of NAT Gateway
    const vpc = new ec2.Vpc(this, 'LoadTestVPC', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        }
      ]
    });

    // Create IAM role for EC2 instances
    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    // Create security group for EC2 instances
    const securityGroup = new ec2.SecurityGroup(this, 'LoadTestSG', {
      vpc,
      description: 'Security group for load test instances',
      allowAllOutbound: true,
    });

    // Allow inbound traffic for Locust
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8089),
      'Allow Locust web interface'
    );

      // Allow inbound traffic for Locust
      securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(22),
        'Allow Locust web interface'
      );
  
    

    // Allow communication between Locust master and workers
    securityGroup.addIngressRule(
      securityGroup,
      ec2.Port.tcp(5557),
      'Allow Locust master-worker communication'
    );

    // Use Ubuntu 22.04 LTS AMI
    const ubuntuAmi = new ec2.GenericLinuxImage({
      'us-east-1': 'ami-0fc5d935ebf8bc3bc',  // Ubuntu 22.04 LTS in us-east-1
    });

    // Create Auto Scaling Group for Locust master
    const masterASG = new autoscaling.AutoScalingGroup(this, 'LoadTestMasterASG', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: ubuntuAmi,
      minCapacity: 1,
      maxCapacity: 1,
      desiredCapacity: 1,
      role: ec2Role,
      securityGroup,
      associatePublicIpAddress: true,
      keyName: 'us-east-1', // Using existing key pair
    });

    // Create Auto Scaling Group for Locust workers
    const workerASG = new autoscaling.AutoScalingGroup(this, 'LoadTestWorkerASG', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: ubuntuAmi,
      minCapacity: 1,
      maxCapacity: 5,
      desiredCapacity: 2,
      role: ec2Role,
      securityGroup,
      associatePublicIpAddress: true,
      keyName: 'us-east-1', // Using existing key pair
    });

    // Add user data script for master node
    const masterUserDataScript = `
#!/bin/bash
# Wait for cloud-init to complete
# cloud-init status --wait

# Update package list and install required packages
apt-get update
apt-get install -y python3-pip git python3-locust

# Install Node.js for TypeScript support
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs

# Clone the repository
git clone https://github.com/nimysan/cline-dsql-demo.git
cd cline-dsql-demo

# Install dependencies in virtual environment
pip3 install locust==2.24.0 psycopg2-binary==2.9.9 boto3==1.35.76

# Copy the Locust file to the appropriate location
mkdir -p aws-load-test/locust
cp aws-load-test/locust/locustfile.py /home/ubuntu/locustfile.py

# Start Locust master (using the virtual environment)
cd /home/ubuntu/ && locust --master --host=http://localhost:8089
`;

    // Add user data script for worker nodes
    const workerUserDataScript = `
#!/bin/bash
# Wait for cloud-init to complete
# cloud-init status --wait

# Update package list and install required packages
apt-get update
apt-get install -y python3-pip git python3-locust

# Install Node.js for TypeScript support
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs

# Clone the repository
git clone https://github.com/nimysan/cline-dsql-demo.git
cd cline-dsql-demo

# Install dependencies in virtual environment
pip3 install locust==2.24.0 psycopg2-binary==2.9.9 boto3==1.35.76

# Copy the Locust file to the appropriate location
mkdir -p aws-load-test/locust
cp aws-load-test/locust/locustfile.py /home/ubuntu/locustfile.py

# Get master node IP (using AWS CLI to get the first instance from master ASG)
MASTER_IP=$(aws ec2 describe-instances --filters "Name=tag:aws:autoscaling:groupName,Values=LoadTestMasterASG" --query "Reservations[0].Instances[0].PrivateIpAddress" --output text)

# Start Locust worker (using the virtual environment)
cd /home/ubuntu/ && locust --worker --master-host=$MASTER_IP
`;

    masterASG.addUserData(masterUserDataScript);
    workerASG.addUserData(workerUserDataScript);

    // Output the master node's public DNS
    new cdk.CfnOutput(this, 'LocustMasterDNS', {
      value: masterASG.autoScalingGroupName,
      description: 'Auto Scaling Group name for Locust master node',
    });
  }
}
