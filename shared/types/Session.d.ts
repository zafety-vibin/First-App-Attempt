/**
 * Session entity - Tracks active authentication sessions
 */
export interface Session {
    sessionId: string;
    userId: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
    createdAt: Date;
}
/**
 * Database row representation (before transformation)
 */
export interface SessionRow {
    session_id: string;
    user_id: string;
    access_token: string;
    refresh_token: string | null;
    expires_at: number;
    created_at: number;
}
//# sourceMappingURL=Session.d.ts.map