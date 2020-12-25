// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as resources from 'resources';
import * as _ from 'lodash';
import { Logger as LoggerType } from '../../../core/Logger';
import { inject, named } from 'inversify';
import { request, validate } from '../../../core/api/Validate';
import { Core, Targets, Types } from '../../../constants';
import { ItemCategoryService } from '../../services/model/ItemCategoryService';
import { ListingItemService } from '../../services/model/ListingItemService';
import { RpcRequest } from '../../requests/RpcRequest';
import { ItemCategoryUpdateRequest } from '../../requests/model/ItemCategoryUpdateRequest';
import { ItemCategory } from '../../models/ItemCategory';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { Commands } from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { MessageException } from '../../exceptions/MessageException';
import { MarketService } from '../../services/model/MarketService';
import { MarketType } from '../../enums/MarketType';
import { hash } from 'omp-lib/dist/hasher/hash';
import { ItemCategoryFactory } from '../../factories/model/ItemCategoryFactory';
import {
    CommandParamValidationRules,
    IdValidationRule,
    ParamValidationRule,
    StringValidationRule
} from '../CommandParamValidation';

export class ItemCategoryUpdateCommand extends BaseCommand implements RpcCommandInterface<ItemCategory> {

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Factory) @named(Targets.Factory.model.ItemCategoryFactory) private itemCategoryFactory: ItemCategoryFactory,
        @inject(Types.Service) @named(Targets.Service.model.ItemCategoryService) private itemCategoryService: ItemCategoryService,
        @inject(Types.Service) @named(Targets.Service.model.MarketService) private marketService: MarketService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemService) private listingItemService: ListingItemService
    ) {
        super(Commands.CATEGORY_UPDATE);
        this.log = new Logger(__filename);
    }

    /**
     * params[]:
     *  [0]: categoryId
     *  [1]: categoryName
     *  [2]: description
     *  [3]: parentCategoryId, default: root
     */
    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('categoryId', true, this.itemCategoryService),
                new StringValidationRule('categoryName', true),
                new StringValidationRule('description', true),
                new IdValidationRule('parentItemCategoryId', false, this.itemCategoryService)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<ItemCategory> {

        const category: resources.ItemCategory = data.params[0];
        const name = data.params[1];
        const description = data.params[2];
        const parentItemCategory: resources.ItemCategory = data.params[3];

        let path: string[] = this.itemCategoryFactory.getArray(parentItemCategory);
        path = [...path, name];

        return await this.itemCategoryService.update(category.id, {
            name,
            description,
            key: hash(path.toString()),
            market: category.market,
            parent_item_category_id: parentItemCategory.id
        } as ItemCategoryUpdateRequest);

    }

    /**
     *  [0]: categoryId
     *  [1]: categoryName
     *  [2]: description
     *  [3]: parentCategoryId, default: root
     *
     * @param {RpcRequest} data
     * @returns {Promise<void>}
     */
    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data);

        const itemCategory: resources.ItemCategory = data.params[0];                // required
        const categoryName = data.params[1];                                        // required
        const description = data.params[2];                                         // required
        const parentItemCategory: resources.ItemCategory = data.params[3];

        if (!parentItemCategory) {
            // if parent wasnt given, use the root
            data.params[3] = await this.itemCategoryService.findRoot(itemCategory.market).then(value => value.toJSON());
        }

        // default categories cannot be edited
        if (!itemCategory.market) {
            throw new MessageException('Default ItemCategories cannot be modified.');
        }

        // custom categories can only be modified if market.type = MarketType.STOREFRONT_ADMIN
        // todo: fix when auth is added
        const markets: resources.Market[] = await this.marketService.findAllByReceiveAddress(itemCategory.market).then(value => value.toJSON());
        const adminMarket = _.find(markets, market => {
            return market.type === MarketType.STOREFRONT_ADMIN;
        });

        if (_.isEmpty(adminMarket)) {
            throw new MessageException('You cannot modify this ItemCategory.');
        }

        return data;
    }

    public usage(): string {
        return this.getName() + ' <categoryId> <categoryName> <description> [parentItemCategoryId] ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <categoryId>                  - number, The ID of the ItemCategory. \n'
            + '    <categoryName>                - string, The new name for the ItemCategory. \n'
            + '    <description>                 - string, The new description for the ItemCategory. \n'
            + '    <parentItemCategoryId>        - [optional] number - The ID of the new parent ItemCategory; default is the market root category. ';
    }

    public description(): string {
        return 'Update the details of an item category given by categoryId.';
    }

    public example(): string {
        return 'category ' + this.getName() + ' 81 updatedCategory \'Updated category description\' 80 ';
    }

}
