// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as Bookshelf from 'bookshelf';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { RpcRequest } from '../../requests/RpcRequest';
import { Market } from '../../models/Market';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { Commands} from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { MarketService } from '../../services/model/MarketService';
import { ProfileService } from '../../services/model/ProfileService';
import { DefaultMarketService } from '../../services/DefaultMarketService';
import { SettingService } from '../../services/model/SettingService';
import { SettingValue } from '../../enums/SettingValue';
import { CoreRpcService } from '../../services/CoreRpcService';
import { MessageException } from '../../exceptions/MessageException';
import { CommandParamValidationRules, IdValidationRule, ParamValidationRule } from '../CommandParamValidation';


export class MarketDefaultCommand extends BaseCommand implements RpcCommandInterface<Market> {

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.DefaultMarketService) private defaultMarketService: DefaultMarketService,
        @inject(Types.Service) @named(Targets.Service.CoreRpcService) public coreRpcService: CoreRpcService,
        @inject(Types.Service) @named(Targets.Service.model.SettingService) public settingService: SettingService,
        @inject(Types.Service) @named(Targets.Service.model.MarketService) private marketService: MarketService,
        @inject(Types.Service) @named(Targets.Service.model.ProfileService) private profileService: ProfileService
    ) {
        super(Commands.MARKET_DEFAULT);
        this.log = new Logger(__filename);
    }

    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('profileId', true, this.profileService),
                new IdValidationRule('marketId', false, this.marketService)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    /**
     * data.params[]:
     *  [0]: profile: resources.Profile
     *  [1]: market: resources.Market
     *
     * @param data
     * @returns {Promise<Bookshelf.Collection<Market>>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<Market> {
        const profile: resources.Profile = data.params[0];
        const market: resources.Market = data.params[1];

        if (market) {
            // if market was given, then we are setting...
            await this.settingService.createOrUpdateProfileSetting(SettingValue.PROFILE_DEFAULT_MARKETPLACE_ID, market.id + '', profile.id);
        }

        return await this.defaultMarketService.getDefaultForProfile(profile.id);
    }

    /**
     * data.params[]:
     *  [0]: profileId
     *  [1]: marketId, optional
     *
     * Get the default Market for Profile, set the default Market if marketId is given.
     *
     * @param {RpcRequest} data
     * @returns {Promise<RpcRequest>}
     */
    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data); // validates the basic search params, see: BaseSearchCommand.validateSearchParams()

        const profile: resources.Profile = data.params[0];
        const market: resources.Market = data.params[1];

        // Market should also belong to the given Profile
        if (!_.isNil(market) && market.Profile.id !== profile.id) {
            throw new MessageException('Given Market does not belong to the Profile.');
        }

        return data;
    }

    public usage(): string {
        return this.getName() + ' <profileId> [marketId]';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <profileId>              - number, The ID of the Profile. \n'
            + '    <marketId>               - [optional] number, The ID of the Market. \n';
    }

    public description(): string {
        return 'Get or set the default Market for Profile.';
    }

    public example(): string {
        return 'market ' + this.getName() + ' 1 1';
    }
}
