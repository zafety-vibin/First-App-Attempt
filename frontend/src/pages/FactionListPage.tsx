import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { Faction } from '../utils/validationSchemas';
import { TruncatedText } from '../components/common/TruncatedText';

/**
 * T063: Faction List Page
 * Custom column definitions for Faction table
 */
export const FactionListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  const factionColumns: ColumnDef<Faction>[] = [
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
      accessorKey: 'player_knowledge',
      header: 'Visibility',
      cell: (info) => {
        const value = info.getValue() as string;
        const labelMap: Record<string, string> = {
          system: 'System',
          common_knowledge: 'Common',
          player_knowledge: 'Player',
          dm_only: 'DM Only',
        };
        return labelMap[value] || value || 'Common';
      },
      size: 120,
      meta: {
        editable: true,
        editableType: 'player_knowledge',
      },
    },
    {
      accessorKey: 'faction_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 120,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'Guild', label: 'Guild' },
          { value: 'Government', label: 'Government' },
          { value: 'Military', label: 'Military' },
          { value: 'Religious', label: 'Religious' },
          { value: 'Criminal', label: 'Criminal' },
          { value: 'Merchant', label: 'Merchant' },
          { value: 'Other', label: 'Other' },
        ],
      },
    },
    {
      accessorKey: 'power_level',
      header: 'Power',
      cell: (info) => info.getValue() || '-',
      size: 100,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'Major', label: 'Major' },
          { value: 'Moderate', label: 'Moderate' },
          { value: 'Minor', label: 'Minor' },
        ],
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? <TruncatedText text={desc} maxLength={100} /> : '-';
      },
      size: 300,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'goals',
      header: 'Goals',
      cell: (info) => {
        const goals = info.getValue() as string;
        return goals ? <TruncatedText text={goals} maxLength={80} /> : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'resources',
      header: 'Resources',
      cell: (info) => {
        const res = info.getValue() as string;
        return res ? <TruncatedText text={res} maxLength={60} /> : '-';
      },
      size: 200,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
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
      accessorKey: 'dm_true_agenda',
      header: 'DM: True Agenda',
      cell: (info) => {
        const agenda = info.getValue() as string;
        return agenda ? <TruncatedText text={agenda} maxLength={100} /> : '-';
      },
      size: 300,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
  ];

  return (
    <GenericCategoryListView
      category="factions"
      campaignId={campaignId}
      columns={factionColumns}
      statsConfig={{
        primaryStats: 'total',
        breakdownField: 'faction_type',
        breakdownLabel: 'Types',
      }}
    />
  );
};
