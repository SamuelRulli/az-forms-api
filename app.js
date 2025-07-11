import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001; // Changed to 4001 to avoid conflict
const MONGODB_URI =
  process.env.VITE_MONGODB_URI && process.env.VITE_MONGODB_URI.trim()
    ? process.env.VITE_MONGODB_URI
    : 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'az_forms';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage - use memory storage to convert to base64
const storage = multer.memoryStorage();

// Configure file filter to control which files are accepted
const fileFilter = (req, file, cb) => {
  // Accept all files for now, but you can add restrictions here
  cb(null, true);
  
  // Example of how to restrict file types:
  // if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
  //   cb(null, true);
  // } else {
  //   cb(new Error('Unsupported file type'), false);
  // }
};

// Initialize multer with configuration
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  }
});

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// File Upload Routes

// Single file upload - accept any field that starts with 'file'
app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Use the first file from the request
    const file = req.files[0];
    
    // Convert file buffer to base64
    const fileBase64 = file.buffer.toString('base64');
    
    const db = await connectToDatabase();
    
    // Create file metadata to store in database
    const fileData = {
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      base64Data: fileBase64, // Store the file as base64
      uploadDate: new Date(),
      formId: req.body.formId || null, // Optional form association
    };
    
    // Save file metadata to database
    const result = await db.collection('files').insertOne(fileData);
    
    // Return success response with file information
    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: result.insertedId,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        downloadUrl: `/api/files/${result.insertedId}/download`
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Multiple files upload (up to 5 files) - accept any fields
app.post('/api/upload/multiple', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const db = await connectToDatabase();
    const uploadedFiles = [];
    
    // Process each uploaded file
    for (const file of req.files) {
      // Convert file buffer to base64
      const fileBase64 = file.buffer.toString('base64');
      
      // Create file metadata
      const fileData = {
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        base64Data: fileBase64, // Store the file as base64
        uploadDate: new Date(),
        formId: req.body.formId || null, // Optional form association
      };
      
      // Save file metadata to database
      const result = await db.collection('files').insertOne(fileData);
      
      // Add to response array
      uploadedFiles.push({
        id: result.insertedId,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        downloadUrl: `/api/files/${result.insertedId}/download`
      });
    }
    
    // Return success response with files information
    res.status(201).json({
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get file metadata by ID
app.get('/api/files/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const fileId = req.params.id;
    const file = await db.collection('files').findOne({ _id: fileId });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Don't include the base64 data in the response to keep it lightweight
    const { base64Data, ...fileWithoutBase64 } = file;
    
    res.json({
      ...fileWithoutBase64,
      downloadUrl: `/api/files/${fileId}/download`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all files
app.get('/api/files', async (req, res) => {
  try {
    const db = await connectToDatabase();
    // Exclude base64Data field from the results to keep response size manageable
    const files = await db.collection('files').find({}, { projection: { base64Data: 0 } }).toArray();
    
    // Add download URL to each file
    const filesWithUrls = files.map(file => ({
      ...file,
      downloadUrl: `/api/files/${file._id}/download`
    }));
    
    res.json(filesWithUrls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download a file by ID
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const fileId = req.params.id;
    const file = await db.collection('files').findOne({ _id: fileId });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Convert base64 back to buffer
    const fileBuffer = Buffer.from(file.base64Data, 'base64');
    
    // Set appropriate headers
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    // Send the file
    res.send(fileBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a file
app.delete('/api/files/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const fileId = req.params.id;
    
    // Get file info first
    const file = await db.collection('files').findOne({ _id: fileId });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete from database
    await db.collection('files').deleteOne({ _id: fileId });
    
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware for multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    console.error('Multer error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: `Unexpected field name. Expected '${err.field}'` });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  // For any other errors, pass to next error handler
  next(err);
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
