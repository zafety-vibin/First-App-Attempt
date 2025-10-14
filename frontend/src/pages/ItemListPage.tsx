import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { TruncatedText } from '../components/common/TruncatedText';

export const ItemListPage: React.FC = () => {
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
      accessorKey: 'item_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 120,
    },
    {
      accessorKey: 'rarity',
      header: 'Rarity',
      cell: (info) => info.getValue() || '-',
      size: 100,
    },
    {
      accessorKey: 'value',
      header: 'Value',
      cell: (info) => info.getValue() || '-',
      size: 100,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 100 ? desc.substring(0, 100) + '...' : desc) : '-';
      },
      size: 300,
    },
    {
      accessorKey: 'properties',
      header: 'Properties',
      cell: (info) => {
        const props = info.getValue() as string;
        return props ? (props.length > 80 ? props.substring(0, 80) + '...' : props) : '-';
      },
      size: 250,
    },
    {
      accessorKey: 'owner_npc_id',
      header: 'NPC Owner',
      cell: (info) => {
        const value = info.getValue();
        return value ? 'NPC' : '-';
      },
      size: 100,
    },
    {
      accessorKey: 'owner_pc_id',
      header: 'PC Owner',
      cell: (info) => {
        const value = info.getValue();
        return value ? 'PC' : '-';
      },
      size: 100,
    },
    {
      accessorKey: 'location_id',
      header: 'Location',
      cell: (info) => {
        const value = info.getValue();
        return value ? 'Yes' : '-';
      },
      size: 100,
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
      accessorKey: 'dm_secret_properties',
      header: 'DM: Secret Properties',
      cell: (info) => {
        const secretProps = info.getValue() as string;
        return secretProps ? <TruncatedText text={secretProps} maxLength={100} /> : '-';
      },
      size: 250,
    },
    {
      accessorKey: 'dm_true_nature',
      header: 'DM: True Nature',
      cell: (info) => {
        const trueNature = info.getValue() as string;
        return trueNature ? <TruncatedText text={trueNature} maxLength={100} /> : '-';
      },
      size: 250,
    },
  ];

  return <GenericCategoryListView campaignId={campaignId} category="items" columns={columns} />;
};
