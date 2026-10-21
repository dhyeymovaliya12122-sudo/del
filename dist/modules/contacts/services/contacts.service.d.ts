import { Repository } from 'typeorm';
import { ContactGroupEntity } from '../entities/contact-group.entity';
import { ContactGroupMemberEntity } from '../entities/contact-group-member.entity';
export interface CreateGroupDto {
    accountId: string;
    name: string;
    description?: string;
    tags?: string[];
}
export interface ImportMemberDto {
    phoneNumber: string;
    name?: string;
    city?: string;
    language?: string;
    tags?: string[];
    customFields?: Record<string, string>;
}
export declare class ContactsService {
    private readonly groupRepo;
    private readonly memberRepo;
    private readonly logger;
    constructor(groupRepo: Repository<ContactGroupEntity>, memberRepo: Repository<ContactGroupMemberEntity>);
    findAllGroups(accountId?: string): Promise<ContactGroupEntity[]>;
    findGroup(id: string): Promise<ContactGroupEntity>;
    createGroup(dto: CreateGroupDto): Promise<ContactGroupEntity>;
    deleteGroup(id: string): Promise<{
        success: boolean;
    }>;
    getMembers(groupId: string, search?: string): Promise<ContactGroupMemberEntity[]>;
    importMembers(groupId: string, members: ImportMemberDto[]): Promise<{
        imported: number;
        skipped: number;
    }>;
    removeMember(groupId: string, phoneNumber: string): Promise<{
        success: boolean;
    }>;
}
