import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const baseDir = isVercel ? '/tmp' : path.join(__dirname, '..');
const uploadsDir = path.join(baseDir, 'uploads', 'verifications');

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Could not create uploads directory:', err.message);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per file
});

// Accept up to 10 degree files and 10 certificate files
const uploadFields = upload.fields([
  { name: 'degree_0', maxCount: 1 },
  { name: 'degree_1', maxCount: 1 },
  { name: 'degree_2', maxCount: 1 },
  { name: 'degree_3', maxCount: 1 },
  { name: 'degree_4', maxCount: 1 },
  { name: 'degree_5', maxCount: 1 },
  { name: 'degree_6', maxCount: 1 },
  { name: 'degree_7', maxCount: 1 },
  { name: 'degree_8', maxCount: 1 },
  { name: 'degree_9', maxCount: 1 },
  { name: 'certificate_0', maxCount: 1 },
  { name: 'certificate_1', maxCount: 1 },
  { name: 'certificate_2', maxCount: 1 },
  { name: 'certificate_3', maxCount: 1 },
  { name: 'certificate_4', maxCount: 1 },
  { name: 'certificate_5', maxCount: 1 },
  { name: 'certificate_6', maxCount: 1 },
  { name: 'certificate_7', maxCount: 1 },
  { name: 'certificate_8', maxCount: 1 },
  { name: 'certificate_9', maxCount: 1 }
]);

// POST /api/doctor/verification
router.post('/verification', uploadFields, async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      phone,
      email,
      registrationNumber,
      yearsOfPractice,
      specialisation,
      imaVerified,
      degreesMeta,
      certificatesMeta
    } = req.body;

    // Parse metadata
    let degrees = [];
    let certificates = [];
    try {
      degrees = JSON.parse(degreesMeta || '[]');
      certificates = JSON.parse(certificatesMeta || '[]');
    } catch (e) {
      return res.status(400).json({ error: 'Invalid metadata format' });
    }

    // Attach file paths to degrees
    degrees = degrees.map((d, i) => {
      const fileKey = `degree_${i}`;
      const file = req.files?.[fileKey]?.[0];
      return {
        name: d.name,
        filePath: file ? `/uploads/verifications/${file.filename}` : null
      };
    });

    // Attach file paths to certificates
    certificates = certificates.map((c, i) => {
      const fileKey = `certificate_${i}`;
      const file = req.files?.[fileKey]?.[0];
      return {
        name: c.name,
        filePath: file ? `/uploads/verifications/${file.filename}` : null
      };
    });

    // Build verification record
    const verificationData = {
      firstName,
      middleName: middleName || '',
      lastName,
      fullName: [firstName, middleName, lastName].filter(Boolean).join(' '),
      phone,
      email,
      registrationNumber,
      specialisation: specialisation || '',
      yearsOfPractice: yearsOfPractice ? parseInt(yearsOfPractice, 10) : null,
      imaVerified: imaVerified === 'true',
      degrees,
      certificates,
      status: 'pending', // pending | approved | rejected
      submittedAt: new Date()
    };

    // For now, store in-memory or log (replace with DB save)
    // In production, save to MongoDB collection e.g. DoctorVerification
    console.log('Doctor verification submission:', verificationData);

    // TODO: Save to DB
    // const DoctorVerification = mongoose.model('DoctorVerification');
    // await DoctorVerification.create(verificationData);

    res.status(201).json({
      message: 'Verification submitted successfully',
      data: verificationData
    });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/doctor/verify-ima - Verify doctor name with IMA India database
router.get('/verify-ima', async (req, res) => {
  try {
    const { firstName, lastName } = req.query;
    
    const firstNameTrimmed = firstName?.trim()?.toUpperCase() || '';
    const lastNameTrimmed = lastName?.trim()?.toUpperCase() || '';
    
    if (!firstNameTrimmed && !lastNameTrimmed) {
      return res.status(400).json({ error: 'First name or last name is required', found: false });
    }

    const timestamp = Date.now();
    
    // Helper function to build IMA API URL
    const buildImaUrl = (searchTerm) => {
      return `https://www.ima-india.org/demomembership/ima-member-sys-encr/server_processing.php?draw=5&columns%5B0%5D%5Bdata%5D=0&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=1&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=2&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=3&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=0&length=100&search%5Bvalue%5D=${encodeURIComponent(searchTerm)}&search%5Bregex%5D=false&_=${timestamp}`;
    };

    const fetchOptions = {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MediChain/1.0'
      }
    };

    // Search by lastName (more unique usually)
    // IMA data format: [State, Branch, FirstName, LastName]
    const searchTerm = lastNameTrimmed || firstNameTrimmed;
    const response = await fetch(buildImaUrl(searchTerm), fetchOptions);

    if (!response.ok) {
      throw new Error('IMA API request failed');
    }

    const data = await response.json();
    const records = data.data || [];
    
    // Check if any record matches BOTH firstName AND lastName
    // IMA record format: [State, Branch, FirstName, LastName]
    let matchedRecord = null;
    let found = false;
    
    if (firstNameTrimmed && lastNameTrimmed) {
      // Both names provided - look for exact match of both
      matchedRecord = records.find(record => {
        const recordFirstName = (record[2] || '').toUpperCase().trim();
        const recordLastName = (record[3] || '').toUpperCase().trim();
        return recordFirstName === firstNameTrimmed && recordLastName === lastNameTrimmed;
      });
      found = !!matchedRecord;
    } else {
      // Only one name provided - just check if any record matches
      found = records.length > 0;
      matchedRecord = records[0];
    }

    res.json({
      found,
      recordsTotal: data.recordsFiltered || 0,
      matchedRecord: matchedRecord ? {
        state: matchedRecord[0],
        branch: matchedRecord[1],
        firstName: matchedRecord[2],
        lastName: matchedRecord[3]
      } : null,
      records: records.slice(0, 5).map(r => ({
        state: r[0],
        branch: r[1],
        firstName: r[2],
        lastName: r[3]
      }))
    });
  } catch (err) {
    console.error('IMA verification error:', err);
    res.status(500).json({ error: 'Failed to verify with IMA', found: false });
  }
});

// GET /api/doctor/verification/status (optional: check own verification status)
router.get('/verification/status', async (req, res) => {
  // TODO: Implement lookup by authenticated doctor's ID
  res.json({ status: 'pending', message: 'Verification status lookup not yet implemented' });
});

export default router;
