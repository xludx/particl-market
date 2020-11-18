// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { BaseSearchParams } from './BaseSearchParams';
import { ActionMessageTypes } from '../../enums/ActionMessageTypes';
import { CommentCategory } from '../../enums/CommentCategory';
import { ProposalCategory } from '../../enums/ProposalCategory';

export class NotificationSearchParams extends BaseSearchParams {
    public profileId: number;
    public types: ActionMessageTypes[];
    public category: CommentCategory | ProposalCategory;
    public read: boolean;
}
