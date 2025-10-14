import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { TruncatedText } from '../components/common/TruncatedText';

export const CreatureListPage: React.FC = () => {
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
      accessorKey: 'creature_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 150,
    },
    {
      accessorKey: 'challenge_rating',
      header: 'CR',
      cell: (info) => info.getValue() || '-',
      size: 80,
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
      accessorKey: 'abilities',
      header: 'Abilities',
      cell: (info) => {
        const abilities = info.getValue() as string;
        return abilities ? (abilities.length > 80 ? abilities.substring(0, 80) + '...' : abilities) : '-';
      },
      size: 250,
    },
    {
      accessorKey: 'habitats',
      header: 'Habitats',
      cell: (info) => {
        const habitats = info.getValue() as string[];
        return habitats && habitats.length > 0 ? `${habitats.length} locations` : '-';
      },
      size: 120,
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
    {
      accessorKey: 'dm_behavior_notes',
      header: 'DM: Behavior Notes',
      cell: (info) => {
        const behaviorNotes = info.getValue() as string;
        return behaviorNotes ? <TruncatedText text={behaviorNotes} maxLength={100} /> : '-';
      },
      size: 250,
    },
  ];

  return <GenericCategoryListView campaignId={campaignId} category="creatures" columns={columns} />;
};
