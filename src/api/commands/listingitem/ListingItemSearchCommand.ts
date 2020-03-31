// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as Bookshelf from 'bookshelf';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { ListingItemService } from '../../services/model/ListingItemService';
import { RpcRequest } from '../../requests/RpcRequest';
import { ListingItem } from '../../models/ListingItem';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { ListingItemSearchParams } from '../../requests/search/ListingItemSearchParams';
import { ShippingCountries } from '../../../core/helpers/ShippingCountries';
import { Commands } from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { MessageException } from '../../exceptions/MessageException';
import { InvalidParamException } from '../../exceptions/InvalidParamException';
import { MissingParamException } from '../../exceptions/MissingParamException';

export class ListingItemSearchCommand extends BaseCommand implements RpcCommandInterface<Bookshelf.Collection<ListingItem>> {

    public log: LoggerType;

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemService) public listingItemService: ListingItemService
    ) {
        super(Commands.ITEM_SEARCH);
        this.log = new Logger(__filename);
    }

    /**
     * data.params[]:
     *  [0]: page, number, 0-based
     *  [1]: pageLimit, number
     *  [2]: order, SearchOrder
     *  [3]: category, number|string, if string, try to find using key, can be null
     *  [4]: type (FLAGGED | PENDING | LISTED | IN_ESCROW | SHIPPED | SOLD | EXPIRED | ALL)
     *  TODO: type is deprecated, remove!!
     *  [5]: profileId, (NUMBER | OWN | ALL | *)
     *  [6]: minPrice, number to searchBy item basePrice between 2 range
     *  [7]: maxPrice, number to searchBy item basePrice between 2 range
     *  [8]: country, string, can be null
     *  [9]: shippingDestination, string, can be null
     *  [10]: searchString, string, can be null
     *  [11]: flagged, boolean, can be null
     *  [12]: withRelated, boolean
     *
     * @param data
     * @returns {Promise<ListingItem>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<Bookshelf.Collection<ListingItem>> {

        return await this.listingItemService.search({
            page: data.params[0] || 0,
            pageLimit: data.params[1] || 10, // default page limit 10
            order: data.params[2] || 'ASC',
            category: data.params[3],
            profileId: data.params[5],
            minPrice: data.params[6],
            maxPrice: data.params[7],
            country: data.params[8],
            shippingDestination: data.params[9],
            searchString: data.params[10] || '',
            flagged: data.params[11]
        } as ListingItemSearchParams, data.params[12]);
    }

    /**
     * data.params[]:
     *  [0]: page, number, 0-based
     *  [1]: pageLimit, number
     *  [2]: order, SearchOrder
     *  [3]: category, number|string|<number|string>[], if string, try to find using key, can be null
     *  [4]: type (FLAGGED | PENDING | LISTED | IN_ESCROW | SHIPPED | SOLD | EXPIRED | ALL)
     *  TODO: type is deprecated, remove!!
     *  [5]: profileId, (NUMBER | OWN | ALL | *)
     *  [6]: minPrice, number to searchBy item basePrice between 2 range
     *  [7]: maxPrice, number to searchBy item basePrice between 2 range
     *  [8]: country, string, can be null
     *  [9]: shippingDestination, string, can be null
     *  [10]: searchString, string, can be null
     *  [11]: flagged, boolean, can be null
     *  [12]: withRelated, boolean
     *
     * TODO: add orderField
     *
     * @param data
     * @returns {Promise<ListingItemTemplate>}
     */
    public async validate(data: RpcRequest): Promise<RpcRequest> {

        if (data.params.length < 1) {
            throw new MissingParamException('page');
        } else if (data.params.length < 2) {
            throw new MissingParamException('pageLimit');
        } else if (data.params.length < 3) {
            throw new MissingParamException('order');
        }

        // make sure the params are of correct type
        if (data.params[0] && typeof data.params[0] !== 'number') {
            throw new InvalidParamException('page', 'number');
        } else if (data.params[1] && typeof data.params[1] !== 'number') {
            throw new InvalidParamException('pageLimit', 'number');
        } else if (data.params[2] && typeof data.params[2] !== 'string') {
            throw new InvalidParamException('order', 'string');
        } else if (data.params[4] && typeof data.params[4] !== 'string') {
            throw new InvalidParamException('type', 'string');
        } else if (data.params[6] && typeof data.params[6] !== 'number') {
            throw new InvalidParamException('minPrice', 'number');
        } else if (data.params[7] && typeof data.params[7] !== 'number') {
            throw new InvalidParamException('maxPrice', 'number');
        }

        if (data.params[3]) {
            const categoryType = Object.prototype.toString.call(data.params[3]);
            let hasError = !((categoryType === '[object Number]') || (categoryType === '[object String]') || (categoryType === '[object Array]'));
            if (categoryType !== '[object Array]') {
                hasError = hasError || (typeof data.params[3][0] === 'number' && (data.params[3].find((id: any) => typeof id !== 'number') !== -1));
                hasError = hasError || (typeof data.params[3][0] === 'string' && (data.params[3].find((value: any) => typeof value !== 'string') !== -1));
            }
            if (hasError) {
                throw new InvalidParamException('category', 'number | string | <number|string>[]');
            }
        }

        // check valid profile profileId searchBy params
        if (typeof data.params[5] !== 'number' && data.params[5] !== 'OWN' && data.params[5] !== 'ALL' && data.params[5] !== '*') {
            throw new MessageException('Value needs to be number | OWN | ALL.');
        }

        data.params[5] = data.params[5] || 'ALL';

        if (data.params[8]) {
            data.params[8] = ShippingCountries.convertAndValidate(data.params[8]);
        }

        if (data.params[9]) {
            data.params[9] = ShippingCountries.convertAndValidate(data.params[9]);
        }
        return data;
    }

    // TODO: fix this, these params are not optional
    public usage(): string {
        return this.getName() + '<page> <pageLimit> <ordering> ' +
            '[(<categoryId> | <categoryName> | <categoryId|categoryName>[]) [ <type> [(<profileId>| OWN | ALL) [<minPrice> [ <maxPrice>' +
            ' [ <country> [ <shippingDestination> [<searchString> [<flagged>]]]]]]]]]';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <page>                   - Numeric - The number page we want to \n'
            + '                                view of searchBy listing item results. \n'
            + '    <pageLimit>              - Numeric - The number of results per page. \n'
            + '    <ordering>               - ENUM{ASC,DESC} - The ordering of the searchBy results. \n'
            + '    <category>               - [optional] Numeric | String | <Numeric | String>[] - The ID(s) or key(s) \n'
            + '                                 identifying the category associated with the listing items we want to searchBy for. \n'
            + '    <type>                   -  ENUM{FLAGGED | PENDING | LISTED | IN_ESCROW | SHIPPED | SOLD | EXPIRED | ALL} \n'
            + '                                 FLAGGED = ListingItems you have flagged \n'
            + '                                 PENDING = ListingItemTemplates posted to market\n'
            + '                                           but not yet received as ListingItem \n'
            + '                                 IN_ESCROW = ListingItems that are escrow \n'
            + '                                 SHIPPED = ListingItems that have been shipped \n'
            + '                                 SOLD = ListingItems that have been sold \n'
            + '                                 EXPIRED = ListingItems that have been expired \n'
            + '                                 ALL = all items\n'
            + '    <profileId>              -  (NUMBER | OWN | ALL | *) \n'
            + '                                 NUMBER - ListingItems belonging to profileId \n'
            + '                                 OWN - ListingItems belonging to any profile \n'
            + '                                 ALL / * - ALL ListingItems\n'
            + '    <minPrice>               - [optional] Numeric - The minimum price of the listing item price \n'
            + '                                we want to searchBy for between basePrice range. \n'
            + '    <maxPrice>               - [optional] Numeric - The maximum price of the listing item price \n'
            + '                                we want to searchBy for between basePrice range. \n'
            + '    <country>                - [optional] String - The country of the listing item \n'
            + '                                we want to searchBy for. \n'
            + '    <shippingDestination>    - [optional] String - The shipping destination of the listing item \n'
            + '                                we want to searchBy for. \n'
            + '    <searchString>           - [optional] String - A string that is used to \n'
            + '                                find listing items by their titles. \n'
            + '    <flagged>                - [optional] Boolean - Search for flagged or non-flagged \n'
            + '                                listing items (default: true). \n'
            + '    <withRelated>            - [optional] Boolean - Whether to include related data or not (default: true). ';
    }


    public description(): string {
        return 'Search listing items with pagination by category id or'
            + ' category name or by profileId, or by listing item price'
            + ' min and max price range, or by country or shipping destination.';
    }

    public example(): string {
        return 'item ' + this.getName() + ' 1 10 ASC 76 1 100 200 Australia China wine';
    }

}
