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
      accessorKey: 'item_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 120,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'weapon', label: 'Weapon' },
          { value: 'armor', label: 'Armor' },
          { value: 'potion', label: 'Potion' },
          { value: 'scroll', label: 'Scroll' },
          { value: 'wondrous', label: 'Wondrous' },
          { value: 'ring', label: 'Ring' },
          { value: 'rod', label: 'Rod' },
          { value: 'staff', label: 'Staff' },
          { value: 'wand', label: 'Wand' },
          { value: 'consumable', label: 'Consumable' },
          { value: 'treasure', label: 'Treasure' },
        ],
      },
    },
    {
      accessorKey: 'rarity',
      header: 'Rarity',
      cell: (info) => info.getValue() || '-',
      size: 100,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'common', label: 'Common' },
          { value: 'uncommon', label: 'Uncommon' },
          { value: 'rare', label: 'Rare' },
          { value: 'very rare', label: 'Very Rare' },
          { value: 'legendary', label: 'Legendary' },
          { value: 'artifact', label: 'Artifact' },
        ],
      },
    },
    {
      accessorKey: 'value',
      header: 'Value',
      cell: (info) => info.getValue() || '-',
      size: 100,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 100 ? desc.substring(0, 100) + '...' : desc) : '-';
      },
      size: 300,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'properties',
      header: 'Properties',
      cell: (info) => {
        const props = info.getValue() as string;
        return props ? (props.length > 80 ? props.substring(0, 80) + '...' : props) : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
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
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'dm_secret_properties',
      header: 'DM: Secret Properties',
      cell: (info) => {
        const secretProps = info.getValue() as string;
        return secretProps ? <TruncatedText text={secretProps} maxLength={100} /> : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'dm_true_nature',
      header: 'DM: True Nature',
      cell: (info) => {
        const trueNature = info.getValue() as string;
        return trueNature ? <TruncatedText text={trueNature} maxLength={100} /> : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
  ];

  return <GenericCategoryListView campaignId={campaignId} category="items" columns={columns} />;
};
