import { JwtService } from '@nestjs/jwt';
import { SchedulerService } from '../services/scheduler.service';
import { ScheduleRepeat } from '../entities/scheduled-message.entity';
export declare class SchedulerController {
    private readonly schedulerService;
    private readonly jwtService;
    constructor(schedulerService: SchedulerService, jwtService: JwtService);
    private getUser;
    getScheduledRoot(auth: string, accountId: string): Promise<import("../entities/scheduled-message.entity").ScheduledMessageEntity[]>;
    getScheduled(auth: string, accountId: string): Promise<import("../entities/scheduled-message.entity").ScheduledMessageEntity[]>;
    scheduleMessageRoot(auth: string, body: {
        accountId: string;
        toJid: string;
        messageText: string;
        scheduledAt: string;
        repeatType?: ScheduleRepeat;
        caption?: string;
    }): Promise<{
        id: string;
        accountId: string;
        toJid: string;
        messageText: string;
        scheduledAt: Date;
        repeatType: ScheduleRepeat;
        caption: string;
        status: "pending";
    } & import("../entities/scheduled-message.entity").ScheduledMessageEntity>;
    scheduleMessage(auth: string, body: {
        accountId: string;
        toJid: string;
        messageText: string;
        scheduledAt: string;
        repeatType?: ScheduleRepeat;
        caption?: string;
    }): Promise<{
        id: string;
        accountId: string;
        toJid: string;
        messageText: string;
        scheduledAt: Date;
        repeatType: ScheduleRepeat;
        caption: string;
        status: "pending";
    } & import("../entities/scheduled-message.entity").ScheduledMessageEntity>;
    cancel(auth: string, id: string, accountId: string): Promise<{
        success: boolean;
    }>;
    delete(auth: string, id: string, accountId: string): Promise<{
        success: boolean;
    }>;
}
