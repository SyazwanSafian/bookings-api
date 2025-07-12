const express = require("express");
const router = express.Router();

// Get Google Places API key from environment
const GOOGLE_PLACES_API_KEY = process.env.GOOGLEPLACES_API_KEY;


// Route 1: Search for places
// GET /api/places/search?query=badminton+court+kuala+lumpur
router.get("/search", async (req, res) => {
    try {
        const { query } = req.query;
        console.log("Search query received:", query);
        console.log("Using Google API key:", GOOGLE_PLACES_API_KEY ? '✅ loaded' : '❌ missing');

        // Validate query parameter
        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }

        // Google Places API Text Search endpoint
        const url = "https://places.googleapis.com/v1/places:searchText";

        // Request body for Google Places API
        const requestBody = {
            textQuery: query,
            maxResultCount: 10,
        };

        // Make request to Google Places API
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
                "X-Goog-FieldMask":
                    "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.photos",
            },
            body: JSON.stringify(requestBody),
        });

        // Check if request was successful
        if (!response.ok) {
            throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();

        // Format response for frontend
        const formattedPlaces =
            data.places?.map((place) => ({
                place_id: place.id,
                name: place.displayName?.text || "Unknown",
                address: place.formattedAddress || "Address not available",
                phone: place.nationalPhoneNumber || "Phone not available",
                rating: place.rating || 0,
                photos: (place.photos || []).map(photo =>
                    buildPhotoUrl(photo.name)
                )
            })) || [];

        res.json({
            success: true,
            count: formattedPlaces.length,
            places: formattedPlaces,
        });
    } catch (error) {
        console.error("Search places error:", error);
        res.status(500).json({
            success: false,
            error: `Failed to search places: ${error.message}`,
        });
    }
});

// Route 2: Get place details by place_id
// GET /api/places/details/ChIJN1t_tDeuEmsRUsoyG83frY4
router.get("/details/:place_id", async (req, res) => {
    try {
        const { place_id } = req.params;

        // Validate place_id parameter
        if (!place_id) {
            return res.status(400).json({ error: "Place ID is required" });
        }

        // Google Places API Place Details endpoint
        const url = `https://places.googleapis.com/v1/places/${place_id}`;
        console.log("Place Details URL:", url);
        console.log("Place ID received:", place_id);

        // Fields to retrieve from Google Places API
        const fields = [
            "id",
            "displayName",
            "formattedAddress",
            "nationalPhoneNumber",
            "internationalPhoneNumber",
            "rating",
            "userRatingCount",
            "photos",
            "businessStatus",
            "priceLevel",
            "location",
        ];

        // Make request to Google Places API
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
                "X-Goog-FieldMask": fields.join(","),
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Google Places API error response:", errorText);
            throw new Error(`Google API error: ${response.status}`);
        }

        const place = await response.json();

        // Format response for frontend
        const formattedPlace = {
            place_id: place.id,
            name: place.displayName?.text || "Unknown",
            address: place.formattedAddress || "Address not available",
            phone: place.nationalPhoneNumber || "Phone not available",
            international_phone: place.internationalPhoneNumber || null,
            rating: place.rating || 0,
            rating_count: place.userRatingCount || 0,
            business_status: place.businessStatus || "UNKNOWN",
            price_level: place.priceLevel || null,
            location: place.location || null,
            photos: (place.photos || []).map(photo =>
                buildPhotoUrl(photo.name)
            ),
        };

        res.json({
            success: true,
            place: formattedPlace,
        });
    } catch (error) {
        console.error("Get place details error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get place details",
        });
    }
});

module.exports = router;