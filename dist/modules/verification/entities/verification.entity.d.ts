export type VerificationStatus = 'not_started' | 'applied' | 'pending' | 'verified' | 'rejected';
export declare class VerificationEntity {
    id: string;
    accountId: string;
    status: VerificationStatus;
    businessName?: string;
    businessId?: string;
    greenTick: boolean;
    phoneVerified: boolean;
    docsSubmitted: boolean;
    metaBusinessManagerLinked: boolean;
    verifiedAt?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
