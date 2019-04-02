// Copyright (c) 2017-2019, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as resources from 'resources';
import { ModelCreateParams } from './ModelCreateParams';
import { ActionMessageInterface } from '../../messages/actions/ActionMessageInterface';

/**
 * ModelFactoryInterface defines how the Factory classes for the CreateRequests should be implemented
 */
export interface ModelFactoryInterface {
    // TODO: return CreateRequestInterface
    get(actionMessage: ActionMessageInterface, params?: ModelCreateParams, smsgMessage?: resources.SmsgMessage): Promise<any>;
}