import React, { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CategoryName } from '../../contexts/SidebarContext';
import { getCategorySchema, CATEGORY_SCHEMAS } from '../../utils/validationSchemas';
import { TextInput } from '../form/TextInput';
import { TextArea } from '../form/TextArea';
import { Select, SelectOption } from '../form/Select';
import { Checkbox } from '../form/Checkbox';
import { DatePicker } from '../form/DatePicker';
import { TagInput } from '../form/TagInput';
import { RelationshipSelector } from '../form/RelationshipSelector';
import { CustomFieldEditor } from '../form/CustomFieldEditor';
import './GenericEntityForm.css';

export interface GenericEntityFormProps {
  category: CategoryName;
  campaignId: string;
  entity?: any; // Existing entity for edit mode
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

/**
 * Generic create/edit form for any category entity
 * Dynamically renders fields based on category schema with React Hook Form + Zod validation
 *
 * Usage:
 * <GenericEntityForm
 *   category="npcs"
 *   campaignId={campaignId}
 *   entity={existingNpc}
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 */
export const GenericEntityForm: React.FC<GenericEntityFormProps> = ({
  category,
  campaignId,
  entity,
  onSubmit,
  onCancel,
}) => {
  const schema = getCategorySchema(category);
  const isEditMode = Boolean(entity);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: entity || getDefaultValues(category),
  });

  // Reset form when entity changes
  useEffect(() => {
    if (entity) {
      reset(entity);
    }
  }, [entity, reset]);

  const onSubmitHandler = async (data: any) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Render universal fields (present in all categories)
  const renderUniversalFields = () => (
    <>
      {/* Name - Required */}
      <TextInput
        label="Name"
        name="name"
        value={watch('name') || ''}
        onChange={(value) => setValue('name', value)}
        error={errors.name?.message as string}
        required
        placeholder="Enter entity name"
      />

      {/* Description - Optional */}
      <TextArea
        label="Description"
        name="description"
        value={watch('description') || ''}
        onChange={(value) => setValue('description', value)}
        error={errors.description?.message as string}
        rows={4}
        placeholder="Enter description"
      />

      {/* Core Status - Dropdown */}
      <Select
        label="Status"
        name="core_status"
        value={watch('core_status') || 'active'}
        onChange={(value) => setValue('core_status', value)}
        options={coreStatusOptions}
        error={errors.core_status?.message as string}
      />

      {/* Player Knowledge - Dropdown */}
      <Select
        label="Player Knowledge"
        name="player_knowledge"
        value={watch('player_knowledge') || ''}
        onChange={(value) => setValue('player_knowledge', value)}
        options={playerKnowledgeOptions}
        error={errors.player_knowledge?.message as string}
        placeholder="Select information level"
      />

      {/* Tags - Array */}
      <Controller
        name="tags"
        control={control}
        render={({ field }) => (
          <TagInput
            label="Tags"
            name="tags"
            tags={field.value || []}
            onChange={field.onChange}
            error={errors.tags?.message as string}
            maxTags={20}
          />
        )}
      />
    </>
  );

  // Render category-specific fields
  const renderCategoryFields = () => {
    switch (category) {
      case 'npcs':
        return renderNPCFields();
      case 'locations':
        return renderLocationFields();
      case 'factions':
        return renderFactionFields();
      case 'quests':
        return renderQuestFields();
      case 'session_recaps':
        return renderSessionRecapFields();
      case 'session_prep':
        return renderSessionPrepFields();
      case 'player_characters':
        return renderPlayerCharacterFields();
      case 'lore_entries':
        return renderLoreEntryFields();
      case 'world_rules':
        return renderWorldRuleFields();
      case 'planar_forces':
        return renderPlanarForceFields();
      case 'custom_mechanics':
        return renderCustomMechanicFields();
      case 'items':
        return renderItemFields();
      case 'creatures':
        return renderCreatureFields();
      default:
        return null;
    }
  };

  // NPC-specific fields
  const renderNPCFields = () => (
    <>
      <TextInput
        label="Race"
        name="race"
        value={watch('race') || ''}
        onChange={(value) => setValue('race', value)}
        error={errors.race?.message as string}
        placeholder="e.g., Human, Elf, Dwarf"
      />

      <Controller
        name="class"
        control={control}
        render={({ field }) => (
          <TagInput
            label="Class"
            name="class"
            tags={field.value || []}
            onChange={field.onChange}
            error={errors.class?.message as string}
            placeholder="Add classes"
          />
        )}
      />

      <TextInput
        label="Level"
        name="level"
        value={watch('level')?.toString() || ''}
        onChange={(value) => setValue('level', value ? parseInt(value) : null)}
        error={errors.level?.message as string}
        placeholder="Character level"
      />

      <TextInput
        label="Alignment"
        name="alignment"
        value={watch('alignment') || ''}
        onChange={(value) => setValue('alignment', value)}
        error={errors.alignment?.message as string}
        placeholder="e.g., Lawful Good"
      />

      <TextArea
        label="Appearance"
        name="appearance"
        value={watch('appearance') || ''}
        onChange={(value) => setValue('appearance', value)}
        error={errors.appearance?.message as string}
        rows={3}
      />

      <TextArea
        label="Personality Traits"
        name="personality_traits"
        value={watch('personality_traits') || ''}
        onChange={(value) => setValue('personality_traits', value)}
        error={errors.personality_traits?.message as string}
        rows={3}
      />

      <TextArea
        label="Motivation"
        name="motivation"
        value={watch('motivation') || ''}
        onChange={(value) => setValue('motivation', value)}
        error={errors.motivation?.message as string}
        rows={2}
      />

      <TextArea
        label="Relationship to Party"
        name="relationship_to_party"
        value={watch('relationship_to_party') || ''}
        onChange={(value) => setValue('relationship_to_party', value)}
        error={errors.relationship_to_party?.message as string}
        rows={2}
      />

      <Controller
        name="met_party"
        control={control}
        render={({ field }) => (
          <Checkbox
            label="Has Met Party"
            name="met_party"
            checked={field.value === 1}
            onChange={(checked) => field.onChange(checked ? 1 : 0)}
            error={errors.met_party?.message as string}
          />
        )}
      />

      <Controller
        name="faction_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Faction"
            category="factions"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.faction_id?.message as string}
          />
        )}
      />

      <Controller
        name="superior_npc_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Superior NPC"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.superior_npc_id?.message as string}
          />
        )}
      />

      <Controller
        name="locations"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Locations"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.locations?.message as string}
          />
        )}
      />

      <TextArea
        label="DM Secrets"
        name="dm_secrets"
        value={watch('dm_secrets') || ''}
        onChange={(value) => setValue('dm_secrets', value)}
        error={errors.dm_secrets?.message as string}
        rows={3}
        placeholder="Hidden from players"
      />

      <TextArea
        label="DM Plot Relevance"
        name="dm_plot_relevance"
        value={watch('dm_plot_relevance') || ''}
        onChange={(value) => setValue('dm_plot_relevance', value)}
        error={errors.dm_plot_relevance?.message as string}
        rows={2}
        placeholder="Role in campaign plot"
      />
    </>
  );

  // Location-specific fields
  const renderLocationFields = () => (
    <>
      <TextInput
        label="Location Type"
        name="location_type"
        value={watch('location_type') || ''}
        onChange={(value) => setValue('location_type', value)}
        error={errors.location_type?.message as string}
        placeholder="e.g., City, Dungeon, Forest"
      />

      <TextInput
        label="Population"
        name="population"
        value={watch('population')?.toString() || ''}
        onChange={(value) => setValue('population', value ? parseInt(value) : null)}
        error={errors.population?.message as string}
        placeholder="Number of inhabitants"
      />

      <TextArea
        label="Cultural Characteristics"
        name="cultural_characteristics"
        value={watch('cultural_characteristics') || ''}
        onChange={(value) => setValue('cultural_characteristics', value)}
        error={errors.cultural_characteristics?.message as string}
        rows={3}
      />

      <Controller
        name="parent_location_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Parent Location"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.parent_location_id?.message as string}
          />
        )}
      />

      <Controller
        name="notable_npcs"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Notable NPCs"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.notable_npcs?.message as string}
          />
        )}
      />

      <Controller
        name="factions_present"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Factions Present"
            category="factions"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.factions_present?.message as string}
          />
        )}
      />

      <Controller
        name="connected_locations"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Connected Locations"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.connected_locations?.message as string}
          />
        )}
      />

      <TextArea
        label="DM Secrets"
        name="dm_secrets"
        value={watch('dm_secrets') || ''}
        onChange={(value) => setValue('dm_secrets', value)}
        error={errors.dm_secrets?.message as string}
        rows={3}
        placeholder="Hidden from players"
      />
    </>
  );

  // Faction-specific fields
  const renderFactionFields = () => (
    <>
      <TextInput
        label="Faction Type"
        name="faction_type"
        value={watch('faction_type') || ''}
        onChange={(value) => setValue('faction_type', value)}
        error={errors.faction_type?.message as string}
        placeholder="e.g., Guild, Kingdom, Cult"
      />

      <TextInput
        label="Power Level"
        name="power_level"
        value={watch('power_level') || ''}
        onChange={(value) => setValue('power_level', value)}
        error={errors.power_level?.message as string}
        placeholder="e.g., Local, Regional, Global"
      />

      <TextArea
        label="Resources"
        name="resources"
        value={watch('resources') || ''}
        onChange={(value) => setValue('resources', value)}
        error={errors.resources?.message as string}
        rows={2}
      />

      <TextArea
        label="Beliefs"
        name="beliefs"
        value={watch('beliefs') || ''}
        onChange={(value) => setValue('beliefs', value)}
        error={errors.beliefs?.message as string}
        rows={2}
      />

      <TextArea
        label="Goals"
        name="goals"
        value={watch('goals') || ''}
        onChange={(value) => setValue('goals', value)}
        error={errors.goals?.message as string}
        rows={2}
      />

      <TextArea
        label="Methods"
        name="methods"
        value={watch('methods') || ''}
        onChange={(value) => setValue('methods', value)}
        error={errors.methods?.message as string}
        rows={2}
      />

      <Controller
        name="leader_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Leader"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.leader_id?.message as string}
          />
        )}
      />

      <Controller
        name="key_members"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Key Members"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.key_members?.message as string}
          />
        )}
      />

      <Controller
        name="allied_factions"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Allied Factions"
            category="factions"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.allied_factions?.message as string}
          />
        )}
      />

      <Controller
        name="rival_factions"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Rival Factions"
            category="factions"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.rival_factions?.message as string}
          />
        )}
      />

      <Controller
        name="territory"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Territory"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.territory?.message as string}
          />
        )}
      />

      <TextArea
        label="DM True Agenda"
        name="dm_true_agenda"
        value={watch('dm_true_agenda') || ''}
        onChange={(value) => setValue('dm_true_agenda', value)}
        error={errors.dm_true_agenda?.message as string}
        rows={3}
        placeholder="Hidden from players"
      />
    </>
  );

  // Quest-specific fields
  const renderQuestFields = () => (
    <>
      <Select
        label="Status"
        name="status"
        value={watch('status') || 'not_started'}
        onChange={(value) => setValue('status', value)}
        options={questStatusOptions}
        error={errors.status?.message as string}
      />

      <Controller
        name="objectives"
        control={control}
        render={({ field }) => (
          <TagInput
            label="Objectives"
            name="objectives"
            tags={field.value || []}
            onChange={field.onChange}
            error={errors.objectives?.message as string}
            placeholder="Add objective"
          />
        )}
      />

      <TextArea
        label="Rewards"
        name="rewards"
        value={watch('rewards') || ''}
        onChange={(value) => setValue('rewards', value)}
        error={errors.rewards?.message as string}
        rows={2}
      />

      <Controller
        name="quest_giver_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Quest Giver"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.quest_giver_id?.message as string}
          />
        )}
      />

      <Controller
        name="started_session_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Started Session"
            category="session_recaps"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.started_session_id?.message as string}
          />
        )}
      />

      <Controller
        name="completed_session_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Completed Session"
            category="session_recaps"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.completed_session_id?.message as string}
          />
        )}
      />

      <Controller
        name="related_npcs"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Related NPCs"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.related_npcs?.message as string}
          />
        )}
      />

      <Controller
        name="related_locations"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Related Locations"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.related_locations?.message as string}
          />
        )}
      />

      <TextArea
        label="DM True Objective"
        name="dm_true_objective"
        value={watch('dm_true_objective') || ''}
        onChange={(value) => setValue('dm_true_objective', value)}
        error={errors.dm_true_objective?.message as string}
        rows={2}
        placeholder="Hidden from players"
      />

      <TextArea
        label="DM Consequences"
        name="dm_consequences"
        value={watch('dm_consequences') || ''}
        onChange={(value) => setValue('dm_consequences', value)}
        error={errors.dm_consequences?.message as string}
        rows={2}
        placeholder="Hidden from players"
      />
    </>
  );

  // Session Recap-specific fields
  const renderSessionRecapFields = () => (
    <>
      <Controller
        name="session_date"
        control={control}
        render={({ field }) => (
          <DatePicker
            label="Session Date"
            name="session_date"
            value={field.value ? new Date(field.value * 1000).toISOString().split('T')[0] : null}
            onChange={(date) => field.onChange(date ? Math.floor(new Date(date).getTime() / 1000) : null)}
            error={errors.session_date?.message as string}
          />
        )}
      />

      <TextInput
        label="In-Game Date Start"
        name="in_game_date_start"
        value={watch('in_game_date_start') || ''}
        onChange={(value) => setValue('in_game_date_start', value)}
        error={errors.in_game_date_start?.message as string}
        placeholder="e.g., 1st of Mirtul"
      />

      <TextInput
        label="In-Game Date End"
        name="in_game_date_end"
        value={watch('in_game_date_end') || ''}
        onChange={(value) => setValue('in_game_date_end', value)}
        error={errors.in_game_date_end?.message as string}
        placeholder="e.g., 3rd of Mirtul"
      />

      <TextInput
        label="Time Passed"
        name="time_passed"
        value={watch('time_passed') || ''}
        onChange={(value) => setValue('time_passed', value)}
        error={errors.time_passed?.message as string}
        placeholder="e.g., 2 days"
      />

      <TextArea
        label="Summary"
        name="summary"
        value={watch('summary') || ''}
        onChange={(value) => setValue('summary', value)}
        error={errors.summary?.message as string}
        rows={5}
        placeholder="Session summary"
      />

      <Controller
        name="key_events"
        control={control}
        render={({ field }) => (
          <TagInput
            label="Key Events"
            name="key_events"
            tags={field.value || []}
            onChange={field.onChange}
            error={errors.key_events?.message as string}
            placeholder="Add event"
          />
        )}
      />

      <Controller
        name="player_decisions"
        control={control}
        render={({ field }) => (
          <TagInput
            label="Player Decisions"
            name="player_decisions"
            tags={field.value || []}
            onChange={field.onChange}
            error={errors.player_decisions?.message as string}
            placeholder="Add decision"
          />
        )}
      />

      <Controller
        name="npcs_encountered"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="NPCs Encountered"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.npcs_encountered?.message as string}
          />
        )}
      />

      <Controller
        name="locations_visited"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Locations Visited"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.locations_visited?.message as string}
          />
        )}
      />

      <Controller
        name="quests_progressed"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Quests Progressed"
            category="quests"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.quests_progressed?.message as string}
          />
        )}
      />

      <Controller
        name="loot_acquired"
        control={control}
        render={({ field }) => (
          <TagInput
            label="Loot Acquired"
            name="loot_acquired"
            tags={field.value || []}
            onChange={field.onChange}
            error={errors.loot_acquired?.message as string}
            placeholder="Add item"
          />
        )}
      />

      <TextArea
        label="DM Consequences"
        name="dm_consequences"
        value={watch('dm_consequences') || ''}
        onChange={(value) => setValue('dm_consequences', value)}
        error={errors.dm_consequences?.message as string}
        rows={3}
        placeholder="Hidden from players"
      />

      <TextArea
        label="DM Behind Scenes"
        name="dm_behind_scenes"
        value={watch('dm_behind_scenes') || ''}
        onChange={(value) => setValue('dm_behind_scenes', value)}
        error={errors.dm_behind_scenes?.message as string}
        rows={3}
        placeholder="Hidden from players"
      />
    </>
  );

  // Session Prep-specific fields
  const renderSessionPrepFields = () => (
    <>
      <Controller
        name="planned_date"
        control={control}
        render={({ field }) => (
          <DatePicker
            label="Planned Date"
            name="planned_date"
            value={field.value ? new Date(field.value * 1000).toISOString().split('T')[0] : null}
            onChange={(date) => field.onChange(date ? Math.floor(new Date(date).getTime() / 1000) : null)}
            error={errors.planned_date?.message as string}
          />
        )}
      />

      <Select
        label="Status"
        name="status"
        value={watch('status') || 'draft'}
        onChange={(value) => setValue('status', value)}
        options={sessionPrepStatusOptions}
        error={errors.status?.message as string}
      />

      <TextArea
        label="Planned Events"
        name="planned_events"
        value={watch('planned_events') || ''}
        onChange={(value) => setValue('planned_events', value)}
        error={errors.planned_events?.message as string}
        rows={4}
      />

      <TextArea
        label="Possible Encounters"
        name="possible_encounters"
        value={watch('possible_encounters') || ''}
        onChange={(value) => setValue('possible_encounters', value)}
        error={errors.possible_encounters?.message as string}
        rows={3}
      />

      <TextArea
        label="Plot Hooks"
        name="plot_hooks"
        value={watch('plot_hooks') || ''}
        onChange={(value) => setValue('plot_hooks', value)}
        error={errors.plot_hooks?.message as string}
        rows={3}
      />

      <Controller
        name="plot_threads"
        control={control}
        render={({ field }) => (
          <TagInput
            label="Plot Threads"
            name="plot_threads"
            tags={field.value || []}
            onChange={field.onChange}
            error={errors.plot_threads?.message as string}
            placeholder="Add plot thread"
          />
        )}
      />

      <Controller
        name="npcs_to_prep"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="NPCs to Prep"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.npcs_to_prep?.message as string}
          />
        )}
      />

      <Controller
        name="locations_to_prep"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Locations to Prep"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.locations_to_prep?.message as string}
          />
        )}
      />

      <TextArea
        label="DM Notes"
        name="dm_notes"
        value={watch('dm_notes') || ''}
        onChange={(value) => setValue('dm_notes', value)}
        error={errors.dm_notes?.message as string}
        rows={4}
        placeholder="Private notes for DM"
      />
    </>
  );

  // Player Character-specific fields
  const renderPlayerCharacterFields = () => (
    <>
      <TextInput
        label="Player Name"
        name="player_name"
        value={watch('player_name') || ''}
        onChange={(value) => setValue('player_name', value)}
        error={errors.player_name?.message as string}
        placeholder="Real player name"
      />

      <Controller
        name="class"
        control={control}
        render={({ field }) => (
          <TagInput
            label="Class"
            name="class"
            tags={field.value || []}
            onChange={field.onChange}
            error={errors.class?.message as string}
            placeholder="Add classes"
          />
        )}
      />

      <TextInput
        label="Level"
        name="level"
        value={watch('level')?.toString() || ''}
        onChange={(value) => setValue('level', value ? parseInt(value) : null)}
        error={errors.level?.message as string}
        placeholder="Character level"
      />

      <TextInput
        label="Race"
        name="race"
        value={watch('race') || ''}
        onChange={(value) => setValue('race', value)}
        error={errors.race?.message as string}
        placeholder="e.g., Human, Elf, Dwarf"
      />

      <TextInput
        label="Background"
        name="background"
        value={watch('background') || ''}
        onChange={(value) => setValue('background', value)}
        error={errors.background?.message as string}
        placeholder="e.g., Noble, Criminal"
      />

      <TextArea
        label="Personality"
        name="personality"
        value={watch('personality') || ''}
        onChange={(value) => setValue('personality', value)}
        error={errors.personality?.message as string}
        rows={3}
      />

      <TextArea
        label="Goals"
        name="goals"
        value={watch('goals') || ''}
        onChange={(value) => setValue('goals', value)}
        error={errors.goals?.message as string}
        rows={2}
      />

      <TextArea
        label="Backstory"
        name="backstory"
        value={watch('backstory') || ''}
        onChange={(value) => setValue('backstory', value)}
        error={errors.backstory?.message as string}
        rows={4}
      />

      <Controller
        name="faction_affiliations"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Faction Affiliations"
            category="factions"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.faction_affiliations?.message as string}
          />
        )}
      />

      <Controller
        name="allied_npcs"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Allied NPCs"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.allied_npcs?.message as string}
          />
        )}
      />

      <TextArea
        label="DM Secrets"
        name="dm_secrets"
        value={watch('dm_secrets') || ''}
        onChange={(value) => setValue('dm_secrets', value)}
        error={errors.dm_secrets?.message as string}
        rows={2}
        placeholder="Hidden from players"
      />

      <TextArea
        label="DM Plot Threads"
        name="dm_plot_threads"
        value={watch('dm_plot_threads') || ''}
        onChange={(value) => setValue('dm_plot_threads', value)}
        error={errors.dm_plot_threads?.message as string}
        rows={2}
        placeholder="Hidden from players"
      />

      <TextArea
        label="DM True Motivation"
        name="dm_true_motivation"
        value={watch('dm_true_motivation') || ''}
        onChange={(value) => setValue('dm_true_motivation', value)}
        error={errors.dm_true_motivation?.message as string}
        rows={2}
        placeholder="Hidden from players"
      />

      <TextArea
        label="DM Consequences"
        name="dm_consequences"
        value={watch('dm_consequences') || ''}
        onChange={(value) => setValue('dm_consequences', value)}
        error={errors.dm_consequences?.message as string}
        rows={2}
        placeholder="Hidden from players"
      />
    </>
  );

  // Lore Entry-specific fields
  const renderLoreEntryFields = () => (
    <>
      <TextInput
        label="Category"
        name="category"
        value={watch('category') || ''}
        onChange={(value) => setValue('category', value)}
        error={errors.category?.message as string}
        placeholder="e.g., History, Religion, Geography"
      />

      <TextInput
        label="Era/Period"
        name="era_period"
        value={watch('era_period') || ''}
        onChange={(value) => setValue('era_period', value)}
        error={errors.era_period?.message as string}
        placeholder="e.g., Age of Wonders"
      />

      <TextInput
        label="In-Game Date"
        name="in_game_date"
        value={watch('in_game_date') || ''}
        onChange={(value) => setValue('in_game_date', value)}
        error={errors.in_game_date?.message as string}
        placeholder="When this event occurred"
      />

      <TextInput
        label="Historical Accuracy"
        name="historical_accuracy"
        value={watch('historical_accuracy') || ''}
        onChange={(value) => setValue('historical_accuracy', value)}
        error={errors.historical_accuracy?.message as string}
        placeholder="e.g., Verified, Legend, Myth"
      />

      <Controller
        name="related_npcs"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Related NPCs"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.related_npcs?.message as string}
          />
        )}
      />

      <Controller
        name="related_locations"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Related Locations"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.related_locations?.message as string}
          />
        )}
      />

      <Controller
        name="related_factions"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Related Factions"
            category="factions"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.related_factions?.message as string}
          />
        )}
      />
    </>
  );

  // World Rule-specific fields
  const renderWorldRuleFields = () => (
    <>
      <TextInput
        label="Rule Type"
        name="rule_type"
        value={watch('rule_type') || ''}
        onChange={(value) => setValue('rule_type', value)}
        error={errors.rule_type?.message as string}
        placeholder="e.g., Magic, Physics, Social"
      />

      <TextArea
        label="Exceptions"
        name="exceptions"
        value={watch('exceptions') || ''}
        onChange={(value) => setValue('exceptions', value)}
        error={errors.exceptions?.message as string}
        rows={3}
      />

      <Controller
        name="related_rules"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Related Rules"
            category="world_rules"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.related_rules?.message as string}
          />
        )}
      />
    </>
  );

  // Planar Force-specific fields
  const renderPlanarForceFields = () => (
    <>
      <TextInput
        label="Entity Type"
        name="entity_type"
        value={watch('entity_type') || ''}
        onChange={(value) => setValue('entity_type', value)}
        error={errors.entity_type?.message as string}
        placeholder="e.g., God, Demon, Celestial"
      />

      <Controller
        name="domains"
        control={control}
        render={({ field }) => (
          <TagInput
            label="Domains"
            name="domains"
            tags={field.value || []}
            onChange={field.onChange}
            error={errors.domains?.message as string}
            placeholder="Add domain"
          />
        )}
      />

      <TextInput
        label="Alignment"
        name="alignment"
        value={watch('alignment') || ''}
        onChange={(value) => setValue('alignment', value)}
        error={errors.alignment?.message as string}
        placeholder="e.g., Lawful Good"
      />

      <TextInput
        label="Worshiper Base"
        name="worshiper_base"
        value={watch('worshiper_base') || ''}
        onChange={(value) => setValue('worshiper_base', value)}
        error={errors.worshiper_base?.message as string}
        placeholder="Who worships this entity"
      />

      <TextInput
        label="Plane of Origin"
        name="plane_of_origin"
        value={watch('plane_of_origin') || ''}
        onChange={(value) => setValue('plane_of_origin', value)}
        error={errors.plane_of_origin?.message as string}
        placeholder="e.g., Celestia, Abyss"
      />

      <TextInput
        label="Base of Power"
        name="base_of_power"
        value={watch('base_of_power') || ''}
        onChange={(value) => setValue('base_of_power', value)}
        error={errors.base_of_power?.message as string}
        placeholder="Where is their power centered"
      />

      <Controller
        name="high_priest_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="High Priest"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.high_priest_id?.message as string}
          />
        )}
      />

      <Controller
        name="allied_entities"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Allied Entities"
            category="planar_forces"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.allied_entities?.message as string}
          />
        )}
      />

      <Controller
        name="rival_entities"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Rival Entities"
            category="planar_forces"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.rival_entities?.message as string}
          />
        )}
      />

      <Controller
        name="religious_orders"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Religious Orders"
            category="factions"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.religious_orders?.message as string}
          />
        )}
      />

      <TextArea
        label="DM True Nature"
        name="dm_true_nature"
        value={watch('dm_true_nature') || ''}
        onChange={(value) => setValue('dm_true_nature', value)}
        error={errors.dm_true_nature?.message as string}
        rows={3}
        placeholder="Hidden from players"
      />
    </>
  );

  // Custom Mechanic-specific fields
  const renderCustomMechanicFields = () => (
    <>
      <TextInput
        label="Mechanic Type"
        name="mechanic_type"
        value={watch('mechanic_type') || ''}
        onChange={(value) => setValue('mechanic_type', value)}
        error={errors.mechanic_type?.message as string}
        placeholder="e.g., Combat, Skill, Magic"
      />

      <TextArea
        label="Rules Text"
        name="rules_text"
        value={watch('rules_text') || ''}
        onChange={(value) => setValue('rules_text', value)}
        error={errors.rules_text?.message as string}
        rows={5}
        placeholder="Full rules description"
      />

      <TextArea
        label="Prerequisites"
        name="prerequisites"
        value={watch('prerequisites') || ''}
        onChange={(value) => setValue('prerequisites', value)}
        error={errors.prerequisites?.message as string}
        rows={2}
      />

      <TextInput
        label="Source"
        name="source"
        value={watch('source') || ''}
        onChange={(value) => setValue('source', value)}
        error={errors.source?.message as string}
        placeholder="e.g., Homebrew, UA"
      />

      <Controller
        name="related_rules"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Related Rules"
            category="custom_mechanics"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.related_rules?.message as string}
          />
        )}
      />
    </>
  );

  // Item-specific fields
  const renderItemFields = () => (
    <>
      <TextInput
        label="Item Type"
        name="item_type"
        value={watch('item_type') || ''}
        onChange={(value) => setValue('item_type', value)}
        error={errors.item_type?.message as string}
        placeholder="e.g., Weapon, Armor, Consumable"
      />

      <TextInput
        label="Rarity"
        name="rarity"
        value={watch('rarity') || ''}
        onChange={(value) => setValue('rarity', value)}
        error={errors.rarity?.message as string}
        placeholder="e.g., Common, Uncommon, Rare"
      />

      <TextArea
        label="Properties"
        name="properties"
        value={watch('properties') || ''}
        onChange={(value) => setValue('properties', value)}
        error={errors.properties?.message as string}
        rows={3}
        placeholder="Item properties and effects"
      />

      <TextInput
        label="Value"
        name="value"
        value={watch('value') || ''}
        onChange={(value) => setValue('value', value)}
        error={errors.value?.message as string}
        placeholder="e.g., 500 gp"
      />

      <Controller
        name="owner_npc_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Owner (NPC)"
            category="npcs"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.owner_npc_id?.message as string}
          />
        )}
      />

      <Controller
        name="owner_pc_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Owner (PC)"
            category="player_characters"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.owner_pc_id?.message as string}
          />
        )}
      />

      <Controller
        name="location_id"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Location"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value ? [field.value] : []}
            onChange={(ids) => field.onChange(ids[0] || null)}
            error={errors.location_id?.message as string}
          />
        )}
      />

      <TextArea
        label="DM Secret Properties"
        name="dm_secret_properties"
        value={watch('dm_secret_properties') || ''}
        onChange={(value) => setValue('dm_secret_properties', value)}
        error={errors.dm_secret_properties?.message as string}
        rows={2}
        placeholder="Hidden from players"
      />

      <TextArea
        label="DM True Nature"
        name="dm_true_nature"
        value={watch('dm_true_nature') || ''}
        onChange={(value) => setValue('dm_true_nature', value)}
        error={errors.dm_true_nature?.message as string}
        rows={2}
        placeholder="Hidden from players"
      />
    </>
  );

  // Creature-specific fields
  const renderCreatureFields = () => (
    <>
      <TextInput
        label="Creature Type"
        name="creature_type"
        value={watch('creature_type') || ''}
        onChange={(value) => setValue('creature_type', value)}
        error={errors.creature_type?.message as string}
        placeholder="e.g., Beast, Humanoid, Undead"
      />

      <TextInput
        label="Challenge Rating"
        name="challenge_rating"
        value={watch('challenge_rating') || ''}
        onChange={(value) => setValue('challenge_rating', value)}
        error={errors.challenge_rating?.message as string}
        placeholder="e.g., 5"
      />

      <TextArea
        label="Abilities"
        name="abilities"
        value={watch('abilities') || ''}
        onChange={(value) => setValue('abilities', value)}
        error={errors.abilities?.message as string}
        rows={4}
        placeholder="Special abilities and attacks"
      />

      <Controller
        name="habitats"
        control={control}
        render={({ field }) => (
          <RelationshipSelector
            label="Habitats"
            category="locations"
            campaignId={campaignId}
            selectedIds={field.value || []}
            onChange={field.onChange}
            multiple
            error={errors.habitats?.message as string}
          />
        )}
      />

      <TextArea
        label="DM Behavior Notes"
        name="dm_behavior_notes"
        value={watch('dm_behavior_notes') || ''}
        onChange={(value) => setValue('dm_behavior_notes', value)}
        error={errors.dm_behavior_notes?.message as string}
        rows={3}
        placeholder="Hidden from players"
      />
    </>
  );

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="generic-entity-form">
      <div className="generic-entity-form-header">
        <h2 className="generic-entity-form-title">
          {isEditMode ? `Edit ${formatCategoryName(category)}` : `Create ${formatCategoryName(category)}`}
        </h2>
      </div>

      <div className="generic-entity-form-content">
        {/* Universal Fields */}
        <section className="generic-entity-form-section">
          <h3 className="generic-entity-form-section-title">Basic Information</h3>
          {renderUniversalFields()}
        </section>

        {/* Category-Specific Fields */}
        <section className="generic-entity-form-section">
          <h3 className="generic-entity-form-section-title">
            {formatCategoryName(category)} Details
          </h3>
          {renderCategoryFields()}
        </section>

        {/* Custom Fields */}
        <section className="generic-entity-form-section">
          <Controller
            name="custom_fields"
            control={control}
            render={({ field }) => (
              <CustomFieldEditor
                customFields={field.value || {}}
                onChange={field.onChange}
                error={errors.custom_fields?.message as string}
              />
            )}
          />
        </section>
      </div>

      {/* Form Actions */}
      <div className="generic-entity-form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="generic-entity-form-button generic-entity-form-button-cancel"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="generic-entity-form-button generic-entity-form-button-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="generic-entity-form-spinner" />
              Saving...
            </>
          ) : isEditMode ? (
            'Update'
          ) : (
            'Create'
          )}
        </button>
      </div>
    </form>
  );
};

// Helper functions

function getDefaultValues(category: CategoryName): any {
  const baseDefaults = {
    name: '',
    description: '',
    core_status: 'active',
    player_knowledge: '',
    tags: [],
    custom_fields: {},
  };

  // Add category-specific defaults
  switch (category) {
    case 'npcs':
      return { ...baseDefaults, met_party: 0, locations: [], class: [] };
    case 'session_recaps':
      return { ...baseDefaults, is_canon: 1, canonical_status: 'canon', key_events: [], player_decisions: [], npcs_encountered: [], locations_visited: [], quests_progressed: [], loot_acquired: [] };
    case 'session_prep':
      return { ...baseDefaults, is_canon: 0, canonical_status: 'hypothetical', player_knowledge: 'dm_only', status: 'draft', plot_threads: [], npcs_to_prep: [], locations_to_prep: [] };
    case 'quests':
      return { ...baseDefaults, status: 'not_started', objectives: [], related_npcs: [], related_locations: [] };
    default:
      return baseDefaults;
  }
}

function formatCategoryName(category: CategoryName): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Dropdown options
const coreStatusOptions: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'draft', label: 'Draft' },
  { value: 'hidden', label: 'Hidden' },
];

const playerKnowledgeOptions: SelectOption[] = [
  { value: 'public', label: 'Public' },
  { value: 'partial', label: 'Partial' },
  { value: 'dm_only', label: 'DM Only' },
];

const questStatusOptions: SelectOption[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const sessionPrepStatusOptions: SelectOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
