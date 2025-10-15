/**
 * KnowledgeGraphsWidget - Knowledge Graphs Overview Widget
 * Feature: 006-create-the-knowledge (Phase 3.5.2 - Dashboard Widget)
 *
 * Displays knowledge graph overview with size-adaptive rendering:
 * - Compact (1x1, 2x2): Total graph count only
 * - Detailed (3x3+): Graph list with node counts and confidence distribution
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseWidgetProps } from '../WidgetRegistry';
import { getKnowledgeGraphsOverview, KnowledgeGraphsOverviewData } from '../../../services/widgetDataService';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import './WidgetStyles.css';

// Icon mapping for graph types
const GRAPH_TYPE_ICONS: Record<string, string> = {
  'Geographical': '🗺️',
  'Political-Web': '🕸️',
  'Campaign-Story': '📖',
  'World-Foundations': '🏛️',
};

export const KnowledgeGraphsWidget: React.FC<BaseWidgetProps> = ({ size, viewMode, campaignId }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<KnowledgeGraphsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getKnowledgeGraphsOverview(campaignId);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load graph data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [campaignId, viewMode]);

  const handleNavigateToGraphs = () => {
    navigate(`/campaigns/${campaignId}/graphs`);
  };

  if (loading) {
    return (
      <div className="widget-loading">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget-error">
        <div className="widget-error-icon">⚠️</div>
        <div className="widget-error-text">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget-empty">
        <div className="widget-empty-icon">🧠</div>
        <div className="widget-empty-text">No data available</div>
      </div>
    );
  }

  const isCompact = size === '1x1' || size === '2x2';

  if (isCompact) {
    // Compact view: just show total graph count
    return (
      <div className="widget-compact" onClick={handleNavigateToGraphs} style={{ cursor: 'pointer' }}>
        <div className="widget-compact-icon">🧠</div>
        <div className="widget-compact-number">{data.totalGraphs}</div>
        <div className="widget-compact-label">Knowledge Graphs</div>
      </div>
    );
  }

  // Detailed view: show graph list with confidence distributions
  return (
    <div className="widget-detailed">
      <div className="widget-stat-primary">
        <div className="widget-stat-number">{data.totalGraphs}</div>
        <div className="widget-stat-label">Knowledge Graphs</div>
        <div className="widget-stat-sublabel">{data.totalNodes} total nodes</div>
      </div>

      {data.graphs.length === 0 ? (
        <div className="widget-empty">
          <div className="widget-empty-icon">🧠</div>
          <div className="widget-empty-text">No graphs yet</div>
          <button
            onClick={handleNavigateToGraphs}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Create First Graph
          </button>
        </div>
      ) : (
        <>
          <div className="widget-section">
            {data.graphs.map((graph) => (
              <div
                key={graph.id}
                onClick={handleNavigateToGraphs}
                style={{
                  padding: '0.75rem',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  marginBottom: '0.5rem'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f9f9f9')}
              >
                {/* Graph header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>
                      {GRAPH_TYPE_ICONS[graph.graphType] || '🧠'}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#333' }}>
                      {graph.graphName}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#999' }}>
                    {graph.nodeCount} nodes
                  </span>
                </div>

                {/* Confidence distribution */}
                {(graph.confidenceDistribution.high > 0 ||
                  graph.confidenceDistribution.medium > 0 ||
                  graph.confidenceDistribution.low > 0 ||
                  graph.confidenceDistribution.pinned > 0) && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                    {graph.confidenceDistribution.high > 0 && (
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="High confidence (≥0.7)"
                      >
                        🟢 {graph.confidenceDistribution.high}
                      </span>
                    )}
                    {graph.confidenceDistribution.medium > 0 && (
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(234, 179, 8, 0.1)',
                          color: '#ca8a04',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="Medium confidence (0.4-0.7)"
                      >
                        🟡 {graph.confidenceDistribution.medium}
                      </span>
                    )}
                    {graph.confidenceDistribution.low > 0 && (
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="Low confidence (<0.4)"
                      >
                        🔴 {graph.confidenceDistribution.low}
                      </span>
                    )}
                    {graph.confidenceDistribution.pinned > 0 && (
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="Pinned entities"
                      >
                        📌 {graph.confidenceDistribution.pinned}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleNavigateToGraphs}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'rgba(74, 144, 226, 0.1)',
              border: '1px solid rgba(74, 144, 226, 0.3)',
              borderRadius: '4px',
              color: '#4a90e2',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginTop: '0.5rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(74, 144, 226, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(74, 144, 226, 0.1)';
            }}
          >
            View All Graphs →
          </button>
        </>
      )}
    </div>
  );
};
