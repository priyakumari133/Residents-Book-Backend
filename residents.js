const express = require("express");
const cors = require("cors");
const clientPromise = require("./db");
const app = express();

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

app.post("/residents", async (req, res) => {
  const { firstName, lastName, role, profilePhoto, linkedin, twitter } = req.body;
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
      profilePhoto,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
