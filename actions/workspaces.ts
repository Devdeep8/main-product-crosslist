'use server';

import { getServerSession } from 'next-auth';
import { Workspace } from '@prisma/client';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
/**
 * A Server Action to fetch all workspaces a user is a member of.
 * This includes workspaces they own and workspaces they've been invited to.
 * @returns {Promise<Workspace[]>} A promise that resolves to an array of Workspace objects.
 */
export async function getWorkspacesForCurrentUser(): Promise<Workspace[]> {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check if the user is authenticated
    if (!session?.user) {
      console.log('No active session found. User is not authenticated.');
      return []; // Return an empty array if not logged in
    }

    // Note: Ensure your NextAuth session callback includes the user's `id`.
    const userId = (session.user as { id: string }).id;
    if (!userId) {
        console.error('User ID not found in session.');
        return [];
    }
    
    // 2. Query the WorkspaceMember table to find all memberships for the user
    const workspaceMemberships = await db.workspaceMember.findMany({
      where: {
        userId: userId,
      },
      // 3. Include the full data for the associated workspace in the query
      include: {
        workspace: true, 
      },
      orderBy: {
        workspace: {
            createdAt: 'asc' // Optional: order the workspaces
        }
      }
    });

    // 4. Map the results to return a clean array of Workspace objects
    const workspaces = workspaceMemberships.map(
      (membership) => membership.workspace
    );

    return workspaces;
  } catch (error) {
    console.error('Failed to fetch workspaces:', error);
    // In case of an unexpected error, return an empty array to prevent app crashes
    return [];
  }
}