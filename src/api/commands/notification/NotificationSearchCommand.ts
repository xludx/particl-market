// Copyright (c) 2017-2021, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as Bookshelf from 'bookshelf';
import * as resources from 'resources';
import {inject, named} from 'inversify';
import {request, validate} from '../../../core/api/Validate';
import {Logger as LoggerType} from '../../../core/Logger';
import {Core, Targets, Types} from '../../../constants';
import {RpcRequest} from '../../requests/RpcRequest';
import {Notification} from '../../models/Notification';
import {RpcCommandInterface} from '../RpcCommandInterface';
import {Commands} from '../CommandEnumType';
import {ProfileService} from '../../services/model/ProfileService';
import {
    ActionMessageTypesValidationRule,
    BooleanValidationRule,
    CommandParamValidationRules,
    EnumValidationRule,
    IdValidationRule,
    ParamValidationRule
} from '../CommandParamValidation';
import {NotificationService} from '../../services/model/NotificationService';
import {BaseSearchCommand} from '../BaseSearchCommand';
import {EnumHelper} from '../../../core/helpers/EnumHelper';
import {NotificationSearchOrderField, SearchOrderField} from '../../enums/SearchOrderField';
import {SearchOrder} from '../../enums/SearchOrder';
import {NotificationSearchParams} from '../../requests/search/NotificationSearchParams';
import {BidRejectReason} from '../../enums/BidRejectReason';
import {CommentCategory} from '../../enums/CommentCategory';
import {ProposalCategory} from '../../enums/ProposalCategory';
import {ActionMessageTypes} from '../../enums/ActionMessageTypes';


export class NotificationSearchCommand extends BaseSearchCommand implements RpcCommandInterface<Bookshelf.Collection<Notification>> {

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.model.NotificationService) private notificationService: NotificationService,
        @inject(Types.Service) @named(Targets.Service.model.ProfileService) private profileService: ProfileService
    ) {
        super(Commands.NOTIFICATION_SEARCH);
        this.log = new Logger(__filename);
    }

    /**
     * params[]:
     *  [0]: profile: resources.Profile
     *  [1]: types: ActionMessageTypes[]
     *  [2]: category: boolean
     *  [3]: read: boolean
     *
     */
    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('profileId', false, this.profileService),
                new ActionMessageTypesValidationRule(false),
                new EnumValidationRule('category', false, 'CommentCategory|ProposalCategory', [
                        CommentCategory.LISTINGITEM_QUESTION_AND_ANSWERS, CommentCategory.PROPOSAL_QUESTION_AND_ANSWERS,
                        CommentCategory.MARKETPLACE_COMMENT, CommentCategory.PRIVATE_MESSAGE,
                        ProposalCategory.PUBLIC_VOTE, ProposalCategory.ITEM_VOTE, ProposalCategory.MARKET_VOTE
                    ] as string[]),
                new BooleanValidationRule('read', false, false)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    public getAllowedSearchOrderFields(): string[] {
        return EnumHelper.getValues(NotificationSearchOrderField) as string[];
    }

    /**
     * data.params[]:
     *  [4]: profile: resources.Profile
     *  [5]: types: ActionMessageTypes[]
     *  [6]: category: boolean
     *  [7]: read: boolean
     *
     * @param data
     * @returns {Promise<Bookshelf.Collection<Market>>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<Bookshelf.Collection<Notification>> {
        const page: number = data.params[0];
        const pageLimit: number = data.params[1];
        const order: SearchOrder = data.params[2];
        const orderField: SearchOrderField = data.params[3];
        const profile: resources.Profile = data.params[4];
        const types: ActionMessageTypes[] = data.params[5];
        const category: CommentCategory | ProposalCategory = data.params[6];
        const read: boolean = data.params[7];

        const searchParams = {
            page,
            pageLimit,
            order,
            orderField,
            profileId: _.isNil(profile) ? undefined : profile.id,
            types,
            category,
            read
        } as NotificationSearchParams;

        return await this.notificationService.search(searchParams);
    }

    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data);
        return data;
    }

    public usage(): string {
        return this.getName() + ' [profileId] [read]';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <profileId>              - [optional] number, The ID of the Profile. \n'
            + '    <read>                   - [optional] boolean, the read state, default: false. ';

    }

    public description(): string {
        return 'Search Notifications.';
    }

    public example(): string {
        return 'notification ' + this.getName() + ' 1';
    }
}
