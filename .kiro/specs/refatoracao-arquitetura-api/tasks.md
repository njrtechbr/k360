# Implementation Plan

- [x] 1. Setup Infrastructure Foundation





  - Create HTTP client service with retry logic and error handling
  - Implement standardized API response types and error interfaces
  - Create base API hooks (useApiQuery, useApiMutation) for data fetching
  - _Requirements: 1.1, 6.1, 6.2, 6.3_

- [ ] 2. Create Missing API Endpoints

- [ ] 2.1 Implement XP Avulso API endpoints
  - Create `/api/gamification/xp-grants` route with CRUD operations
  - Implement XP grant creation, listing, and deletion endpoints
  - Add validation schemas for XP grant operations
  - _Requirements: 5.3, 5.5_

- [ ] 2.2 Enhance Gamification Season API

  - Create `/api/gamification/seasons/active` endpoint for current season
  - Implement season management endpoints if missing
  - Add season filtering and status management
  - _Requirements: 4.5, 5.4_

- [ ] 2.3 Verify and enhance RH Config APIs

  - Ensure `/api/funcoes` has complete CRUD operations
  - Ensure `/api/setores` has complete CRUD operations  
  - Add bulk operations for funcoes and setores if needed
  - _Requirements: 5.1, 5.2_

- [ ] 3. Migrate Core Services to API Clients

- [ ] 3.1 Refactor UserService to use APIs

  - Convert `userService.ts` to use `/api/users` endpoints
  - Replace Prisma calls with HTTP requests using fetch/axios
  - Maintain existing method signatures for backward compatibility
  - Add proper error handling and response parsing
  - _Requirements: 2.1, 7.2_

- [ ] 3.2 Refactor AttendantService to use APIs

  - Convert `attendantService.ts` to use `/api/attendants` endpoints
  - Replace all Prisma operations with API calls
  - Handle attendant import operations through API
  - Maintain data validation and error handling
  - _Requirements: 2.2, 7.2_

- [ ] 3.3 Refactor EvaluationService to use APIs

  - Convert `evaluationService.ts` to use `/api/evaluations` endpoints
  - Replace Prisma calls with API requests
  - Handle evaluation imports and analysis through APIs
  - Maintain XP calculation logic in API layer
  - _Requirements: 2.3, 7.2_

- [ ] 3.4 Refactor ModuleService to use APIs

  - Convert `moduleService.ts` to use `/api/modules` endpoints
  - Replace direct Prisma access with HTTP requests
  - Maintain module status management functionality
  - Add proper error handling for module operations
  - _Requirements: 2.5, 7.2_

- [ ] 4. Refactor Gamification Services

- [ ] 4.1 Refactor GamificationService to use APIs

  - Convert `gamificationService.ts` to use `/api/gamification` endpoints
  - Replace Prisma calls with API requests for XP events, achievements
  - Maintain season management through API calls
  - Handle achievement processing through API layer
  - _Requirements: 2.4, 7.2_

- [ ] 4.2 Refactor XpAvulsoService to use APIs

  - Convert `xpAvulsoService.ts` to use `/api/gamification/xp-grants`
  - Replace direct Prisma access with API calls
  - Maintain XP grant validation and processing logic
  - Handle XP configuration through API endpoints
  - _Requirements: 2.7, 7.2_

- [ ] 4.3 Refactor RhService to use APIs

  - Convert `rhService.ts` to use `/api/funcoes` and `/api/setores`
  - Replace Prisma operations with HTTP requests
  - Maintain CRUD operations for funcoes and setores
  - Add proper validation and error handling
  - _Requirements: 2.6, 7.2_

- [ ] 5. Create API-based Hooks
- [ ] 5.1 Refactor useUsersData hook
  - Convert to use API endpoints instead of PrismaProvider
  - Implement proper loading states and error handling
  - Use new useApiQuery hook for data fetching
  - Maintain existing hook interface for compatibility
  - _Requirements: 4.1, 3.1_

- [ ] 5.2 Refactor useEvaluationsData hook
  - Convert to use `/api/evaluations` endpoints
  - Replace PrismaProvider dependency with API calls
  - Handle evaluation analysis and import operations
  - Implement proper caching and refetch logic
  - _Requirements: 4.2, 3.1_

- [ ] 5.3 Refactor useModulesData hook
  - Convert to use `/api/modules` endpoints
  - Replace direct provider access with API calls
  - Maintain module management functionality
  - Add proper error states and retry logic
  - _Requirements: 4.3, 3.1_

- [ ] 5.4 Refactor useRhConfigData hook
  - Convert to use `/api/funcoes` and `/api/setores` endpoints
  - Replace PrismaProvider calls with API requests
  - Handle funcoes and setores CRUD operations
  - Implement proper data synchronization
  - _Requirements: 4.4, 3.1_

- [ ] 5.5 Refactor useActiveSeason hook
  - Convert to use `/api/gamification/seasons/active` endpoint
  - Replace direct gamification provider access
  - Handle season status and filtering logic
  - Add proper caching for season data
  - _Requirements: 4.5, 3.1_

- [ ] 6. Refactor PrismaProvider to ApiProvider
- [ ] 6.1 Create new ApiProvider structure
  - Create `src/providers/ApiProvider.tsx` using API hooks
  - Implement context with API-based data fetching
  - Maintain existing interface for backward compatibility
  - Use new HTTP client and error handling infrastructure
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6.2 Migrate data fetching to API calls
  - Replace all Prisma operations with API requests
  - Implement proper loading states using API hooks
  - Handle error states and retry logic consistently
  - Maintain data validation and fallback values
  - _Requirements: 3.1, 3.2, 6.4_

- [ ] 6.3 Implement mutation operations through APIs
  - Convert create/update/delete operations to use API endpoints
  - Replace direct Prisma mutations with HTTP requests
  - Maintain optimistic updates and error rollback
  - Handle batch operations and transactions properly
  - _Requirements: 3.2, 3.3, 6.5_

- [ ] 7. Update Components to Use New Architecture
- [ ] 7.1 Update user management components
  - Modify components in `/src/app/dashboard/usuarios/` to use new hooks
  - Replace PrismaProvider usage with ApiProvider
  - Update error handling to use new error system
  - Test user CRUD operations end-to-end
  - _Requirements: 3.3, 6.1, 6.2_

- [ ] 7.2 Update attendant management components
  - Modify components in `/src/app/dashboard/rh/atendentes/` 
  - Replace direct provider calls with API-based hooks
  - Update import functionality to use API endpoints
  - Test attendant management operations
  - _Requirements: 3.3, 6.1, 6.2_

- [ ] 7.3 Update evaluation components
  - Modify evaluation import and management components
  - Replace PrismaProvider calls with API-based operations
  - Update evaluation analysis to use API endpoints
  - Test evaluation CRUD and import operations
  - _Requirements: 3.3, 6.1, 6.2_

- [ ] 7.4 Update gamification components
  - Modify gamification pages to use API-based hooks
  - Replace direct provider access with API calls
  - Update XP management and achievement components
  - Test gamification features end-to-end
  - _Requirements: 3.3, 6.1, 6.2_

- [ ] 8. Remove Direct Prisma Dependencies
- [ ] 8.1 Remove Prisma imports from services
  - Remove `import { PrismaClient }` from all service files
  - Remove `const prisma = new PrismaClient()` instances
  - Update service exports to use API client pattern
  - Verify no direct Prisma usage remains in services
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 8.2 Remove Prisma imports from components
  - Remove any remaining Prisma imports from React components
  - Remove PrismaProvider usage from component files
  - Update imports to use new ApiProvider
  - Verify no client-side Prisma usage remains
  - _Requirements: 7.1, 7.4_

- [ ] 8.3 Clean up provider files
  - Remove old PrismaProvider file after migration
  - Update provider exports in index files
  - Remove unused Prisma-related utilities
  - Update application layout to use ApiProvider
  - _Requirements: 7.4, 8.4_

- [ ] 9. Testing and Validation
- [ ] 9.1 Create API client tests
  - Write unit tests for HTTP client service
  - Test API hooks with mocked responses
  - Create integration tests for API endpoints
  - Test error handling and retry logic
  - _Requirements: 6.1, 6.2, 8.5_

- [ ] 9.2 Test refactored services
  - Write tests for converted service classes
  - Mock API responses in service tests
  - Test error scenarios and edge cases
  - Verify backward compatibility of service interfaces
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 9.3 Test component integration
  - Create integration tests for updated components
  - Test complete user workflows end-to-end
  - Verify data flow from components to APIs
  - Test error handling in UI components
  - _Requirements: 8.3, 8.4, 8.5_

- [ ] 9.4 Performance and load testing
  - Test API response times and caching
  - Verify proper loading states in components
  - Test concurrent request handling
  - Validate memory usage and performance
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 10. Documentation and Cleanup
- [ ] 10.1 Update code documentation
  - Document new API client patterns and usage
  - Update service documentation with API examples
  - Create migration guide for future developers
  - Document error handling patterns and best practices
  - _Requirements: 8.4, 8.5_

- [ ] 10.2 Final validation and cleanup
  - Run full test suite to ensure no regressions
  - Verify all Prisma usage is contained to API routes only
  - Clean up unused imports and dead code
  - Update package dependencies if needed
  - _Requirements: 7.4, 8.1, 8.2, 8.5_