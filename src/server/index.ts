import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./database/config";
import { Order } from "./entities/Order";
import crypto from "crypto";

interface QueryMetric {
    query: string;
    duration: number;
    timestamp: Date;
}

const app = express();
// Store last 1000 metrics in memory
const queryMetrics: QueryMetric[] = [];
const MAX_METRICS = 1000;

app.use(cors());
app.use(express.json());

// Initialize TypeORM
AppDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!");
    })
    .catch((error) => {
        console.error("Error during Data Source initialization:", error);
    });

// Function to save metric to memory
function saveMetric(query: string, duration: number) {
    const metric: QueryMetric = {
        query,
        duration,
        timestamp: new Date()
    };
    
    queryMetrics.unshift(metric); // Add to beginning of array
    if (queryMetrics.length > MAX_METRICS) {
        queryMetrics.pop(); // Remove oldest metric if we exceed max size
    }
}

// Get all orders
app.get("/api/orders", async (req, res) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const startTime = Date.now();
        const orders = await orderRepository.find();
        const duration = Date.now() - startTime;
        saveMetric("GET /api/orders", duration);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders" });
    }
});

// Create new order
app.post("/api/orders", async (req, res) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const orderData = {
            ...req.body,
            id: crypto.randomUUID()
        };
        const startTime = Date.now();
        const order = orderRepository.create(orderData);
        const result = await orderRepository.save(order);
        const duration = Date.now() - startTime;
        saveMetric("POST /api/orders", duration);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error creating order" });
    }
});

// Generate sample orders
app.post("/api/orders/generate-sample", async (req, res) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const count = req.body.count || 2000;
        
        const sampleOrders = Array.from({ length: count }, () => ({
            id: crypto.randomUUID(),
            customer: `Customer ${Math.floor(Math.random() * 1000)}`,
            product: `Product ${Math.floor(Math.random() * 100)}`,
            amount: +(Math.random() * 1000).toFixed(2),
            status: ['Pending', 'Processing', 'Completed'][Math.floor(Math.random() * 3)] as "Completed" | "Pending" | "Processing"
        }));

        const startTime = Date.now();
        // Save orders in chunks to avoid memory issues
        const chunkSize = 100;
        for (let i = 0; i < sampleOrders.length; i += chunkSize) {
            const chunk = sampleOrders.slice(i, i + chunkSize);
            await orderRepository.save(chunk);
        }
        const duration = Date.now() - startTime;
        saveMetric(`POST /api/orders/generate-sample (${count} orders)`, duration);
        
        res.json({ message: `Successfully created ${count} sample orders` });
    } catch (error) {
        console.error("Sample data generation error:", error);
        res.status(500).json({ message: "Error generating sample orders" });
    }
});

// Update order status
app.patch("/api/orders/:id", async (req, res) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const startTime = Date.now();
        const order = await orderRepository.findOne({ 
            where: { id: req.params.id }
        });
        
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        orderRepository.merge(order, req.body);
        const result = await orderRepository.save(order);
        const duration = Date.now() - startTime;
        saveMetric(`PATCH /api/orders/${req.params.id}`, duration);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error updating order" });
    }
});

// Delete order
app.delete("/api/orders/:id", async (req, res) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const startTime = Date.now();
        const order = await orderRepository.findOne({ 
            where: { id: req.params.id }
        });
        
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        await orderRepository.remove(order);
        const duration = Date.now() - startTime;
        saveMetric(`DELETE /api/orders/${req.params.id}`, duration);
        res.json({ message: "Order deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting order" });
    }
});

// Get metrics from memory
app.get("/api/metrics", (req, res) => {
    try {
        // Calculate some statistics
        const stats = {
            metrics: queryMetrics,
            totalQueries: queryMetrics.length,
            averageDuration: queryMetrics.reduce((acc, curr) => acc + curr.duration, 0) / queryMetrics.length || 0,
            maxDuration: Math.max(...queryMetrics.map(m => m.duration)),
            minDuration: Math.min(...queryMetrics.map(m => m.duration))
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: "Error fetching metrics" });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
