import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.VITE_MONGODB_URI && process.env.VITE_MONGODB_URI.trim()
    ? process.env.VITE_MONGODB_URI
    : 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'az_forms';

app.use(cors());
app.use(express.json());

let db;
let client;

async function connectToDatabase() {
  if (db) return db;
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

// Save a form template
app.post('/api/forms', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const form = req.body;
    const result = await db.collection('forms').insertOne(form);
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a form
app.put('/api/forms/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const formId = req.params.id;
    const formData = req.body;
    const result = await db.collection('forms').updateOne(
      { id: formId },
      { $set: formData }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json({ message: 'Form updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a form response
app.post('/api/responses', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const response = req.body;
    const result = await db.collection('form_responses').insertOne(response);
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all forms
app.get('/api/forms', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const forms = await db.collection('forms').find({}).toArray();
    res.json(forms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific form by ID
app.get('/api/forms/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const formId = req.params.id;
    const form = await db.collection('forms').findOne({ id: formId });
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json(form);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all responses
app.get('/api/responses', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const responses = await db.collection('form_responses').find({}).toArray();
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});