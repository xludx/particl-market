// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as Bookshelf from 'bookshelf';
import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { request, validate } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Core, Targets, Types } from '../../../constants';
import { RpcRequest } from '../../requests/RpcRequest';
import { ListingItemTemplate } from '../../models/ListingItemTemplate';
import { ListingItemTemplateSearchOrderField } from '../../enums/SearchOrderField';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { Commands } from '../CommandEnumType';
import { InvalidParamException } from '../../exceptions/InvalidParamException';
import { SearchOrder } from '../../enums/SearchOrder';
import { ProfileService } from '../../services/model/ProfileService';
import { BaseSearchCommand } from '../BaseSearchCommand';
import { EnumHelper } from '../../../core/helpers/EnumHelper';
import { MarketService } from '../../services/model/MarketService';
import { CommandParamValidationRules, ParamValidationRule } from '../BaseCommand';
import { MarketType } from '../../enums/MarketType';
import { MarketSearchParams } from '../../requests/search/MarketSearchParams';
import { Market } from '../../models/Market';

export class MarketSearchCommand extends BaseSearchCommand implements RpcCommandInterface<Bookshelf.Collection<Market>> {

    public log: LoggerType;

    public paramValidationRules = {
        parameters: [{
            name: 'searchString',
            required: false,
            type: 'string'
        }, {
            name: 'type',
            required: false,
            type: 'string'
        }] as ParamValidationRule[]
    } as CommandParamValidationRules;

    constructor(
        @inject(Types.Service) @named(Targets.Service.model.ProfileService) private profileService: ProfileService,
        @inject(Types.Service) @named(Targets.Service.model.MarketService) private marketService: MarketService,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        super(Commands.MARKET_SEARCH);
        this.log = new Logger(__filename);
    }

    public getAllowedSearchOrderFields(): string[] {
        return EnumHelper.getValues(ListingItemTemplateSearchOrderField) as string[];
    }

    /**
     * data.params[]:
     *  [0]: page, number, 0-based
     *  [1]: pageLimit, number
     *  [2]: order, SearchOrder
     *  [3]: orderField, SearchOrderField, field to which the SearchOrder is applied
     *  [4]: searchString, string, optional, * for all
     *  [5]: type, MarketType, optional
     *
     * @param data
     * @returns {Promise<ListingItemTemplate>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<Bookshelf.Collection<Market>> {

        const searchString: string = data.params[4];
        const type: MarketType = data.params[5];

        const searchParams = {
            page: data.params[0] || 0,
            pageLimit: data.params[1] || 10,
            order: data.params[2] || SearchOrder.ASC,
            orderField: data.params[3] || ListingItemTemplateSearchOrderField.UPDATED_AT,
            searchString,
            type
        } as MarketSearchParams;

        return await this.marketService.search(searchParams);
    }

    /**
     * data.params[]:
     *  [0]: page, number, 0-based
     *  [1]: pageLimit, number
     *  [2]: order, SearchOrder
     *  [3]: orderField, SearchOrderField, field to which the SearchOrder is applied
     *  [4]: searchString, string, optional, * for all
     *  [5]: type, MarketType, optional
     *
     * @param data
     * @returns {Promise<RpcRequest>}
     */
    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data); // validates the basic search params, see: BaseSearchCommand.validateSearchParams()

        const searchString = data.params[4];            // optional
        const type = data.params[5];                    // optional

        if (!EnumHelper.containsName(MarketType, type)) {
            throw new InvalidParamException('type', 'MarketType');
        }

        data.params[4] = searchString !== '*' ? data.params[4] : undefined;

        return data;
    }

    public usage(): string {
        return this.getName() + ' <page> <pageLimit> <order> <orderField> [searchString] [type] ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <page>                   - Numeric - The number of the page we want to view. \n'
            + '    <pageLimit>              - Numeric - The number of results per page. \n'
            + '    <order>                  - ENUM{SearchOrder} - The order of the returned results. \n'
            + '    <orderField>             - ENUM{ListingItemTemplateSearchOrderField} - The field to use to sort results.\n'
            + '    <searchString>           - [optional] String - A string that is used to search. \n'
            + '    <type>                   - [optional] MarketType, optional - MARKETPLACE \n';
    }

    public description(): string {
        return 'Search Markets.';
    }

    public example(): string {
        return 'market ' + this.getName() + ' 0 10 \'ASC\'';
    }
}