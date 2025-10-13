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
      size: 200,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: (info) => info.getValue() || '-',
      size: 150,
    },
    {
      accessorKey: 'era_period',
      header: 'Era/Period',
      cell: (info) => info.getValue() || '-',
      size: 130,
    },
    {
      accessorKey: 'in_game_date',
      header: 'In-Game Date',
      cell: (info) => info.getValue() || '-',
      size: 130,
    },
    {
      accessorKey: 'historical_accuracy',
      header: 'Accuracy',
      cell: (info) => info.getValue() || '-',
      size: 110,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 120 ? desc.substring(0, 120) + '...' : desc) : '-';
      },
      size: 350,
    },
    {
      accessorKey: 'related_npcs',
      header: 'NPCs',
      cell: (info) => {
        const npcs = info.getValue() as string[];
        return npcs && npcs.length > 0 ? `${npcs.length} NPCs` : '-';
      },
      size: 100,
    },
    {
      accessorKey: 'related_factions',
      header: 'Factions',
      cell: (info) => {
        const factions = info.getValue() as string[];
        return factions && factions.length > 0 ? `${factions.length} factions` : '-';
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
    },
  ];

  return <GenericCategoryListView campaignId={campaignId} category="lore_entries" columns={columns} />;
};
