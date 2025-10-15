/**
 * Feature 006: Campaign-Story Graph Page
 * Timeline visualization with narrative/metadata dual-tier system
 * Horizontal scrollable timeline with in-game vs real-world date toggle
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, Calendar, CalendarDays, Download, RefreshCw } from 'lucide-react';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import { campaignStoryService, TimelineResponse } from '../services/campaignStoryService';
import { graphService } from '../services/graphService';
import { GraphNode, GraphEdge } from '../types/graph';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import './CampaignStoryPage.css';

const CampaignStoryPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);

  const [graphId, setGraphId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<'in_game' | 'real_world'>('real_world');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [timeScale, setTimeScale] = useState<'day' | 'week' | 'month' | 'year' | 'decade' | 'century'>('week');
  const [showScaleConfig, setShowScaleConfig] = useState(false);

  // Override main's overflow:auto to prevent scrollbar on this page
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) {
      const originalOverflow = (main as HTMLElement).style.overflow;
      (main as HTMLElement).style.overflow = 'hidden';
      return () => {
        (main as HTMLElement).style.overflow = originalOverflow;
      };
    }
  }, []);

  useEffect(() => {
    if (campaignId) {
      loadCampaignStoryGraph();
    }
  }, [campaignId]);

  const loadCampaignStoryGraph = async () => {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      // Find or create Campaign-Story graph
      const graphs = await graphService.listGraphs(campaignId);
      let campaignStoryGraph = graphs.find((g: any) => g.graph_type === 'Campaign-Story');

      if (!campaignStoryGraph) {
        // Create Campaign-Story graph
        campaignStoryGraph = await graphService.createGraph(campaignId, {
          graph_type: 'Campaign-Story',
          graph_name: 'Campaign Story',
          toggle_state: true,
          decay_rate: 0.2
        });
      }

      setGraphId(campaignStoryGraph.id);
      await loadTimeline(campaignStoryGraph.id);
    } catch (err) {
      console.error('Failed to load campaign story graph:', err);
      setError('Failed to load campaign story');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (gId: string) => {
    if (!campaignId || !gId) return;

    try {
      const timeline = await campaignStoryService.getTimeline(campaignId, gId, 'narrative');
      setNodes(timeline.nodes);
      setEdges(timeline.edges);
      renderTimeline(timeline.nodes, timeline.edges);
    } catch (err) {
      console.error('Failed to load timeline:', err);
      setError('Failed to load timeline');
    }
  };

  const renderTimeline = (timelineNodes: GraphNode[], timelineEdges: GraphEdge[]) => {
    if (!timelineRef.current) return;

    // Filter for session_recap nodes only
    const sessionRecaps = timelineNodes.filter(n => n.node_type === 'session_recap');

    if (sessionRecaps.length === 0) {
      return; // No sessions to render
    }

    // Convert session recaps to vis-timeline items
    const items = new DataSet(
      sessionRecaps.map(node => {
        const sessionNumber = node.attributes?.session_number || 0;
        const confidence = node.confidence || 1.0;

        // Determine date based on mode
        let date: Date;
        if (dateMode === 'in_game') {
          // Use days_elapsed_total as timeline position
          const daysElapsed = node.attributes?.days_elapsed_total || sessionNumber;
          date = new Date(Date.UTC(2000, 0, 1 + daysElapsed)); // Arbitrary epoch + days (Day 0 = Jan 1, 2000)
        } else {
          // Use real-world date
          date = node.attributes?.real_world_date
            ? new Date(node.attributes.real_world_date)
            : new Date();
        }

        return {
          id: node.id,
          content: `<div style="text-align: center;">
                      <div style="font-weight: 700; margin-bottom: 0.25rem;">Session ${sessionNumber}</div>
                      <div style="font-size: 0.75rem; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 0.25rem; margin-top: 0.25rem;">${node.name}</div>
                    </div>`,
          start: date,
          type: 'box',
          className: `session-node confidence-${Math.floor(confidence * 10)}`,
          title: node.name,
          style: `opacity: ${confidence}; background-color: #3b82f6; padding: 0.5rem 0.75rem;`
        };
      })
    );

    // Create or update timeline
    if (!timelineInstance.current) {
      const zoomLevels = getZoomLevelsForScale(timeScale);
      const options = {
        width: '100%',
        height: '500px',
        margin: {
          item: 20
        },
        orientation: 'top',
        zoomMin: zoomLevels.min,
        zoomMax: zoomLevels.max,
        clickToUse: false,
        selectable: true
      };

      timelineInstance.current = new Timeline(timelineRef.current, items, options);

      // Add select event listener
      timelineInstance.current.on('select', (properties: any) => {
        if (properties.items.length > 0) {
          const selectedId = properties.items[0];
          const node = sessionRecaps.find(n => n.id === selectedId);
          setSelectedNode(node || null);
        } else {
          setSelectedNode(null);
        }
      });
    } else {
      timelineInstance.current.setItems(items);
      // Re-fit timeline to show all items after date mode change
      timelineInstance.current.fit();
    }

    // Draw custom arcs for followed_by edges
    drawTimelineArcs(sessionRecaps, timelineEdges);
  };

  const drawTimelineArcs = (sessionRecaps: GraphNode[], timelineEdges: GraphEdge[]) => {
    // TODO: Implement custom SVG overlay for semi-circle arcs
    // For now, edges are not visually rendered (timeline shows nodes only)
  };

  const handleBulkImport = async () => {
    if (!campaignId || !graphId) return;

    if (!confirm('Import all sessions from session_recaps database table? This will create timeline nodes for all existing recaps.')) {
      return;
    }

    try {
      setLoading(true);
      const result = await campaignStoryService.bulkImportSessions(campaignId, graphId);
      alert(result.summary);
      await loadTimeline(graphId);
    } catch (err: any) {
      console.error('Bulk import failed:', err);
      alert(err.response?.data?.error || 'Bulk import failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleDateMode = () => {
    setDateMode(prev => prev === 'in_game' ? 'real_world' : 'in_game');
  };

  const getZoomLevelsForScale = (scale: typeof timeScale) => {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    switch (scale) {
      case 'day':
        return { min: MS_PER_DAY * 1, max: MS_PER_DAY * 30 }; // 1 day to 30 days
      case 'week':
        return { min: MS_PER_DAY * 7, max: MS_PER_DAY * 365 }; // 1 week to 1 year
      case 'month':
        return { min: MS_PER_DAY * 30, max: MS_PER_DAY * 365 * 3 }; // 1 month to 3 years
      case 'year':
        return { min: MS_PER_DAY * 365, max: MS_PER_DAY * 365 * 50 }; // 1 year to 50 years
      case 'decade':
        return { min: MS_PER_DAY * 365 * 10, max: MS_PER_DAY * 365 * 500 }; // 10 years to 500 years
      case 'century':
        return { min: MS_PER_DAY * 365 * 100, max: MS_PER_DAY * 365 * 5000 }; // 100 years to 5000 years
      default:
        return { min: MS_PER_DAY * 7, max: MS_PER_DAY * 365 };
    }
  };

  // Re-render timeline when date mode or time scale changes
  useEffect(() => {
    if (nodes.length > 0 && timelineInstance.current) {
      // Update zoom levels when scale changes
      const zoomLevels = getZoomLevelsForScale(timeScale);
      timelineInstance.current.setOptions({
        zoomMin: zoomLevels.min,
        zoomMax: zoomLevels.max
      });

      renderTimeline(nodes, edges);
    }
  }, [dateMode, timeScale]);

  if (loading) {
    return (
      <div className="graph-page loading">
        <Clock className="w-12 h-12 animate-pulse" />
        <p>Loading campaign story timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-page error">
        <p>{error}</p>
        <button onClick={loadCampaignStoryGraph}>Retry</button>
      </div>
    );
  }

  const sessionRecaps = nodes.filter(n => n.node_type === 'session_recap');

  return (
    <div className="graph-page campaign-story-page" style={{ overflow: 'hidden' }}>
      <header className="graph-page-header">
        <button
          className="back-button"
          onClick={() => navigate(`/campaigns/${campaignId}/graphs`)}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Graphs
        </button>
        <div className="header-content">
          <Clock className="w-8 h-8" />
          <div>
            <h1>Campaign Story</h1>
            <p className="subtitle">Session timeline with confidence decay (floor: 0.35)</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
          {sessionRecaps.length === 0 && (
            <button className="action-button primary" onClick={handleBulkImport}>
              <Download size={16} /> Bulk Import Sessions
            </button>
          )}
          {sessionRecaps.length > 0 && (
            <>
              <select
                className="action-button"
                value={timeScale}
                onChange={(e) => setTimeScale(e.target.value as typeof timeScale)}
                style={{ padding: '0.5rem 0.75rem' }}
              >
                <option value="day">Day Scale</option>
                <option value="week">Week Scale</option>
                <option value="month">Month Scale</option>
                <option value="year">Year Scale</option>
                <option value="decade">Decade Scale</option>
                <option value="century">Century Scale</option>
              </select>
              <button className="action-button" onClick={toggleDateMode}>
                {dateMode === 'in_game' ? <Calendar size={16} /> : <CalendarDays size={16} />}
                {dateMode === 'in_game' ? 'In-Game Dates' : 'Real-World Dates'}
              </button>
              <button className="action-button" onClick={() => loadTimeline(graphId!)}>
                <RefreshCw size={16} /> Refresh
              </button>
            </>
          )}
        </div>
      </header>

      <div className="timeline-container">
        {sessionRecaps.length === 0 ? (
          <div className="empty-state-overlay">
            <Clock size={64} />
            <p>No sessions in timeline yet.</p>
            <p className="hint">
              Use "Bulk Import Sessions" to import from your session_recaps database table.
            </p>
            <button className="add-first-button" onClick={handleBulkImport}>
              <Download size={16} /> Bulk Import Sessions
            </button>
          </div>
        ) : (
          <>
            <div ref={timelineRef} className="vis-timeline-container" />

            {selectedNode && (
              <div className="floating-details-panel" style={{ position: 'fixed', right: '2rem', top: '50%', transform: 'translateY(-50%)', maxHeight: '80vh', overflowY: 'auto' }}>
                <div className="panel-header">
                  <h3>{selectedNode.name}</h3>
                  <button
                    className="close-panel"
                    onClick={() => setSelectedNode(null)}
                    aria-label="Close panel"
                  >
                    ×
                  </button>
                </div>

                <div className="panel-content">
                  <div className="detail-row">
                    <span className="label">Session Number:</span>
                    <span className="value">{selectedNode.attributes?.session_number}</span>
                  </div>

                  {selectedNode.attributes?.in_game_date && (
                    <div className="detail-row">
                      <span className="label">In-Game Date:</span>
                      <span className="value">{selectedNode.attributes.in_game_date}</span>
                    </div>
                  )}

                  {selectedNode.attributes?.real_world_date && (
                    <div className="detail-row">
                      <span className="label">Real-World Date:</span>
                      <span className="value">{selectedNode.attributes.real_world_date}</span>
                    </div>
                  )}

                  {selectedNode.attributes?.days_elapsed_total && (
                    <div className="detail-row">
                      <span className="label">Days Elapsed:</span>
                      <span className="value">{selectedNode.attributes.days_elapsed_total} days</span>
                    </div>
                  )}

                  {selectedNode.confidence !== undefined && (
                    <div className="detail-row">
                      <span className="label">Confidence:</span>
                      <span className="value">{(selectedNode.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}

                  {selectedNode.observations && selectedNode.observations.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Events ({selectedNode.observations.length}):</span>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedNode.observations.map((obs: any, index: number) => (
                          <li key={index} style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.875rem'
                          }}>
                            {obs.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="info-box">
                    <p><strong>Confidence Decay:</strong></p>
                    <p>Campaign-Story memories decay to minimum 35% confidence (allows surprises from old content).</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export { CampaignStoryPage };
export default CampaignStoryPage;
