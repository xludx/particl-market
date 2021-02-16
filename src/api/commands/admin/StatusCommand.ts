// Copyright (c) 2017-2021, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { RpcRequest } from '../../requests/RpcRequest';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { Commands} from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { CommandParamValidationRules, ParamValidationRule } from '../CommandParamValidation';
import { ObserverStatus } from '../../enums/ObserverStatus';
import { CoreConnectionStatusService } from '../../services/observer/CoreConnectionStatusService';
import { CoreCookieService } from '../../services/observer/CoreCookieService';
import { ExpiredListingItemService } from '../../services/observer/ExpiredListingItemService';
import { ExpiredMarketService } from '../../services/observer/ExpiredMarketService';
import { ExpiredProposalService } from '../../services/observer/ExpiredProposalService';
import { ProposalResultRecalcService } from '../../services/observer/ProposalResultRecalcService';
import { WaitingMessageService } from '../../services/observer/WaitingMessageService';


interface ServiceStatus {
    coreConnectionStatusService: ObserverStatus;
    coreCookieService: ObserverStatus;
    expiredListingItemService: ObserverStatus;
    expiredMarketService: ObserverStatus;
    expiredProposalService: ObserverStatus;
    proposalResultRecalcService: ObserverStatus;
    waitingMessageService: ObserverStatus;
}

export class StatusCommand extends BaseCommand implements RpcCommandInterface<ServiceStatus> {

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.observer.CoreConnectionStatusService) public coreConnectionStatusService: CoreConnectionStatusService,
        @inject(Types.Service) @named(Targets.Service.observer.CoreCookieService) public coreCookieService: CoreCookieService,
        @inject(Types.Service) @named(Targets.Service.observer.ExpiredListingItemService) public expiredListingItemService: ExpiredListingItemService,
        @inject(Types.Service) @named(Targets.Service.observer.ExpiredMarketService) public expiredMarketService: ExpiredMarketService,
        @inject(Types.Service) @named(Targets.Service.observer.ExpiredProposalService) public expiredProposalService: ExpiredProposalService,
        @inject(Types.Service) @named(Targets.Service.observer.ProposalResultRecalcService) public proposalResultRecalcService: ProposalResultRecalcService,
        @inject(Types.Service) @named(Targets.Service.observer.WaitingMessageService) public waitingMessageService: WaitingMessageService
    ) {
        super(Commands.ADMIN_STATUS);
        this.log = new Logger(__filename);
    }

    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<ServiceStatus> {
        return {
            coreConnectionStatusService: this.coreConnectionStatusService.status,
            coreCookieService: this.coreCookieService.status,
            expiredListingItemService: this.expiredListingItemService.status,
            expiredMarketService: this.expiredMarketService.status,
            expiredProposalService: this.expiredProposalService.status,
            proposalResultRecalcService: this.proposalResultRecalcService.status,
            waitingMessageService: this.waitingMessageService.status
        } as ServiceStatus;
    }

    public async validate(data: RpcRequest): Promise<RpcRequest> {
        // await super.validate(data);
        return data;
    }

    public usage(): string {
        return this.getName() + '';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n';
    }

    public description(): string {
        return '';
    }

    public example(): string {
        return 'admin ' + this.getName();
    }
}
