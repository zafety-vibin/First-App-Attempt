/**
 * MCP Transaction Middleware
 * Wraps tool handlers in database transactions for atomicity
 */

import { db } from '../../services/DatabaseService';

/**
 * Middleware to wrap tool handlers in database transactions
 * Ensures all-or-nothing execution with automatic rollback on error
 */
export function withTransaction<T extends (...args: any[]) => any>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      // Execute the handler within a transaction
      // Better-SQLite3's transaction API automatically handles rollback on error
      const result = await db.transaction(async () => {
        // Set transaction timeout to 10 seconds
        db.pragma('busy_timeout = 10000');

        // Execute the actual handler
        const handlerResult = await handler(...args);

        // Check if handler returned an error
        if (handlerResult?.isError) {
          // Throw to trigger rollback
          throw new Error(handlerResult.content?.[0]?.text || 'Handler returned error');
        }

        return handlerResult;
      })();

      return result;
    } catch (error: any) {
      // Transaction was rolled back
      // Return error response in MCP format
      return {
        isError: true,
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'TRANSACTION_FAILED',
            message: error.message,
            rollback: true
          })
        }]
      };
    }
  }) as T;
}

/**
 * Helper to create a savepoint for nested transactions
 * Useful for complex operations that need partial rollback capability
 */
export function withSavepoint<T extends (...args: any[]) => any>(
  handler: T,
  savepointName: string
): T {
  return (async (...args: Parameters<T>) => {
    const savepoint = `sp_${savepointName}_${Date.now()}`;

    try {
      // Create savepoint
      db.prepare(`SAVEPOINT ${savepoint}`).run();

      // Execute handler
      const result = await handler(...args);

      // Check if handler returned an error
      if (result?.isError) {
        // Rollback to savepoint
        db.prepare(`ROLLBACK TO SAVEPOINT ${savepoint}`).run();
        return result;
      }

      // Release savepoint on success
      db.prepare(`RELEASE SAVEPOINT ${savepoint}`).run();

      return result;
    } catch (error: any) {
      // Rollback to savepoint
      try {
        db.prepare(`ROLLBACK TO SAVEPOINT ${savepoint}`).run();
      } catch {
        // Savepoint might not exist if error occurred before creation
      }

      return {
        isError: true,
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'SAVEPOINT_FAILED',
            message: error.message,
            savepoint: savepointName
          })
        }]
      };
    }
  }) as T;
}