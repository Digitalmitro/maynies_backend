// src/modules/student/routes/admission.routes.ts
import { Router } from 'express';
import { admissionController } from '../controllers/admission.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();
// Protect all routes: only students
router.use(authenticate);

// Fetch full application
router.get('/', (req, res, next) => { admissionController.getApplication(req, res, next) });
// Fetch only status
router.get('/status', (req, res, next) => { admissionController.getStatus(req, res, next) });
// Create or update (re-apply) admission
router.post('/apply', (req, res, next) => { admissionController.apply(req, res, next) });
// Add a document reference
router.post('/documents', (req, res, next) => { admissionController.addDocument(req, res, next) });
// List all documents
router.get('/documents', (req, res, next) => { admissionController.listDocuments(req, res, next) });
// Soft-delete a document
router.delete('/documents/:fileId', (req, res, next) => { admissionController.deleteDocument(req, res, next) });
// Restore a soft-deleted document

export default router;