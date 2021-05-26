// Copyright (c) 2017-2021, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { OrderItemStatus } from './OrderItemStatus';

/**
 * OrderItemStatusSequence
 *
 * Allows for the definition of a validation hierarchy between OrderItemStatuses
 */

export type OrderItemStatusSequence = {
    [state in OrderItemStatus]?: {
        nextStates: OrderItemStatus[]
    }
};
