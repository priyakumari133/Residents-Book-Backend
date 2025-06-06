require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const clientPromise = require("./db");
const app = express();

const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors());
app.use(express.json());

app.get("/residents", async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const residents = await db.collection("residents").find({}).sort({ _id: -1 }).toArray();
    res.json({ residents });
  } catch (e) {
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
      return res.status(500).json({ error: "Image upload failed" });
    }
  }
  const { firstName, lastName, role, linkedin, twitter } = req.body;
  if (!firstName || !lastName || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const client = await clientPromise;
    const db = client.db();
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
    res.status(500).json({ error: "Failed to add resident" });
  }
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
