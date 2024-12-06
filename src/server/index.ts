import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./database/config";
import { Order } from "./entities/Order";
import crypto from "crypto";

const app = express();

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

// Get all orders
app.get("/api/orders", async (req, res) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const orders = await orderRepository.find();
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
        const order = orderRepository.create(orderData);
        const result = await orderRepository.save(order);
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

        // Save orders in chunks to avoid memory issues
        const chunkSize = 100;
        for (let i = 0; i < sampleOrders.length; i += chunkSize) {
            const chunk = sampleOrders.slice(i, i + chunkSize);
            await orderRepository.save(chunk);
        }
        
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
        const order = await orderRepository.findOne({ 
            where: { id: req.params.id }
        });
        
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        orderRepository.merge(order, req.body);
        const result = await orderRepository.save(order);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error updating order" });
    }
});

// Delete order
app.delete("/api/orders/:id", async (req, res) => {
    try {
        const orderRepository = AppDataSource.getRepository(Order);
        const order = await orderRepository.findOne({ 
            where: { id: req.params.id }
        });
        
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        await orderRepository.remove(order);
        res.json({ message: "Order deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting order" });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
