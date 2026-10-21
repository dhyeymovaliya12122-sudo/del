import { BaileysSyncService } from './baileys-sync.service';

describe('BaileysSyncService', () => {
  let service: BaileysSyncService;
  let chatRepo: any;
  let contactRepo: any;
  let messageRepo: any;

  beforeEach(() => {
    chatRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((val) => val),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };
    contactRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    messageRepo = {
      findOne: jest.fn(),
    };
    service = new BaileysSyncService(chatRepo, contactRepo, messageRepo);
  });

  describe('saveChat', () => {
    it('should create new chat if it does not already exist', async () => {
      chatRepo.findOne.mockResolvedValue(null);
      const onUpdated = jest.fn();

      const result = await service.saveChat(
        'acc-1',
        { id: '1234567890@s.whatsapp.net', name: 'John Doe', isGroup: false },
        onUpdated,
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe('1234567890@s.whatsapp.net');
      expect(result?.accountId).toBe('acc-1');
      expect(chatRepo.save).toHaveBeenCalled();
      expect(onUpdated).toHaveBeenCalled();
    });

    it('should update name of existing chat if previous name was generic or phone number', async () => {
      chatRepo.findOne.mockResolvedValue({
        id: '1234567890@s.whatsapp.net',
        accountId: 'acc-1',
        name: '1234567890@s.whatsapp.net',
      });
      const onUpdated = jest.fn();

      const result = await service.saveChat(
        'acc-1',
        { id: '1234567890@s.whatsapp.net', name: 'John Doe' },
        onUpdated,
      );

      expect(result?.name).toBe('John Doe');
      expect(chatRepo.save).toHaveBeenCalled();
      expect(onUpdated).toHaveBeenCalled();
    });
  });
});
