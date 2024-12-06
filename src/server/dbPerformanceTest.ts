import "reflect-metadata";
import { AppDataSource } from "./database/config";
import { Order } from "./entities/Order";
import crypto from "crypto";

// 生成测试数据
function generateOrderData() {
    return {
        id: crypto.randomUUID(),
        customer: `Customer ${Math.floor(Math.random() * 1000)}`,
        product: `Product ${Math.floor(Math.random() * 100)}`,
        amount: +(Math.random() * 1000).toFixed(2),
        status: ['Pending', 'Processing', 'Completed'][Math.floor(Math.random() * 3)] as "Completed" | "Pending" | "Processing"
    };
}

// 执行并发插入测试
async function runInsertTest(concurrency: number) {
    console.log(`\nRunning insert test with ${concurrency} concurrent operations`);
    const startTime = Date.now();
    
    // 创建并发操作数组
    const operations = Array(concurrency).fill(null).map(() => {
        const orderData = generateOrderData();
        const order = AppDataSource.getRepository(Order).create(orderData);
        return AppDataSource.getRepository(Order).save(order);
    });

    try {
        await Promise.all(operations);
        const duration = Date.now() - startTime;
        console.log(`Completed ${concurrency} inserts in ${duration}ms`);
        console.log(`Average time per insert: ${(duration / concurrency).toFixed(2)}ms`);
        console.log(`Operations per second: ${(concurrency / (duration / 1000)).toFixed(2)}`);
    } catch (error) {
        console.error('Insert test failed:', error);
    }
}

// 执行并发查询测试
async function runQueryTest(concurrency: number) {
    console.log(`\nRunning query test with ${concurrency} concurrent operations`);
    const startTime = Date.now();
    
    // 创建并发操作数组
    const operations = Array(concurrency).fill(null).map(() => {
        return AppDataSource.getRepository(Order).find({
            take: 1,
            skip: Math.floor(Math.random() * 1000) // 随机偏移以避免总是查询相同记录
        });
    });

    try {
        await Promise.all(operations);
        const duration = Date.now() - startTime;
        console.log(`Completed ${concurrency} queries in ${duration}ms`);
        console.log(`Average time per query: ${(duration / concurrency).toFixed(2)}ms`);
        console.log(`Operations per second: ${(concurrency / (duration / 1000)).toFixed(2)}`);
    } catch (error) {
        console.error('Query test failed:', error);
    }
}

// 主测试函数
async function runPerformanceTests() {
    console.log('Initializing database connection...');
    
    try {
        await AppDataSource.initialize();
        console.log('Database connected successfully');

        // 测试不同并发级别
        const concurrencyLevels = [1000, 2000, 3000];
        
        // 插入测试
        console.log('\n=== Insert Performance Tests ===');
        for (const concurrency of concurrencyLevels) {
            await runInsertTest(concurrency);
        }

        // 查询测试
        console.log('\n=== Query Performance Tests ===');
        for (const concurrency of concurrencyLevels) {
            await runQueryTest(concurrency);
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // 关闭数据库连接
        await AppDataSource.destroy();
        console.log('\nDatabase connection closed');
    }
}

// 运行测试
runPerformanceTests().catch(console.error);
