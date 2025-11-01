import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { SessionRecap } from '../utils/validationSchemas';
import { TruncatedText } from '../components/common/TruncatedText';
import { RelationshipCell } from '../components/table/RelationshipCell';

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
      size: 350,
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
      size: 180,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'in_game_date_start',
      header: 'In-Game Date',
      cell: (info) => info.getValue() || '-',
      size: 200,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'time_passed',
      header: 'Time Passed',
      cell: (info) => info.getValue() || '-',
      size: 180,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'summary',
      header: 'Summary',
      cell: (info) => {
        const summary = info.getValue() as string;
        return summary ? (summary.length > 120 ? summary.substring(0, 120) + '...' : summary) : '-';
      },
      size: 700,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'key_events',
      header: 'Key Events',
      cell: (info) => {
        const events = info.getValue() as string[];
        return events && events.length > 0 ? `${events.length} events` : '-';
      },
      size: 150,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'npcs_encountered',
      header: 'NPCs Met',
      cell: (info) => {
        const npcs = info.getValue() as string[];
        return (
          <RelationshipCell
            entityIds={npcs || []}
            category="npcs"
            campaignId={campaignId!}
            maxDisplay={3}
          />
        );
      },
      size: 300,
      enableSorting: false,
    },
    {
      accessorKey: 'locations_visited',
      header: 'Locations',
      cell: (info) => {
        const value = info.getValue();
        let locations: string[] = [];
        if (value) {
          try {
            locations = typeof value === 'string' ? JSON.parse(value) : value;
          } catch {
            locations = [];
          }
        }
        return (
          <RelationshipCell
            entityIds={locations || []}
            category="locations"
            campaignId={campaignId!}
            maxDisplay={2}
          />
        );
      },
      size: 300,
      enableSorting: false,
    },
    {
      accessorKey: 'quests_progressed',
      header: 'Quests',
      cell: (info) => {
        const quests = info.getValue() as string[];
        return (
          <RelationshipCell
            entityIds={quests || []}
            category="quests"
            campaignId={campaignId!}
            maxDisplay={2}
          />
        );
      },
      size: 300,
      enableSorting: false,
    },
    {
      accessorKey: 'loot_acquired',
      header: 'Loot',
      cell: (info) => {
        const loot = info.getValue() as string[];
        return (
          <RelationshipCell
            entityIds={loot || []}
            category="items"
            campaignId={campaignId!}
            maxDisplay={2}
          />
        );
      },
      size: 300,
      enableSorting: false,
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: (info) => {
        const tags = info.getValue() as string[];
        return tags && tags.length > 0 ? tags.join(', ') : '-';
      },
      size: 250,
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
      size: 600,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'dm_behind_scenes',
      header: 'DM: Behind the Scenes',
      cell: (info) => {
        const behindScenes = info.getValue() as string;
        return behindScenes ? <TruncatedText text={behindScenes} maxLength={100} /> : '-';
      },
      size: 600,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
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
