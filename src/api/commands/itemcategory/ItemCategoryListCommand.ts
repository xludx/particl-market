// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as resources from 'resources';
import { inject, named } from 'inversify';
import { request, validate } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Core, Targets, Types } from '../../../constants';
import { ItemCategoryService } from '../../services/model/ItemCategoryService';
import { RpcRequest } from '../../requests/RpcRequest';
import { ItemCategory } from '../../models/ItemCategory';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { Commands } from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { MarketService } from '../../services/model/MarketService';
import { MarketType } from '../../enums/MarketType';
import { CommandParamValidationRules, IdValidationRule, ParamValidationRule } from '../CommandParamValidation';
import { ModelNotFoundException } from '../../exceptions/ModelNotFoundException';
import {
    CommandParamValidationRules,
    IdValidationRule,
    ParamValidationRule,
    StringValidationRule
} from '../CommandParamValidation';

export class ItemCategoryListCommand extends BaseCommand implements RpcCommandInterface<ItemCategory> {

    public log: LoggerType;

    constructor(
        @inject(Types.Service) @named(Targets.Service.model.ItemCategoryService) private itemCategoryService: ItemCategoryService,
        @inject(Types.Service) @named(Targets.Service.model.MarketService) private marketService: MarketService,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        super(Commands.CATEGORY_LIST);
        this.log = new Logger(__filename);
    }


    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('marketId', false, this.marketService)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    /**
     * params[]:
     *  [0]: market: resources.Market, optional
     *
     */
    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('marketId', false, this.marketService)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<ItemCategory> {
        const market: resources.Market = data.params[0];
        if (market) {
            return await this.itemCategoryService.findRoot(market.receiveAddress);
        } else {
            // category list for MarketType.MARKETPLACE is the list of default categories
            // no market given? return default
            return await this.itemCategoryService.findDefaultRoot();
        }
    }

    /**
     * data.params[]:
     *  [0]: marketId, optional, if market isn't given, return the list of default categories
     *
     * @param data
     * @returns {Promise<ItemCategory>}
     */
    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data);
        return data;
    }

    public usage(): string {
        return this.getName() + ' [marketId]';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <marketId>                    - number - Market ID, optional. ';
    }

    public description(): string {
        return 'List all the ItemCategories.';
    }

    public example(): string {
        return 'category ' + this.getName() + ' 1 ';
    }

}
