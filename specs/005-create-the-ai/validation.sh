#!/bin/bash
# Feature 005 Validation Script
# Task: T079
# Purpose: Verify all components of Feature 005 are properly implemented

echo "=========================================="
echo "Feature 005 Implementation Validation"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track overall status
ALL_PASS=true

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 - Missing: $1"
        ALL_PASS=false
        return 1
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 - Missing: $1"
        ALL_PASS=false
        return 1
    fi
}

echo "1. Database Migrations"
echo "----------------------"
check_file "backend/src/db/migrations/005-add-import-tables.sql" "Import tables migration"
check_file "backend/src/db/migrations/005-add-planning-table.sql" "Planning table migration"
check_file "backend/src/db/migrations/005-add-knowledge-graphs.sql" "Knowledge graph tables migration"
check_file "backend/src/db/migrations/005-extend-cards-import.sql" "Cards table extension"
echo ""

echo "2. Shared Types"
echo "---------------"
check_file "shared/types/ImportSession.ts" "ImportSession type"
check_file "shared/types/PlanningSession.ts" "PlanningSession type"
check_file "shared/types/KnowledgeGraph.ts" "KnowledgeGraph types"
echo ""

echo "3. Backend Models"
echo "-----------------"
check_file "backend/src/models/ImportSession.ts" "ImportSession model"
check_file "backend/src/models/ImportBatch.ts" "ImportBatch model"
check_file "backend/src/models/PlanningSession.ts" "PlanningSession model"
check_file "backend/src/models/KnowledgeGraph.ts" "KnowledgeGraph model"
check_file "backend/src/models/GraphNode.ts" "GraphNode model"
check_file "backend/src/models/GraphEdge.ts" "GraphEdge model"
echo ""

echo "4. Backend Services"
echo "-------------------"
check_file "backend/src/services/FunctionCallingService.ts" "Function calling service"
check_file "backend/src/services/LLMOrchestrationService.ts" "LLM orchestration service"
check_file "backend/src/services/ToolRegistryService.ts" "Tool registry service"
check_file "backend/src/services/FileParseService.ts" "File parse service"
check_file "backend/src/services/ImportAIService.ts" "Import AI service"
check_file "backend/src/services/ImportBatchService.ts" "Import batch service"
check_file "backend/src/services/PlanningAIService.ts" "Planning AI service"
echo ""

echo "5. Backend Routes"
echo "-----------------"
check_file "backend/src/routes/import.ts" "Import routes"
check_file "backend/src/routes/planning.ts" "Planning routes"
check_file "backend/src/routes/knowledge-graphs.ts" "Knowledge graph routes"
echo ""

echo "6. Backend Tests"
echo "----------------"
check_file "backend/tests/contract/import.contract.test.ts" "Import contract tests"
check_file "backend/tests/contract/planning.contract.test.ts" "Planning contract tests"
check_file "backend/tests/contract/knowledge-graphs.contract.test.ts" "Graph contract tests"
check_file "backend/tests/unit/function-calling.test.ts" "Function calling unit tests"
check_file "backend/tests/unit/entity-extraction.test.ts" "Entity extraction unit tests"
check_file "backend/tests/unit/graph-updates.test.ts" "Graph updates unit tests"
check_file "backend/tests/integration/import-workflow.test.ts" "Import workflow integration tests"
check_file "backend/tests/integration/planning-workflow.test.ts" "Planning workflow integration tests"
echo ""

echo "7. Frontend Components"
echo "----------------------"
check_file "frontend/src/components/ImportTab.tsx" "Import tab component"
check_file "frontend/src/components/ImportChatMessage.tsx" "Import chat message component"
check_file "frontend/src/components/ApprovalSummary.tsx" "Approval summary component"
check_file "frontend/src/components/RevertButton.tsx" "Revert button component"
check_file "frontend/src/components/PlanningTab.tsx" "Planning tab component"
check_file "frontend/src/components/PlanningChatMessage.tsx" "Planning chat message component"
check_file "frontend/src/components/GraphViewer.tsx" "Graph viewer component"
check_file "frontend/src/components/GraphExplorer.tsx" "Graph explorer component"
check_file "frontend/src/components/GraphNodeEditor.tsx" "Graph node editor component"
echo ""

echo "8. Frontend Services"
echo "--------------------"
check_file "frontend/src/services/importService.ts" "Import service"
check_file "frontend/src/services/planningService.ts" "Planning service"
check_file "frontend/src/services/graphService.ts" "Graph service"
echo ""

echo "9. Frontend Hooks"
echo "-----------------"
check_file "frontend/src/hooks/useImportSession.ts" "useImportSession hook"
check_file "frontend/src/hooks/usePlanningSession.ts" "usePlanningSession hook"
echo ""

echo "10. Frontend Context"
echo "--------------------"
check_file "frontend/src/contexts/AITabContext.tsx" "AI tab context"
echo ""

echo "11. Frontend Tests"
echo "------------------"
check_file "frontend/src/components/__tests__/ImportTab.test.tsx" "Import tab tests"
check_file "frontend/src/components/__tests__/PlanningTab.test.tsx" "Planning tab tests"
check_file "frontend/src/components/__tests__/GraphExplorer.test.tsx" "Graph explorer tests"
check_file "frontend/tests/e2e/import-workflow.spec.ts" "Import workflow E2E tests"
check_file "frontend/tests/e2e/planning-workflow.spec.ts" "Planning workflow E2E tests"
check_file "frontend/tests/e2e/knowledge-graphs.spec.ts" "Knowledge graphs E2E tests"
echo ""

echo "12. API Contracts"
echo "-----------------"
check_file "specs/005-create-the-ai/contracts/import.yaml" "Import API contract"
check_file "specs/005-create-the-ai/contracts/planning.yaml" "Planning API contract"
check_file "specs/005-create-the-ai/contracts/knowledge-graphs.yaml" "Graph API contract"
echo ""

echo "13. Documentation"
echo "-----------------"
check_file "specs/005-create-the-ai/quickstart.md" "Quickstart guide"
check_file "specs/005-create-the-ai/tasks.md" "Tasks documentation"
echo ""

echo "=========================================="
if [ "$ALL_PASS" = true ]; then
    echo -e "${GREEN}✓ All Feature 005 components validated successfully!${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Run backend tests: cd backend && npm test"
    echo "2. Run frontend tests: cd frontend && npm test"
    echo "3. Run E2E tests: cd frontend && npm run test:e2e"
    echo "4. Start the application: docker-compose up --build"
    exit 0
else
    echo -e "${RED}✗ Some components are missing. Review the output above.${NC}"
    echo ""
    echo "Missing components may be in progress or need implementation."
    exit 1
fi