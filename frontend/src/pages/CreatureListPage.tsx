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
      accessorKey: 'creature_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 150,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'aberration', label: 'Aberration' },
          { value: 'beast', label: 'Beast' },
          { value: 'celestial', label: 'Celestial' },
          { value: 'construct', label: 'Construct' },
          { value: 'dragon', label: 'Dragon' },
          { value: 'elemental', label: 'Elemental' },
          { value: 'fey', label: 'Fey' },
          { value: 'fiend', label: 'Fiend' },
          { value: 'giant', label: 'Giant' },
          { value: 'humanoid', label: 'Humanoid' },
          { value: 'monstrosity', label: 'Monstrosity' },
          { value: 'ooze', label: 'Ooze' },
          { value: 'plant', label: 'Plant' },
          { value: 'undead', label: 'Undead' },
        ],
      },
    },
    {
      accessorKey: 'challenge_rating',
      header: 'CR',
      cell: (info) => info.getValue() || '-',
      size: 80,
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
        return desc ? (desc.length > 120 ? desc.substring(0, 120) + '...' : desc) : '-';
      },
      size: 350,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'abilities',
      header: 'Abilities',
      cell: (info) => {
        const abilities = info.getValue() as string;
        return abilities ? (abilities.length > 80 ? abilities.substring(0, 80) + '...' : abilities) : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'habitats',
      header: 'Habitats',
      cell: (info) => {
        const habitats = info.getValue() as string[];
        return habitats && habitats.length > 0 ? `${habitats.length} locations` : '-';
      },
      size: 120,
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
      size: 150,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'dm_behavior_notes',
      header: 'DM: Behavior Notes',
      cell: (info) => {
        const behaviorNotes = info.getValue() as string;
        return behaviorNotes ? <TruncatedText text={behaviorNotes} maxLength={100} /> : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
  ];

  return <GenericCategoryListView campaignId={campaignId} category="creatures" columns={columns} />;
};
