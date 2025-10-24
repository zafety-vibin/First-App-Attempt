import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { SessionRecap } from '../utils/validationSchemas';
import { TruncatedText } from '../components/common/TruncatedText';

/**
 * T065: Session Recap List Page
 * Custom column definitions for Session Recap table
 */
export const SessionRecapListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  const sessionRecapColumns: ColumnDef<SessionRecap>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => info.getValue(),
      size: 200,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'session_date',
      header: 'Session Date',
      cell: (info) => {
        const value = info.getValue();
        if (!value) return '-';
        try {
          return new Date(Number(value) * 1000).toLocaleDateString();
        } catch {
          return String(value);
        }
      },
      size: 120,
    },
    {
      accessorKey: 'in_game_date_start',
      header: 'In-Game Date',
      cell: (info) => info.getValue() || '-',
      size: 130,
    },
    {
      accessorKey: 'time_passed',
      header: 'Time Passed',
      cell: (info) => info.getValue() || '-',
      size: 120,
    },
    {
      accessorKey: 'summary',
      header: 'Summary',
      cell: (info) => {
        const summary = info.getValue() as string;
        return summary ? (summary.length > 120 ? summary.substring(0, 120) + '...' : summary) : '-';
      },
      size: 350,
    },
    {
      accessorKey: 'key_events',
      header: 'Key Events',
      cell: (info) => {
        const events = info.getValue() as string[];
        return events && events.length > 0 ? `${events.length} events` : '-';
      },
      size: 100,
    },
    {
      accessorKey: 'npcs_encountered',
      header: 'NPCs Met',
      cell: (info) => {
        const npcs = info.getValue() as string[];
        return npcs && npcs.length > 0 ? `${npcs.length} NPCs` : '-';
      },
      size: 100,
    },
    {
      accessorKey: 'locations_visited',
      header: 'Locations',
      cell: (info) => {
        const value = info.getValue();
        if (!value) return '-';
        try {
          const locations = typeof value === 'string' ? JSON.parse(value) : value;
          return Array.isArray(locations) ? `${locations.length} locations` : String(value);
        } catch {
          return String(value);
        }
      },
      size: 110,
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: (info) => {
        const tags = info.getValue() as string[];
        return tags && tags.length > 0 ? tags.join(', ') : '-';
      },
      size: 150,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'dm_consequences',
      header: 'DM: Consequences',
      cell: (info) => {
        const consequences = info.getValue() as string;
        return consequences ? <TruncatedText text={consequences} maxLength={100} /> : '-';
      },
      size: 250,
    },
    {
      accessorKey: 'dm_behind_scenes',
      header: 'DM: Behind the Scenes',
      cell: (info) => {
        const behindScenes = info.getValue() as string;
        return behindScenes ? <TruncatedText text={behindScenes} maxLength={100} /> : '-';
      },
      size: 250,
    },
  ];

  return (
    <GenericCategoryListView
      category="session_recaps"
      campaignId={campaignId}
      columns={sessionRecapColumns}
      statsConfig={{
        primaryStats: 'total',
      }}
    />
  );
};
