import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WhatsappWebService } from './whatsapp-web.service';

describe('WhatsappWebService', () => {
  let service: WhatsappWebService;
  let chatRepo: any;
  let contactRepo: any;
  let messageRepo: any;
  let accountRepo: any;
  let baileysFactory: any;
  let hydrationService: any;

  beforeEach(() => {
    chatRepo = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
    };
    contactRepo = {
      find: jest.fn(),
      save: jest.fn(),
    };
    messageRepo = {
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    accountRepo = {
      findOne: jest.fn(),
    };
    baileysFactory = {
      getClient: jest.fn(),
      repairMediaUrls: jest.fn(),
    };
    hydrationService = {};

    service = new WhatsappWebService(
      chatRepo,
      contactRepo,
      messageRepo,
      accountRepo,
      baileysFactory,
      hydrationService,
    );
  });

  describe('streamMedia', () => {
    it('should throw BadRequestException if accountId is empty or invalid', async () => {
      const res = { setHeader: jest.fn() };
      await expect(service.streamMedia('', 'photo.jpg', res)).rejects.toThrow(BadRequestException);
      await expect(service.streamMedia('???!!!', 'photo.jpg', res)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if media file does not exist', async () => {
      const res = { setHeader: jest.fn() };
      await expect(
        service.streamMedia('acc-1', 'nonexistent_file_12345.jpg', res)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getContacts', () => {
    it('should return contacts for the given account', async () => {
      contactRepo.find.mockResolvedValue([
        { id: '919876543210@s.whatsapp.net', name: 'Alice', phoneNumber: '919876543210' },
      ]);

      const result = await service.getContacts('acc-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
      expect(contactRepo.find).toHaveBeenCalledWith({
        where: { accountId: 'acc-1' },
        order: { name: 'ASC' },
      });
    });
  });

  describe('multi-tier caching', () => {
    it('should hit L2 Redis cache if present', async () => {
      const mockRedis: any = {
        get: jest.fn().mockResolvedValue(JSON.stringify([{ id: 'chat-1', name: 'Cached Chat' }])),
        setex: jest.fn().mockResolvedValue('OK'),
        keys: jest.fn().mockResolvedValue(['wa:cache:chats:acc-1_key']),
        del: jest.fn().mockResolvedValue(1),
      };

      const cachedService = new WhatsappWebService(
        chatRepo,
        contactRepo,
        messageRepo,
        accountRepo,
        baileysFactory,
        hydrationService,
        mockRedis,
      );

      const result = await cachedService.getChats('acc-1');
      expect(result).toEqual([{ id: 'chat-1', name: 'Cached Chat' }]);
      expect(mockRedis.get).toHaveBeenCalled();
    });

    it('should invalidate L1 and L2 cache on account update', async () => {
      const mockRedis: any = {
        keys: jest.fn().mockResolvedValue(['wa:cache:chats:acc-1_1', 'wa:cache:chats:acc-1_2']),
        del: jest.fn().mockResolvedValue(2),
      };

      const cachedService = new WhatsappWebService(
        chatRepo,
        contactRepo,
        messageRepo,
        accountRepo,
        baileysFactory,
        hydrationService,
        mockRedis,
      );

      await cachedService.invalidateChatsCache('acc-1');
      expect(mockRedis.keys).toHaveBeenCalledWith('wa:cache:chats:acc-1*');
      expect(mockRedis.del).toHaveBeenCalledWith('wa:cache:chats:acc-1_1', 'wa:cache:chats:acc-1_2');
    });
  });
});
