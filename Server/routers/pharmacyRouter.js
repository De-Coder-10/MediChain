import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createPharmacy, getPharmacies } from '../controllers/pharmacyController.js';

const router = express.Router();

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const baseDir = isVercel ? '/tmp' : path.join(__dirname, '..');
const uploadsDir = path.join(baseDir, 'uploads', 'pharmacy-verifications');

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

// Accept up to 10 license files and 10 certificate files
const uploadFields = upload.fields([
  { name: 'license_0', maxCount: 1 },
  { name: 'license_1', maxCount: 1 },
  { name: 'license_2', maxCount: 1 },
  { name: 'license_3', maxCount: 1 },
  { name: 'license_4', maxCount: 1 },
  { name: 'license_5', maxCount: 1 },
  { name: 'license_6', maxCount: 1 },
  { name: 'license_7', maxCount: 1 },
  { name: 'license_8', maxCount: 1 },
  { name: 'license_9', maxCount: 1 },
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

// POST /api/pharmacy/verification
router.post('/verification', uploadFields, async (req, res) => {
  try {
    const {
      shopName,
      ownerName,
      phone,
      email,
      licenseNumber,
      gstNumber,
      address,
      city,
      state,
      pincode,
      yearsInBusiness,
      licensesMeta,
      certificatesMeta
    } = req.body;

    // Parse metadata
    let licenses = [];
    let certificates = [];
    try {
      licenses = JSON.parse(licensesMeta || '[]');
      certificates = JSON.parse(certificatesMeta || '[]');
    } catch (e) {
      return res.status(400).json({ error: 'Invalid metadata format' });
    }

    // Attach file paths to licenses
    licenses = licenses.map((l, i) => {
      const fileKey = `license_${i}`;
      const file = req.files?.[fileKey]?.[0];
      return {
        name: l.name,
        filePath: file ? `/uploads/pharmacy-verifications/${file.filename}` : null
      };
    });

    // Attach file paths to certificates
    certificates = certificates.map((c, i) => {
      const fileKey = `certificate_${i}`;
      const file = req.files?.[fileKey]?.[0];
      return {
        name: c.name,
        filePath: file ? `/uploads/pharmacy-verifications/${file.filename}` : null
      };
    });

    // Build verification record
    const verificationData = {
      shopName,
      ownerName,
      phone,
      email,
      licenseNumber,
      gstNumber,
      address: {
        street: address,
        city,
        state,
        pincode
      },
      yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness, 10) : null,
      licenses,
      certificates,
      status: 'pending', // pending | approved | rejected
      submittedAt: new Date()
    };

    // For now, log (replace with DB save)
    console.log('Pharmacy verification submission:', verificationData);

    // TODO: Save to DB
    // const PharmacyVerification = mongoose.model('PharmacyVerification');
    // await PharmacyVerification.create(verificationData);

    res.status(201).json({
      message: 'Verification submitted successfully',
      data: verificationData
    });
  } catch (err) {
    console.error('Pharmacy verification error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/pharmacy/verification/status
router.get('/verification/status', async (req, res) => {
  // TODO: Implement lookup by authenticated pharmacy's ID
  res.json({ status: 'pending', message: 'Verification status lookup not yet implemented' });
});

router.post('/', createPharmacy);
router.get('/', getPharmacies);

export default router;
