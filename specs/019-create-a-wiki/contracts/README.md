# Wiki Portal API Contracts

Feature 019 API specifications for wiki card management.

## Files

- **wiki-cards.yaml**: OpenAPI 3.0 spec for wiki CRUD operations

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/campaigns/{campaignId}/wiki/cards` | GET | List all wiki cards (filtered by view mode) |
| `/campaigns/{campaignId}/wiki/cards` | POST | Create new wiki card |
| `/campaigns/{campaignId}/wiki/cards/{cardId}` | GET | Get single card with breadcrumbs |
| `/campaigns/{campaignId}/wiki/cards/{cardId}` | PATCH | Update card content/title/info level |
| `/campaigns/{campaignId}/wiki/cards/{cardId}` | DELETE | Delete card (cascade or orphan children) |
| `/campaigns/{campaignId}/wiki/cards/{cardId}/move` | POST | Move card to new parent |
| `/campaigns/{campaignId}/wiki/cards/reorder` | POST | Reorder siblings |

## Architecture Notes

- **Separation**: Wiki uses separate tables (`wiki_cards`, `wiki_hierarchy`) from database entities
- **AI Exclusion**: AI tools (Features 017/018) query databases only, NOT wiki
- **Reuse Pattern**: Endpoints mirror Feature 003 card architecture but operate on wiki tables

## Testing

Contract tests in `backend/tests/contract/wiki-cards.test.ts` validate:
- Request/response schemas match OpenAPI spec
- Authentication/authorization (Bearer tokens)
- Circular reference prevention on move operations
- Information level filtering (view mode)

## Dependencies

- Feature 003 (Card architecture patterns)
- Feature 004 (Information level filtering)
- Feature 015 (Sidebar navigation for portal access)
