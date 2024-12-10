import time
import json
import psycopg2
import os
import urllib.request
import logging
import boto3
from locust import User, task, between

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('locust_db_test')

def generate_token(cluster_endpoint, region):
    """Generate admin auth token for database connection"""
    try:
        client = boto3.client("dsql", region_name=region)
        token = client.generate_db_connect_admin_auth_token(cluster_endpoint, region)
        return token
    except Exception as e:
        logger.error(f"Error generating token: {e}")
        raise

class PostgresLoadTest(User):
    wait_time = between(1, 2)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.db_conn = None
        self.cert_path = os.path.expanduser('~/.postgresql/root.crt')
        self.cluster_endpoint = "naabtvc3p6olsholi54v4mmmnm.dsql.us-east-1.on.aws"
        self.region = "us-east-1"
        self.db_config = {
            'host': self.cluster_endpoint,
            'database': "postgres",
            'user': "admin",
            'password': None,  # Will be set with generated token
            'port': 5432
        }
        # Generate token and set password
        self.db_config['password'] = generate_token(self.cluster_endpoint, self.region)

    def setup_ssl_cert(self):
        """Download and setup SSL certificate"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.cert_path), exist_ok=True)
            
            # Download certificate if it doesn't exist
            if not os.path.exists(self.cert_path):
                logger.info(f"Downloading RDS root certificate... {self.cert_path}")
                cert_url = "https://www.amazontrust.com/repository/AmazonRootCA1.pem"
                urllib.request.urlretrieve(cert_url, self.cert_path)
                logger.info("Certificate downloaded to %s" % self.cert_path)
        except Exception as e:
            logger.error("Error setting up SSL certificate: %s" % str(e))
            raise

    def on_start(self):
        """Connect to PostgreSQL when the test starts"""
        try:
            # Setup SSL certificate
            self.setup_ssl_cert()
            
            logger.info("Attempting to connect to database...")
            # Try with verify-full first
            try:
                logger.info("Trying connection with verify-full SSL mode...")
                self.db_conn = psycopg2.connect(
                    host=self.db_config['host'],
                    database=self.db_config['database'],
                    user=self.db_config['user'],
                    password=self.db_config['password'],
                    port=self.db_config['port'],
                    sslmode='verify-full',
                    sslrootcert=self.cert_path
                )
            except psycopg2.OperationalError as e:
                logger.warning("verify-full connection failed: %s" % str(e))
                logger.info("Trying connection with require SSL mode...")
                # Fallback to require mode
                self.db_conn = psycopg2.connect(
                    host=self.db_config['host'],
                    database=self.db_config['database'],
                    user=self.db_config['user'],
                    password=self.db_config['password'],
                    port=self.db_config['port'],
                    sslmode='require'
                )
            
            logger.info("Successfully connected to database!")
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            self.environment.runner.quit()

    def on_stop(self):
        """Close the database connection when the test stops"""
        if self.db_conn:
            self.db_conn.close()

    @task(1)
    def execute_query(self):
        """Execute test query and measure performance"""
        if not self.db_conn:
            return

        query = """
            SELECT 
                id,
                created_at,
                status
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '1 day'
            ORDER BY created_at DESC
            LIMIT 1000
        """

        try:
            start_time = time.time()
            cursor = self.db_conn.cursor()
            
            cursor.execute(query)
            cursor.fetchall()
            cursor.close()
            
            # Record the response time
            total_time = int((time.time() - start_time) * 1000)
            self.environment.events.request.fire(
                request_type="SQL",
                name=query[:50],  # First 50 chars of query as name
                response_time=total_time,
                response_length=0,
                exception=None,
            )

        except Exception as e:
            self.environment.events.request.fire(
                request_type="SQL",
                name=query[:50],
                response_time=0,
                response_length=0,
                exception=e,
            )
