// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { CoreMessageVersion } from '../../enums/CoreMessageVersion';
import { SmsgSendCoinControl } from '../../services/SmsgService';

export interface SmsgSendParams {

    wallet: string;                     // wallet used for sending
    fromAddress: string;
    toAddress: string;
    daysRetention: number;              // = parseInt(process.env.PAID_MESSAGE_RETENTION_DAYS, 10);
    estimateFee: boolean;
    anonFee: boolean;
    ringSize?: number;
    messageType?: CoreMessageVersion;   // use to override the message type
    coinControl?: SmsgSendCoinControl;
}
