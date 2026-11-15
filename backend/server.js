
const express = require("express");
const cors = require("cors");
require("dotenv").config();



const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication Routes
const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to DriveWise Backend!",
        status: "Server is running"
    });
});



// Vehicle Management Routes
const vehicleRoutes = require("./routes/vehicleRoutes");

app.use("/api/vehicles", vehicleRoutes);
// User Profile Routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Provider Routes
const providerRoutes = require("./routes/providerRoutes");
app.use("/api/providers", providerRoutes);
// Server
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`DriveWise backend running on port ${PORT}`);
});
