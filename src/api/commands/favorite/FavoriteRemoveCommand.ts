// Copyright (c) 2017-2021, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { FavoriteItemService } from '../../services/model/FavoriteItemService';
import { RpcRequest } from '../../requests/RpcRequest';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { Commands} from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import {
    CommandParamValidationRules,
    IdValidationRule,
    ParamValidationRule
} from '../CommandParamValidation';

export class FavoriteRemoveCommand extends BaseCommand implements RpcCommandInterface<void> {

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.model.FavoriteItemService) private favoriteItemService: FavoriteItemService
    ) {
        super(Commands.FAVORITE_REMOVE);
        this.log = new Logger(__filename);
    }

    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('favoriteItemId', true, this.favoriteItemService)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<void> {
        const favItem: resources.FavoriteItem = data.params[0];
        return this.favoriteItemService.destroy(favItem.id);
    }

    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data);
        return data;
    }

    public usage(): string {
        return this.getName() + ' <favoriteItemId> ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + '\n'
            + '    <favoriteItemId>                   - number, FavoriteItem ID.\n';
    }

    public description(): string {
        return 'Command for removing a FavoriteItem.';
    }

    public example(): string {
        return 'favorite ' + this.getName() + ' 1';
    }
}
