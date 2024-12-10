#!/usr/bin/env python
# -*- coding: utf-8 -*-

import psycopg2
import logging
import sys
import os
import urllib.request
import boto3

# 配置详细的日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s: %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger('psycopg2')
logger.setLevel(logging.DEBUG)

def generate_token(cluster_endpoint, region):
    """Generate admin auth token for database connection"""
    try:
        client = boto3.client("dsql", region_name=region)
        token = client.generate_db_connect_admin_auth_token(cluster_endpoint, region)
        return token
    except Exception as e:
        logger.error(f"Error generating token: {e}")
        raise

class DatabaseTester:
    def __init__(self):
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
            logger.info(f"Downloading RDS root certificate... {self.cert_path}")
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

    def connect_to_db(self):
        """Connect to the PostgreSQL database"""
        try:
            # Setup SSL certificate
            self.setup_ssl_cert()
            
            logger.info("Attempting to connect to database...")
            logger.debug("Connection parameters: host=%s, database=%s, user=%s, port=%s" % (
                self.db_config['host'],
                self.db_config['database'],
                self.db_config['user'],
                self.db_config['port']
            ))
            
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
            
            logger.info("Successfully connected!")
            
            # 测试连接
            cur = self.db_conn.cursor()
            cur.execute('SELECT version()')
            version = cur.fetchone()
            logger.info("PostgreSQL version: %s" % str(version))
            
        except Exception as error:
            logger.error("Error connecting to the PostgreSQL database: %s" % str(error))
            raise

if __name__ == "__main__":
    try:
        tester = DatabaseTester()
        tester.connect_to_db()
    except Exception as e:
        logger.error("Test failed: %s" % str(e))
        sys.exit(1)
