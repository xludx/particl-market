// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { Logger as LoggerType } from '../../../core/Logger';
import { inject, named } from 'inversify';
import { request, validate } from '../../../core/api/Validate';
import { Core, Targets, Types } from '../../../constants';
import { ItemCategoryService } from '../../services/model/ItemCategoryService';
import { ListingItemService } from '../../services/model/ListingItemService';
import { ListingItemTemplateService } from '../../services/model/ListingItemTemplateService';
import { RpcRequest } from '../../requests/RpcRequest';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { MessageException } from '../../exceptions/MessageException';
import { ListingItemTemplateSearchParams } from '../../requests/search/ListingItemTemplateSearchParams';
import { Commands } from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { SearchOrder } from '../../enums/SearchOrder';
import { ListingItemSearchParams } from '../../requests/search/ListingItemSearchParams';
import { ListingItemTemplateSearchOrderField } from '../../enums/SearchOrderField';
import { CommandParamValidationRules, IdValidationRule, ParamValidationRule } from '../CommandParamValidation';

export class ItemCategoryRemoveCommand extends BaseCommand implements RpcCommandInterface<void> {

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.model.ItemCategoryService) private itemCategoryService: ItemCategoryService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemService) private listingItemService: ListingItemService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemTemplateService) private listingItemTemplateService: ListingItemTemplateService
    ) {
        super(Commands.CATEGORY_REMOVE);
        this.log = new Logger(__filename);
    }

    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('id', true, this.itemCategoryService)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<void> {
        const category: resources.ItemCategory = data.params[0];
        return await this.itemCategoryService.destroy(category.id);
    }

    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data);

        const category: resources.ItemCategory = data.params[0];

        if (_.isNil(category.market)) {
            throw new MessageException('Default ItemCategory cannot be removed.');
        }

        // check for listingItemTemplates related to category
        await this.listingItemTemplateService.search({
            page: 0,
            pageLimit: 10,
            order: SearchOrder.ASC,
            orderField: ListingItemTemplateSearchOrderField.UPDATED_AT,
            categories: [category.id]
        } as ListingItemTemplateSearchParams)
            .then(values => {
                const listingItemTemplates = values.toJSON();
                if (listingItemTemplates.length > 0) {
                    throw new MessageException('ItemCategory associated with ListingItemTemplate cannot be deleted.');
                }
            });

        // check for listingItems related to category
        await this.listingItemService.search({
            categories: [category.id]
        } as ListingItemSearchParams)
            .then(values => {
                const listingItems = values.toJSON();
                if (listingItems.length > 0) {
                    throw new MessageException('ItemCategory associated with ListingItem cannot be deleted.');
                }
            });

        return data;
    }

    public usage(): string {
        return this.getName() + ' <categoryId> ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <categoryId>                  - number - ItemCategory ID. \n';
    }

    public description(): string {
        return 'Remove ItemCategory.';
    }

    public example(): string {
        return 'category ' + this.getName() + ' 81 ';
    }
}
