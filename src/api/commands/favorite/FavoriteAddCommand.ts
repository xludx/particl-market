// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as resources from 'resources';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { FavoriteItemService } from '../../services/model/FavoriteItemService';
import { ListingItemService } from '../../services/model/ListingItemService';
import { ProfileService } from '../../services/model/ProfileService';
import { RpcRequest } from '../../requests/RpcRequest';
import { FavoriteItem } from '../../models/FavoriteItem';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { FavoriteItemCreateRequest } from '../../requests/model/FavoriteItemCreateRequest';
import { Commands} from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { MessageException } from '../../exceptions/MessageException';
import {
    CommandParamValidationRules,
    IdValidationRule,
    ParamValidationRule
} from '../CommandParamValidation';

export class FavoriteAddCommand extends BaseCommand implements RpcCommandInterface<FavoriteItem> {

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.model.FavoriteItemService) private favoriteItemService: FavoriteItemService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemService) private listingItemService: ListingItemService,
        @inject(Types.Service) @named(Targets.Service.model.ProfileService) private profileService: ProfileService
    ) {
        super(Commands.FAVORITE_ADD);
        this.log = new Logger(__filename);
    }

    /**
     * params[]:
     *  [0]: profileId
     *  [1]: listingItemId
     */
    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('profileId', true, this.profileService),
                new IdValidationRule('listingItemId', true, this.listingItemService)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<FavoriteItem> {
        const profile: resources.Profile = data.params[0];
        const listingItem: resources.ListingItem = data.params[1];

        return await this.favoriteItemService.create({
            profile_id: profile.id,
            listing_item_id: listingItem.id
        } as FavoriteItemCreateRequest);
    }

    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data);

        const profile: resources.Profile = data.params[0];
        const listingItem: resources.ListingItem = data.params[1];

        await this.favoriteItemService.findOneByProfileIdAndListingItemId(profile.id, listingItem.id)
            .then(value => {
                throw new MessageException('FavoriteItem already exists.');
            })
            .catch(reason => {
                // great, not found, so we can continue and create it
                // return RpcRequest with the correct data to be passed to execute
            });

        return data;
    }

    public usage(): string {
        return this.getName() + ' <profileId> <listingItemId> ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + '\n'
            + '    <profileId>                   - number, The Profile ID. \n'
            + '    <listingItemId>               - number, The ListingItem ID. \n';
    }

    public description(): string {
        return 'Command for adding FavoriteItems.';
    }

    public example(): string {
        return 'favorite ' + this.getName() + ' 1 1 ';
    }
}
