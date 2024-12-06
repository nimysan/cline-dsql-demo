# PostgreSQL Load Testing Infrastructure

This project sets up an AWS infrastructure for distributed load testing of PostgreSQL databases using Locust. The infrastructure is deployed using AWS CDK and includes auto-scaling EC2 instances for distributed load testing.

## Architecture

- Master-Worker architecture using Locust
- Auto Scaling Groups for both master and worker nodes
- Direct database configuration from TypeORM config
- Distributed load testing across multiple EC2 instances

## Prerequisites

- Node.js and npm
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- Python 3.x and pip

## Project Structure

```
aws-load-test/
├── lib/
│   └── load-test-stack.ts    # CDK infrastructure stack
├── locust/
│   └── locustfile.py         # Locust test script
└── README.md
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript code:
   ```bash
   npm run build
   ```

3. Deploy the CDK stack:
   ```bash
   cdk deploy
   ```

## Infrastructure Components

### Master Node
- Runs the Locust master process
- Hosts the web interface for test control
- Coordinates worker nodes

### Worker Nodes
- Auto-scaled based on demand
- Execute the actual load tests
- Connect automatically to the master node

## Load Testing Configuration

The load test uses the PostgreSQL configuration directly from your TypeORM configuration file (`src/server/database/config.ts`). This ensures consistency between your application's database configuration and the load testing environment.

Default test query:
```sql
SELECT 
    id,
    created_at,
    status
FROM orders
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 1000
```

## Running Load Tests

1. After deployment, get the public DNS of the master node from the AWS Console or CDK outputs

2. Access the Locust web interface:
   ```
   http://<master-node-public-dns>:8089
   ```

3. Configure your test parameters:
   - Number of users
   - Spawn rate
   - Host (this will be ignored as we're testing database directly)

4. Start the test and monitor results in real-time

## Monitoring

- **Locust Web Interface**: Real-time statistics and graphs
- **EC2 Metrics**: CPU, memory, and network usage in CloudWatch
- **Auto Scaling**: Monitor group scaling activities in AWS Console

## Security

- EC2 instances are launched in a VPC with appropriate security groups
- Database credentials are securely managed through the application's configuration
- All communication between master and worker nodes is restricted to the VPC

## Clean Up

To avoid incurring charges, clean up the resources when done:

```bash
cdk destroy
```

## Troubleshooting

1. If workers can't connect to master:
   - Check security group rules
   - Verify the master node IP address is correct
   - Ensure ports 5557 and 5558 are open between workers and master

2. If database connection fails:
   - Verify database configuration in src/server/database/config.ts
   - Check network connectivity to the database
   - Ensure SSL settings are correct

3. If the load test isn't generating enough load:
   - Increase the number of worker nodes in the Auto Scaling Group
   - Adjust the test parameters in the Locust web interface
   - Modify the wait time between requests in the locustfile

## Customization

To modify the test query or behavior, edit `aws-load-test/locust/locustfile.py`. The script is designed to:
- Use the database configuration from your TypeORM config
- Execute the specified query and measure performance
- Report detailed metrics through the Locust web interface
