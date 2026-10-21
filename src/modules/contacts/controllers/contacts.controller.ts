import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ContactsService, CreateGroupDto, ImportMemberDto } from '../services/contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('groups')
  findAllGroups(@Query('accountId') accountId?: string) {
    return this.contactsService.findAllGroups(accountId);
  }

  @Get('groups/:id')
  findGroup(@Param('id') id: string) {
    return this.contactsService.findGroup(id);
  }

  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto) {
    return this.contactsService.createGroup(dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) {
    return this.contactsService.deleteGroup(id);
  }

  @Get('groups/:id/members')
  getMembers(@Param('id') id: string, @Query('search') search?: string) {
    return this.contactsService.getMembers(id, search);
  }

  @Post('groups/:id/import')
  importMembers(
    @Param('id') id: string,
    @Body('members') members: ImportMemberDto[],
  ) {
    return this.contactsService.importMembers(id, members);
  }

  @Delete('groups/:id/members/:phone')
  removeMember(@Param('id') id: string, @Param('phone') phone: string) {
    return this.contactsService.removeMember(id, phone);
  }
}
