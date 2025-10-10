# MCP Tool Inventory - For Review

This document lists all 29 MCP tools for review. Update the descriptions here, then I'll implement the changes.

## Card Operations (6 tools)

### 1. read_card
**Current Description:** Read a campaign card by ID, including content, metadata, and hierarchy position

**When to use:**
**Common mistakes:**
**Example workflow:**

---

### 2. create_card
**Current Description:** [See full description in card-tools.ts lines 38-84]

**Review notes:**

---

### 3. update_card
**Current Description:** [See full description in card-tools.ts lines 99-116]

**Review notes:**

---

### 4. delete_card
**Current Description:** Delete a card and its entire subtree from the campaign

**Review notes:**

---

### 5. search_cards
**Current Description:** Search for cards by title or content text within a campaign

**Review notes:**

---

### 6. move_card
**Current Description:** Move a card to a new parent and recalculate hierarchy paths

**Review notes:**

---

## Hierarchy Navigation (5 tools)

### 7. get_card_path
**Current Description:** Get the hierarchical path from root to a specific card

**Review notes:**

---

### 8. get_subtree
**Current Description:** Get a card and all its descendants up to a specified depth

**Review notes:**

---

### 9. list_children
**Current Description:** [See full description in hierarchy-tools.ts lines 47-58]

**Review notes:**

---

### 10. get_siblings
**Current Description:** Get all sibling cards (cards with the same parent) of a specific card

**Review notes:**

---

### 11. get_ancestor
**Current Description:** Get the nearest ancestor of a specific type

**Review notes:**

---

## Knowledge Graph Operations (4 tools)

### 12. query_knowledge_graph
### 13. list_graph_nodes
### 14. get_node_relationships
### 15. update_graph_atomically

---

## Session Recap Queries (2 tools)

### 16. get_session_recaps
### 17. get_timeline_events

---

## Information Level Discovery (2 tools)

### 18. list_information_levels
### 19. get_information_level_by_name

---

## Database Card Operations (3 tools)

### 20. query_database_entries
### 21. create_database_entry
### 22. update_database_entry

---

## Map Card Operations (2 tools)

### 23. list_map_pins
### 24. create_map_pin

---

## Prompts (2 templates)

### 25. import_workflow
### 26. planning_workflow
### 27. campaign_structure_examples (NEW)

---

## Resources (3 browsable)

### 28. campaign://cards
### 29. campaign://recaps
### 30. campaign://graphs

---

## Review Process

1. Read through each tool description
2. Ask yourself: "If I were the AI, would this be clear?"
3. Add examples, clarifications, or rewrite as needed
4. Mark tools that need technical changes (validation, schema fixes)
5. When done, tell Claude which ones to update

