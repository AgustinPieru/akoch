import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import { getDocuments, uploadDocument, removeDocument } from './documents.controller';

const router = Router({ mergeParams: true });

router.use(authenticate);

// GET    /api/v1/documents/:entityType/:entityId
router.get('/:entityType/:entityId', getDocuments);

// POST   /api/v1/documents/:entityType/:entityId   (multipart/form-data, field: file)
router.post('/:entityType/:entityId', uploadSingle, uploadDocument);

// DELETE /api/v1/documents/:id
router.delete('/:id', removeDocument);

export default router;
