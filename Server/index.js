import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

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
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error(" Missing MONGO_URI in .env file");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

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

// Start server
if (process.env.NODE_ENV !== 'production') {
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

export default app;
