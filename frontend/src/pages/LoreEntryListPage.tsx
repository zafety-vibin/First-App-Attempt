import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';

export const LoreEntryListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return <div>Error: Campaign ID not found</div>;
  }

  const columns: ColumnDef<any>[] = [
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
      accessorKey: 'category',
      header: 'Category',
      cell: (info) => info.getValue() || '-',
      size: 250,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'historical_event', label: 'Historical Event' },
          { value: 'myth_legend', label: 'Myth/Legend' },
          { value: 'cultural_tradition', label: 'Cultural Tradition' },
          { value: 'religious_text', label: 'Religious Text' },
          { value: 'academic_knowledge', label: 'Academic Knowledge' },
          { value: 'prophecy', label: 'Prophecy' },
          { value: 'cosmology', label: 'Cosmology' },
          { value: 'other', label: 'Other' },
        ],
      },
    },
    {
      accessorKey: 'era_period',
      header: 'Era/Period',
      cell: (info) => info.getValue() || '-',
      size: 200,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'in_game_date',
      header: 'In-Game Date',
      cell: (info) => info.getValue() || '-',
      size: 200,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'historical_accuracy',
      header: 'Accuracy',
      cell: (info) => info.getValue() || '-',
      size: 180,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'accurate', label: 'Accurate' },
          { value: 'mostly_accurate', label: 'Mostly Accurate' },
          { value: 'embellished', label: 'Embellished' },
          { value: 'myth', label: 'Myth' },
          { value: 'fabrication', label: 'Fabrication' },
        ],
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 120 ? desc.substring(0, 120) + '...' : desc) : '-';
      },
      size: 700,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'related_npcs',
      header: 'NPCs',
      cell: (info) => {
        const npcs = info.getValue() as string[];
        return npcs && npcs.length > 0 ? `${npcs.length} NPCs` : '-';
      },
      size: 150,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'related_factions',
      header: 'Factions',
      cell: (info) => {
        const factions = info.getValue() as string[];
        return factions && factions.length > 0 ? `${factions.length} factions` : '-';
      },
      size: 180,
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
  ];

  return <GenericCategoryListView campaignId={campaignId} category="lore_entries" columns={columns} />;
};
