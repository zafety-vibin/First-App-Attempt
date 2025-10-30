import express, { Request, Response } from 'express';
import { LoreEntryService } from '../services/LoreEntryService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();
const service = new LoreEntryService(db);

router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

router.get('/', (req: Request, res: Response) => {
  const { campaign_id, limit = '50', offset = '0' } = req.query;
  const userId = req.user!.id;

  if (!campaign_id) {
    res.status(400).json({ error: 'campaign_id required' });
    return;
  }

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaign_id, userId);
  if (!campaign) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

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
  const userId = req.user!.id;
  if (!req.body.campaign_id || !req.body.name) {
    res.status(400).json({ error: 'campaign_id and name required' });
    return;
  }
  try {
    const entry = service.create(req.body, { ownerId: userId });
    res.status(201).json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const entry = service.findById(id);
  if (!entry) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(entry.campaign_id, userId);
  if (!campaign) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  res.status(200).json(entry);
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const entry = service.update(id, req.body, { ownerId: userId });
    res.status(200).json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    service.delete(id, { ownerId: userId });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
