export declare class ContactGroupMemberEntity {
    id: string;
    groupId: string;
    phoneNumber: string;
    name?: string;
    city?: string;
    language?: string;
    customFields: string;
    tags: string;
    optedOut: boolean;
    optedOutAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
