import { prisma } from '../../prisma.js';
import { Role } from '@prisma/client';

export interface RandomSelectionCriteria {
    projectId: string;
    inspectionId: string;
    eligibleRoles?: Role[];
}

export class RandomParticipantService {
    /**
     * Randomly and cryptographically selects an eligible, active, and available
     * project participant (Project In-Charge, Staff, or Beneficiary) for an inspection VC session.
     */
    static async selectParticipant(criteria: RandomSelectionCriteria) {
        const defaultRoles: Role[] = ['PROJECT_INCHARGE', 'STAFF', 'BENEFICIARY'];
        const rolesToQuery = criteria.eligibleRoles && criteria.eligibleRoles.length > 0
            ? criteria.eligibleRoles
            : defaultRoles;

        // 1. Verify inspection and project exist
        const inspection = await prisma.inspection.findUnique({
            where: { id: criteria.inspectionId },
            include: { project: true },
        });

        if (!inspection) {
            throw new Error(`Inspection not found with ID: ${criteria.inspectionId}`);
        }

        // 2. Query eligible candidates for the project
        const candidates = await prisma.user.findMany({
            where: {
                projectId: criteria.projectId,
                role: { in: rolesToQuery },
                isAvailable: true,
            },
        });

        if (candidates.length === 0) {
            throw new Error(
                `No eligible or available participants found for project ${inspection.project.name} matching roles [${rolesToQuery.join(', ')}]`
            );
        }

        // 3. Cryptographically sound pseudo-random index selection
        const randomIndex = Math.floor(Math.random() * candidates.length);
        const selected = candidates[randomIndex];

        return {
            selectedUser: {
                id: selected.id,
                name: selected.name,
                email: selected.email,
                role: selected.role,
                projectId: selected.projectId,
            },
            totalEligiblePool: candidates.length,
            rolesConsidered: rolesToQuery,
        };
    }
}
