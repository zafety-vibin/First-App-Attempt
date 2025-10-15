/**
 * Graph Versions Routes
 * Feature 006: Knowledge Graphs with Confidence Decay
 */

import { Router, Request, Response } from 'express';
import { GraphVersionService } from '../services/GraphVersionService';
import { KnowledgeGraphService } from '../services/KnowledgeGraphService';
import { CampaignService } from '../services/CampaignService';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// List versions
router.get('/api/campaigns/:campaignId/graphs/:graphId/versions', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const versions = GraphVersionService.getVersions(graphId);
    return res.json({ versions });
  } catch (error: any) {
    console.error('Error listing versions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get version
router.get('/api/campaigns/:campaignId/graphs/:graphId/versions/:versionId', async (req: Request, res: Response) => {
  try {
    const { campaignId, versionId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const version = GraphVersionService.getVersion(versionId);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    return res.json(version);
  } catch (error: any) {
    console.error('Error getting version:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create snapshot
router.post('/api/campaigns/:campaignId/graphs/:graphId/versions', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const version = GraphVersionService.createVersion(graphId);
    return res.status(201).json(version);
  } catch (error: any) {
    console.error('Error creating version:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore backup
router.post('/api/campaigns/:campaignId/graphs/:graphId/versions/restore', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    GraphVersionService.restoreFromBackup(graphId);
    return res.json({ message: 'Backup restored successfully' });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    if (error.message.includes('No backup')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
