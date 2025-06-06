require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const clientPromise = require("./db");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(cors());
app.use(express.json());

// Test MongoDB connection before starting server
clientPromise
  .then(async (client) => {
    const db = client.db();
    console.log("✅ Connected to MongoDB");

    // Routes
    app.get("/residents", async (req, res) => {
      try {
        const residents = await db.collection("residents").find({}).sort({ _id: -1 }).toArray();
        res.json({ residents });
      } catch (e) {
        console.error("Error fetching residents:", e);
        res.status(500).json({ error: "Failed to fetch residents" });
      }
    });

    app.post("/upload", upload.single("image"), async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const stream = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
          if (error) return res.status(500).json({ error: "Cloudinary upload failed" });
          res.json({ url: result.secure_url });
        });

        stream.end(req.file.buffer);
      } catch (e) {
        console.error("Upload error:", e);
        res.status(500).json({ error: "Upload failed" });
      }
    });

    app.post("/residents", upload.single("profilePhoto"), async (req, res) => {
      let profilePhotoUrl = req.body.profilePhoto || "";
      if (req.file) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }).end(req.file.buffer);
          });
          profilePhotoUrl = uploadResult.secure_url;
        } catch (e) {
          console.error("Image upload failed:", e);
          return res.status(500).json({ error: "Image upload failed" });
        }
      }

      const { firstName, lastName, role, linkedin, twitter } = req.body;
      if (!firstName || !lastName || !role) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        const newResident = {
          firstName,
          lastName,
          role,
          profilePhoto: profilePhotoUrl,
          linkedin,
          twitter,
          createdAt: new Date(),
        };
        const result = await db.collection("residents").insertOne(newResident);
        newResident._id = result.insertedId;
        res.status(201).json(newResident);
      } catch (e) {
        console.error("Failed to add resident:", e);
        res.status(500).json({ error: "Failed to add resident" });
      }
    });

    // Start server only if MongoDB connects
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB", err);
    process.exit(1); // Exit app if DB connection fails
  });
