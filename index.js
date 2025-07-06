const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const { Pool } = require("pg");
const { BOOKINGS_DATABASE } = process.env;
const placesRouter = require("./routes/places");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    connectionString: BOOKINGS_DATABASE,
    ssl: {
        require: true,
    },
});

// Routes
app.use("/api/places", placesRouter);

// Test database connection
async function getPostgresVersion() {
    const client = await pool.connect();
    try {
        const response = await client.query("SELECT version()");
        console.log("Database connected:", response.rows[0]);
    } catch (error) {
        console.error("Database connection error:", error);
    } finally {
        client.release();
    }
}

getPostgresVersion();

// POST endpoint - to create a booking
app.post("/bookings", async (req, res) => {
    const client = await pool.connect();
    try {
        const data = {
            place_id: req.body.place_id,
            court_no: req.body.court_no,
            phone_no: req.body.phone_no,
            email: req.body.email,
            user_id: 1,
            start_time: req.body.start_time,
            end_time: req.body.end_time,
            // user_id hardcoded as 1 for now before firebase integration
            // From firebase auth, not user input (user_id: req.firebaseUser.uid)
        };

        const query =
            "INSERT INTO bookings (place_id, court_no, phone_no, email, user_id, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id";

        const params = [
            data.place_id,
            data.court_no,
            data.phone_no,
            data.email,
            data.user_id,
            data.start_time,
            data.end_time,
        ];

        const result = await client.query(query, params);
        data.id = result.rows[0].id;

        console.log(`Bookings created with id ${data.id}`);
        res.json({
            status: "Success",
            data: data,
            message: "Bookings created",
        });
    } catch (error) {
        console.error("Error: ", error.message);
        res
            .status(500)
            .json({ error: "Failed to create booking. Please try again." });
    } finally {
        client.release();
    }
});

// GET endpoint - all bookings (for admin)
app.get("/bookings", async (req, res) => {
    const client = await pool.connect();
    try {
        const query = "SELECT * FROM bookings";
        const result = await client.query(query);
        console.log(`Retrieved all bookings`);
        res.json(result.rows);
    } catch (error) {
        console.error("Error:", error.stack);
        res.status(500).send("An error has occurred.");
    } finally {
        client.release();
    }
});

// GET endpoint - by user_id (for users to see all their bookings)
app.get("/users/:user_id/bookings", async (req, res) => {
    const client = await pool.connect();
    try {
        const query = "SELECT * FROM bookings WHERE user_id = $1";
        const params = [req.params.user_id];
        const result = await client.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json({
            status: "Success",
            data: result.rows,
            message: `Here are the bookings by user ${req.params.user_id}.`,
        });
    } catch (error) {
        console.error("Error:", error.stack);
        res.status(500).send("An error has occurred.");
    } finally {
        client.release();
    }
});

// PUT endpoint - edit by bookings ID
app.put("/bookings/:id", async (req, res) => {
    const client = await pool.connect();
    const id = req.params.id;
    const updatedData = req.body;
    try {
        const updateQuery =
            "UPDATE bookings SET court_no = $1, start_time = $2, end_time = $3 WHERE id = $4";
        const queryData = [
            updatedData.court_no,
            updatedData.start_time,
            updatedData.end_time,
            id,
        ];
        await client.query(updateQuery, queryData);
        res.json({ status: "success", message: "Booking updated successfully" });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DELETE endpoint - by booking ID
app.delete("/bookings/:id", async (req, res) => {
    const id = req.params.id;
    const client = await pool.connect();
    try {
        const deleteQuery = "DELETE FROM bookings WHERE id = $1";
        await client.query(deleteQuery, [id]);
        console.log("Successfully deleted booking with ID ", id);
        res.json({ status: "success", message: "Booking deleted successfully." });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        message: "Sport Facility API",
        version: "1.0.0",
        endpoints: {
            places: "/api/places",
            bookings: "/bookings",
        },
    });
});

// Start server (only for local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;