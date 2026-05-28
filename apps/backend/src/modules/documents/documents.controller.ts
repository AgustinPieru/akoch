import { Request, Response, NextFunction } from 'express';
import * as svc from './documents.service';

export async function getDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityType, entityId } = req.params;
    const docs = await svc.listDocuments(entityType as svc.EntityType, Number(entityId));
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

export async function uploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityType, entityId } = req.params;
    if (!req.file) {
      res.status(400).json({ message: 'No se recibió ningún archivo' });
      return;
    }
    const doc = await svc.createDocument(
      entityType as svc.EntityType,
      Number(entityId),
      req.file,
      req.body,
    );
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

export async function removeDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await svc.deleteDocument(Number(req.params.id));
    if (!doc) {
      res.status(404).json({ message: 'Documento no encontrado' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
