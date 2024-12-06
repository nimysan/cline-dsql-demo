import time
import json
import psycopg2
from locust import User, task, between

class PostgresLoadTest(User):
    wait_time = between(1, 2)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.db_conn = None
        self.db_config = {
            'host': "naabtvc3p6olsholi54v4mmmnm.dsql.us-east-1.on.aws",
            'database': "postgres",
            'user': "admin",
            'password': "naabtvc3p6olsholi54v4mmmnm.dsql.us-east-1.on.aws/?Action=DbConnectAdmin&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAVV2N3GNTZ7457YMG%2F20241206%2Fus-east-1%2Fdsql%2Faws4_request&X-Amz-Date=20241206T072716Z&X-Amz-Expires=900&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEHAaCXVzLWVhc3QtMSJIMEYCIQCRCkMVOUloe56uo7CJIV74FMMwfff0x6a%2FO3mHN%2FbCnAIhAK%2FNRFngsGPfj5g%2BtTCdK6BIne3wACIEdkyIPyoRDITEKtUCCCkQARoMMzkwNDY4NDE2MzU5IgzCqnpLHAvtARO6ZR0qsgK3PL0TZgZQhKkKM7BwGa%2FWNeXGwDlH%2FKhBWZwDlboiu6GvM4Whe%2Fq2Vt%2BlvFMqYTMAbQlpWPotnLvJqIyEPk%2BKE4APH299qYBRZe693BpBL%2BSxQ8ddyDW3yCeKWKSQHAUb83TYe%2FHVv2qe5QjoDRQpojzHE2SSUHq%2FsThdC3mMWibeP86LfnFmv6e0%2Fv982MjNmLHplIdv8IIcpfvE%2Bjjmhzup8%2BolPvyIWMQoWtgiCM8E%2F%2FlA8xsgD36OVAepOsMHJlLXrHPhZYe7XiQsrsoY%2Bx87pz39ama7PIx5SrktTHTVx5NaOlCUVTTnTdxdyISvc3eVCdXdI56pSomY25ZFzuDQb%2BV6mpdRqaELpRMw0uQQFMQu7I5hJqJjQn7dgZmryj%2BhUXxcB9MsehA6b2d8I2Uw%2BJ3KugY67wHKXj7CcOKGVl%2FAnKsx0X16B2vOnjlZE8Sq2wr1ptA5b%2BP7kghmOZs3zOCt4MGqLb77VQfhQ75ZtjJlK8x55AhhTXBBfoMl2ZiaM54gXVHzFCoG2rlipBWrG%2F46f%2BslCOuZRAo2GqSVONck5qOxaSdJJG1wP3UoFtmnb%2B0Gnm97BnFx9TVIpahfZ8RFRobFVoo6r4mk1cnusJdG21W9Z9yrtanTNAlHm%2Buh9Hw48NcjP0t7AWGV9XrP1lnlQKK12WW1RKt2ERuVPxUd7H7PEQv3tkldLQgE7qj4ep0kCzpIj%2Ba6xy5dEQF5D%2BdF2UTHeA%3D%3D&X-Amz-Signature=3bfa9d48158efa6836c4346f94d48bb71a805b8e865689b934d000cb01675d4a&X-Amz-SignedHeaders=host",
            'port': 5432,
            'ssl': {
                'rejectUnauthorized': True,
                'requestCert': True
            }
        }

    def on_start(self):
        """Connect to PostgreSQL when the test starts"""
        try:
            self.db_conn = psycopg2.connect(
                host=self.db_config['host'],
                database=self.db_config['database'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                port=self.db_config['port'],
                sslmode='verify-full' if self.db_config['ssl']['rejectUnauthorized'] else 'disable'
            )
        except Exception as e:
            print(f"Failed to connect to database: {e}")
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
