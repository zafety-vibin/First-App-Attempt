import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { Location } from '../utils/validationSchemas';
import { TruncatedText } from '../components/common/TruncatedText';

/**
 * T062: Location List Page
 * Custom column definitions for Location table
 */
export const LocationListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  const locationColumns: ColumnDef<Location>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => info.getValue(),
      size: 300,
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
      size: 180,
      meta: {
        editable: true,
        editableType: 'player_knowledge',
      },
    },
    {
      accessorKey: 'location_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 200,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'City', label: 'City' },
          { value: 'Town', label: 'Town' },
          { value: 'Village', label: 'Village' },
          { value: 'Dungeon', label: 'Dungeon' },
          { value: 'Wilderness', label: 'Wilderness' },
          { value: 'Plane', label: 'Plane' },
          { value: 'Building', label: 'Building' },
          { value: 'Region', label: 'Region' },
          { value: 'Other', label: 'Other' },
        ],
      },
    },
    {
      accessorKey: 'population',
      header: 'Population',
      cell: (info) => {
        const value = info.getValue();
        return value ? String(value) : '-';
      },
      size: 150,
      meta: {
        editable: true,
        editableType: 'number',
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? <TruncatedText text={desc} maxLength={100} /> : '-';
      },
      size: 700,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'cultural_characteristics',
      header: 'Culture',
      cell: (info) => {
        const culture = info.getValue() as string;
        return culture ? <TruncatedText text={culture} maxLength={80} /> : '-';
      },
      size: 600,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'notable_npcs',
      header: 'Notable NPCs',
      cell: (info) => {
        const npcs = info.getValue() as string[];
        return npcs && npcs.length > 0 ? `${npcs.length} NPCs` : '-';
      },
      size: 200,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'factions_present',
      header: 'Factions',
      cell: (info) => {
        const factions = info.getValue() as string[];
        return factions && factions.length > 0 ? `${factions.length} factions` : '-';
      },
      size: 200,
      meta: {
        editable: true,
        editableType: 'tags',
      },
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
      accessorKey: 'dm_secrets',
      header: 'DM: Secrets',
      cell: (info) => {
        const secrets = info.getValue() as string;
        return secrets ? <TruncatedText text={secrets} maxLength={100} /> : '-';
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
      category="locations"
      campaignId={campaignId}
      columns={locationColumns}
      statsConfig={{
        primaryStats: 'total',
        breakdownField: 'location_type',
        breakdownLabel: 'Types',
      }}
    />
  );
};
