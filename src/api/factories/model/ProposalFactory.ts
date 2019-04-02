// Copyright (c) 2017-2019, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { ProposalAddMessage } from '../../messages/actions/ProposalAddMessage';
import { ObjectHash } from '../../../core/helpers/ObjectHash';
import { HashableObjectType } from '../../enums/HashableObjectType';
import { ProposalCreateRequest } from '../../requests/ProposalCreateRequest';
import { ProposalOptionCreateRequest } from '../../requests/ProposalOptionCreateRequest';
import { MessageException } from '../../exceptions/MessageException';
import { ModelFactoryInterface } from './ModelFactoryInterface';
import { ProposalCreateParams} from './ModelCreateParams';

export class ProposalFactory implements ModelFactoryInterface {

    public log: LoggerType;

    constructor(@inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType) {
        this.log = new Logger(__filename);
    }

    /**
     *
     * @param {ProposalAddMessage} proposalMessage
     * @param smsgMessage
     * @param params
     * @returns {Promise<ProposalCreateRequest>}
     */
    public async get(proposalMessage: ProposalAddMessage, params?: ProposalCreateParams, smsgMessage?: resources.SmsgMessage): Promise<ProposalCreateRequest> {

        const smsgData: any = {
            postedAt: Number.MAX_SAFE_INTEGER,
            expiredAt: Number.MAX_SAFE_INTEGER,
            receivedAt: Number.MAX_SAFE_INTEGER,
            timeStart: Number.MAX_SAFE_INTEGER
        };

        if (smsgMessage) {
            smsgData.postedAt = smsgMessage.sent;
            smsgData.receivedAt = smsgMessage.received;
            smsgData.expiredAt = smsgMessage.expiration;
            smsgData.timeStart = smsgMessage.sent;
        }

        const proposalCreateRequest = {
            submitter: proposalMessage.submitter,
            hash: proposalMessage.hash,
            category: proposalMessage.category,
            title: proposalMessage.title,
            description: proposalMessage.description,
            item: proposalMessage.item,
            options: proposalMessage.options as ProposalOptionCreateRequest[],
            ...smsgData
        } as ProposalCreateRequest;

        const correctHash = ObjectHash.getHash(proposalCreateRequest, HashableObjectType.PROPOSAL_CREATEREQUEST);
        if (correctHash !== proposalCreateRequest.hash) {
            throw new MessageException(`Received proposal hash <${proposalCreateRequest.hash}> doesn't match actual hash <${correctHash}>.`);
        }

        return proposalCreateRequest;
    }

}