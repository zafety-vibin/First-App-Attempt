import express, { Request, Response } from 'express';
import { PlanarForceService } from '../services/PlanarForceService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();
const service = new PlanarForceService(db);

router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

router.get('/', (req: Request, res: Response) => {
  const { campaign_id, limit = '50', offset = '0' } = req.query;
  if (!campaign_id) { res.status(400).json({ error: 'campaign_id required' }); return; }
  const result = service.list(
    { campaign_id: campaign_id as string },
    { limit: parseInt(limit as string), offset: parseInt(offset as string) },
    'created_at',
    'desc',
    req.categoryViewMode || 'dm_view'
  );
  res.status(200).json({ data: result.data, pagination: { total: result.total } });
});

router.post('/', (req: Request, res: Response) => {
  try {
    const entry = service.create(req.body);
    res.status(201).json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  const entry = service.findById(req.params.id);
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  res.status(200).json(entry);
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const entry = service.update(req.params.id, req.body);
    res.status(200).json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    service.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
