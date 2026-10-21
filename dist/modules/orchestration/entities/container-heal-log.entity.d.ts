import { ContainerInstanceEntity } from './container-instance.entity';
export declare class ContainerHealLogEntity {
    id: string;
    containerInstanceId: string;
    containerInstance: ContainerInstanceEntity;
    accountId: string;
    healReason: string;
    previousState: string;
    actionTaken: string;
    success: boolean;
    errorMessage?: string;
    createdAt: Date;
}
