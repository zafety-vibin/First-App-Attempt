/**
 * PortalMonitoring Component
 * Feature 009: Player Question Portal
 * T031: Display per-player token usage from monitoring endpoint
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PlayerStats {
  playerName: string;
  tokenCount: number;
}

interface MonitoringData {
  totalTokens: number;
  playerStats: PlayerStats[];
  totalPlayers: number;
  totalConversations: number;
  players: Array<{
    id: string;
    characterName: string;
    createdAt: number;
  }>;
}

interface PortalMonitoringProps {
  campaignId: string;
}

export const PortalMonitoring: React.FC<PortalMonitoringProps> = ({ campaignId }) => {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonitoringData();
    // Refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, [campaignId]);

  const loadMonitoringData = async () => {
    try {
      const response = await axios.get(`/api/campaigns/${campaignId}/portal/monitoring`);
      setData(response.data);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading monitoring data...</div>;
  }

  if (!data) {
    return <div>Failed to load monitoring data</div>;
  }

  return (
    <div style={{ maxWidth: '1000px' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196F3' }}>
            {data.totalTokens.toLocaleString()}
          </div>
          <div style={{ color: '#666', marginTop: '0.5rem' }}>Total Tokens Used</div>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>
            {data.totalPlayers}
          </div>
          <div style={{ color: '#666', marginTop: '0.5rem' }}>Active Players</div>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF9800' }}>
            {data.totalConversations}
          </div>
          <div style={{ color: '#666', marginTop: '0.5rem' }}>Conversations</div>
        </div>
      </div>

      {/* Per-Player Token Usage */}
      <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: 0 }}>Token Usage by Player</h3>
        </div>
        {data.playerStats.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No player activity yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>
                  Character Name
                </th>
                <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>
                  Tokens Used
                </th>
                <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.playerStats.map((stat, index) => {
                const percentage = data.totalTokens > 0
                  ? ((stat.tokenCount / data.totalTokens) * 100).toFixed(1)
                  : '0';
                return (
                  <tr key={index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '1rem' }}>{stat.playerName}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                      {stat.tokenCount.toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#666' }}>
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Player List */}
      <div style={{ marginTop: '2rem', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: 0 }}>Registered Players</h3>
        </div>
        {data.players.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No players have accessed the portal yet
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {data.players.map((player) => (
              <li
                key={player.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{player.characterName}</span>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                  Joined {new Date(player.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
