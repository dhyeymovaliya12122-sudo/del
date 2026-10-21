import { ContactsService, CreateGroupDto, ImportMemberDto } from '../services/contacts.service';
export declare class ContactsController {
    private readonly contactsService;
    constructor(contactsService: ContactsService);
    findAllGroups(accountId?: string): Promise<import("../entities/contact-group.entity").ContactGroupEntity[]>;
    findGroup(id: string): Promise<import("../entities/contact-group.entity").ContactGroupEntity>;
    createGroup(dto: CreateGroupDto): Promise<import("../entities/contact-group.entity").ContactGroupEntity>;
    deleteGroup(id: string): Promise<{
        success: boolean;
    }>;
    getMembers(id: string, search?: string): Promise<import("../entities/contact-group-member.entity").ContactGroupMemberEntity[]>;
    importMembers(id: string, members: ImportMemberDto[]): Promise<{
        imported: number;
        skipped: number;
    }>;
    removeMember(id: string, phone: string): Promise<{
        success: boolean;
    }>;
}
