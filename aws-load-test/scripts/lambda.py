import boto3
import time
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

# 定义时间规则
MORNING_START_TIME = 6  # 早上 6 点
EVENING_END_TIME = 22  # 晚上 10 点

# 创建 Athena 客户端
athena_client = boto3.client('athena')
cloudfront_client = boto3.client('cloudfront')

from datetime import datetime, timedelta, timezone


def get_current_time():
    """
    获取GMT+8时区的当前时间
    """
    tzinfo = timezone(timedelta(hours=8))  # 创建GMT+8时区信息
    current_time = datetime.now(tzinfo)  # 使用指定时区获取当前时间
    return current_time


def check_time_rules(current_time):
    """
    检查当前时间是否符合规则
    """
    hour = current_time.hour
    minute = current_time.minute
    print(f"current hour {hour} with current_minute {minute}")
    if MORNING_START_TIME <= hour < EVENING_END_TIME:
        # 早上 6 点到晚上 10 点,每个小时的 00-05 分钟开
        return minute <= 6
    else:
        # 晚上 10 点到凌晨 6 点,每 30 分钟开 5 分钟
        return 0 <= minute <= 6 or 30 <= minute <= 36

def get_top_20_high_cost_ip_addresses():
    client = boto3.client('athena', region_name='us-west-2')
    query = """
        SELECT
            c_ip,
            COUNT(DISTINCT program_id) AS distinct_program_count,
            SUM(visit_count) AS total_visits,
            SUM(total_cost) AS total_cost,
            ROUND(SUM(total_bytes) / SUM(visit_count) / 1024.0, 2) AS avg_request_size_kb
        FROM
            cf_program_statsprogram
        WHERE
            timestamp >= CURRENT_TIMESTAMP - INTERVAL '180' HOUR
        GROUP BY
            c_ip
        HAVING
            SUM(visit_count) > 7200
            AND ROUND(SUM(total_bytes) / SUM(visit_count) / 1024.0, 2) > 50
            AND COUNT(DISTINCT program_id) >= 10
        ORDER BY
            total_cost DESC
        LIMIT 20;
    """

    response = client.start_query_execution(
        QueryString=query,
        QueryExecutionContext={
            'Database': 'default'
        },
        ResultConfiguration={
            'OutputLocation': 's3://aigc.red.plaza/athena/'
        }
    )

    query_execution_id = response['QueryExecutionId']
    # Wait for the query to complete
    while True:
        query_status = client.get_query_execution(QueryExecutionId=query_execution_id)
        query_state = query_status['QueryExecution']['Status']['State']
        if query_state == 'SUCCEEDED':
            break
        elif query_state == 'FAILED':
            raise Exception(f"Query {query_execution_id} failed with state: {query_state}")
        else:
            time.sleep(1)  # Wait for 1 second before checking again

    # Retrieve the query results
    result = client.get_query_results(QueryExecutionId=query_execution_id)
    rows = result['ResultSet']['Rows']
    # Process the query results
    print('Query results:')
    ip_list = []
    for row in rows[1:]:  # Skip the header row
        ip = row['Data'][0]['VarCharValue']
        print(ip)
        ip_list.append(ip)

    return {
        'statusCode': 200,
        'ip_list': ip_list,
        'msg': 'Athena query done'
    }


def remove_duplicates(ip_list):
    """
    去重 IP 列表
    """
    return list(set(ip_list))


def get_web_acl_arn(web_acl_id):
    """
    根据 Web ACL ID 获取 Web ACL ARN。

    参数:
    web_acl_id (str): Web ACL ID

    返回:
    str: Web ACL ARN
    """
    wafv2_client = boto3.client('wafv2', region_name="us-east-1")

    try:
        response = wafv2_client.list_web_acls(Scope='CLOUDFRONT')
        web_acls = response['WebACLs']

        for web_acl in web_acls:
            if web_acl['Id'] == web_acl_id:
                return web_acl['ARN']

        raise ValueError(f'Web ACL ID {web_acl_id} 不存在')
    except ClientError as e:
        print(f'获取 Web ACL ARN 时出现错误: {e.response["Error"]["Message"]}')
        raise


def manage_waf_cloudfront_association(web_acl_id, distribution_id, associate=True):
    """
    关联或取消关联 Web ACL 与 CloudFront 分布。

    参数:
    web_acl_id (str): Web ACL ID
    distribution_id (str): CloudFront 分布 ID
    associate (bool): 如果为 True，则关联 Web ACL 与分布；如果为 False，则取消关联

    返回:
    None
    """
    web_acl_arn = get_web_acl_arn(web_acl_id)
    cloudfront_client = boto3.client('cloudfront', region_name="us-east-1")

    try:
        # 获取当前分布配置
        response = cloudfront_client.get_distribution_config(Id=distribution_id)
        # print(response)
        distribution_config = response['DistributionConfig']
        # print(distribution_config)
        # 更新 Web ACL 关联
        if associate:
            distribution_config['WebACLId'] = web_acl_arn
        else:
            distribution_config['WebACLId'] = ''

        # 更新分布配置
        cloudfront_client.update_distribution(
            DistributionConfig=distribution_config,
            Id=distribution_id,
            IfMatch=response['ETag']
        )

        print(f'Web ACL {"已关联" if associate else "已取消关联"}到 CloudFront 分布 {distribution_id}')
    except Exception as e:
        print(f'出现错误: {e}')


def manage_waf_cloudfront_associations(web_acl_id, distribution_ids, associate=True):
    for distribution_id in distribution_ids:
        manage_waf_cloudfront_association(web_acl_id,distribution_id,associate)

def add_ips_to_waf_ip_set(ip_set_name, list_ip, scope='CLOUDFRONT'):
    """
    Adds a list of IP addresses to a WAFV2 IP set in a single operation.

    Args:
        ip_set_name (str): The name of the WAFV2 IP set to update.
        list_ip (list): A list of IP addresses to add to the IP set.
        scope (str, optional): The scope of the IP set. Defaults to 'CLOUDFRONT'.

    Returns:
        dict: The response from the update_ip_set operation.
    """
    # Create a list of IPV4 address objects

    # Create a WAFV2 client
    wafv2_client = boto3.client('wafv2', region_name="us-east-1")
    list = wafv2_client.list_ip_sets(
        Scope=scope
    )
    ip_sets = list['IPSets']
    print(ip_sets)
    target_ip_set = None
    for ip_set in ip_sets:
        if ip_set['Name'] == ip_set_name:
            target_ip_set = ip_set
            break
    print(target_ip_set)
    ip_set_response = wafv2_client.get_ip_set(
        Name=target_ip_set['Name'],
        Scope='CLOUDFRONT',
        Id=target_ip_set['Id']
    )
    # print(ip_set_response)
    ipset_detail = ip_set_response['IPSet']
    # print('-----')
    # print(ipset_detail)
    # ip_addresses = [{'Value': ip} for ip in list_ip]
    combined_ip_addresses = ipset_detail['Addresses'] + list_ip
    print(combined_ip_addresses)
    update_response = wafv2_client.update_ip_set(
        Name=target_ip_set['Name'],
        Scope='CLOUDFRONT',
        Id=target_ip_set['Id'],
        Description='string',
        Addresses=combined_ip_addresses,
        LockToken=ip_set_response['LockToken']
    )
    # Get the existing IP set
    # print(update_response)
    return combined_ip_addresses


def lambda_handler(event, context):
    """
    Lambda 入口函数
    """
    # manage_waf_cloudfront_association("f4a1bf9f-1fb7-4666-b7ce-0a260fb82472", "E1UZTGEU927TUF", True)
    wcl_id = "f4a1bf9f-1fb7-4666-b7ce-0a260fb82472"  # 替换为您的 WAF ACL ID
    cloudfront_ids = ["E1UZTGEU927TUF","E3LYVBRYE5URNG"] # 替换为您的 CloudFront 分发 ID

    # 查询ip列表并更新到Ip set
    res = get_top_20_high_cost_ip_addresses()
    # print(res)
    ip_list = res['ip_list']
    cidr_list = [f"{ip}/32" for ip in ip_list]
    combined_ip_addresses = add_ips_to_waf_ip_set("test", cidr_list)

    # 如果ip_set不为空
    if len(combined_ip_addresses) > 0:
        current_time = get_current_time()
        current_hour = current_time.hour
        current_minute = current_time.minute
        print(f"{current_time} - {current_hour} - {current_minute}")
        print(f"Current time: {current_hour}:{current_minute}")
        if check_time_rules(current_time):
            # 在时间段内,关联 WAF ACL 到 CloudFront 分发
            manage_waf_cloudfront_associations(wcl_id, cloudfront_ids, associate=True)
            print(f"Unique IPs in the last 2 hours: {combined_ip_addresses}")
        else:
            # 不在时间段内,取消关联 WAF ACL 和 CloudFront 分发
            manage_waf_cloudfront_associations(wcl_id, cloudfront_ids, associate=False)
            print("Current time does not meet the rules.")
    else:
        # 如果ip_set为空， 把WAF取消
        manage_waf_cloudfront_associations(wcl_id, cloudfront_ids, associate=False)
        print("no ip in waf ip set,  disassociate waf rule")
