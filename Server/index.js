import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { MongoMemoryServer } from "mongodb-memory-server";

// Routers
import inventoryRouter from "./routers/inventoryRouter.js";
import billingRouter from "./routers/billingRouter.js";
import pharmacyRouter from "./routers/pharmacyRouter.js";
import prescriptionRouter from "./routers/prescriptionRouter.js";
import authRouter from "./routers/authRouter.js";
import appointmentRouter from "./routers/appointmentRouter.js"; 
import placesRouter from "./routers/locationRouter.js"; 
import scanRouter from "./routers/scanRouter.js";
import doctorRouter from "./routers/doctorRouter.js";

// Initialize app
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const USE_MEMORY_MONGO = process.env.USE_MEMORY_MONGO === "true";
const MONGO_URI = process.env.MONGO_URI;

async function connectDatabase() {
  if (USE_MEMORY_MONGO) {
    try {
      const memoryServer = await MongoMemoryServer.create({
        instance: { startupTimeout: 60000 },
      });
      await mongoose.connect(memoryServer.getUri(), {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(" In-memory MongoDB connected");
      return;
    } catch (error) {
      console.warn(" In-memory MongoDB unavailable; starting without database.");
      console.warn(error);
      return;
    }
  }

  if (!MONGO_URI) {
    console.warn(" Missing MONGO_URI in .env file; starting without database.");
    return;
  }

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log(" MongoDB connected");
}

async function startServer() {
  await connectDatabase();

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => console.log(` Server running on port ${PORT}`));

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is already in use.`);
      console.error('Close the other running server, or change PORT in Server/.env.');
      console.error('Windows PowerShell quick fix:');
      console.error(`  Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq ${PORT} } | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error(' Failed to start server:', err);
  process.exit(1);
});

// Routers
app.use("/api/inventory", inventoryRouter);
app.use("/api/billing", billingRouter);
app.use("/api/pharmacy", pharmacyRouter);
app.use("/api/prescriptions", prescriptionRouter);
app.use("/api/auth", authRouter);
app.use("/api/places", placesRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/scan", scanRouter);
app.use("/api/doctor", doctorRouter);
// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));
// Root endpoint
app.get("/", (req, res) => {
  res.send(" MediChain backend running successfully!");
});

export default app;
