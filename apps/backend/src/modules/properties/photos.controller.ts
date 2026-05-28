import { Request, Response, NextFunction } from 'express';
import * as svc from './photos.service';

export async function getPhotos(req: Request, res: Response, next: NextFunction) {
  try {
    const photos = await svc.listPhotos(Number(req.params.id));
    res.json(photos);
  } catch (err) {
    next(err);
  }
}

export async function uploadPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se recibió ningún archivo' });
      return;
    }
    const photo = await svc.addPhoto(Number(req.params.id), req.file, req.body);
    res.status(201).json(photo);
  } catch (err) {
    next(err);
  }
}

export async function removePhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const photo = await svc.deletePhoto(Number(req.params.photoId));
    if (!photo) {
      res.status(404).json({ message: 'Foto no encontrada' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
