import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadPropertyMedia } from '../../middleware/upload.middleware';
import { createProperty, deleteProperty, getProperties, getProperty, updateProperty } from './properties.controller';
import { getPhotos, uploadPhoto, removePhoto } from './photos.controller';

const router = Router();

router.use(authenticate);

router.get('/', getProperties);
router.get('/:id', getProperty);

router.post(
  '/',
  [
    body('type').notEmpty().withMessage('Tipo de propiedad requerido'),
    body('street').notEmpty().withMessage('Calle requerida'),
    body('number').notEmpty().withMessage('Número requerido'),
    body('city').notEmpty().withMessage('Ciudad requerida'),
    body('owners').isArray().withMessage('Propietarios requeridos'),
    body('owners.*.ownerId').isInt().withMessage('ID de propietario inválido'),
    body('owners.*.percentage').isFloat({ min: 0, max: 100 }).withMessage('Porcentaje inválido'),
  ],
  createProperty
);

router.patch(
  '/:id',
  [body('type').optional().notEmpty()],
  updateProperty
);

router.delete('/:id', deleteProperty);

// Photos
router.get('/:id/photos', getPhotos);
router.post('/:id/photos', uploadPropertyMedia, uploadPhoto);
router.delete('/:id/photos/:photoId', removePhoto);

export default router;
