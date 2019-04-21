// Copyright (c) 2017-2019, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { ProposalAddMessage } from '../../messages/action/ProposalAddMessage';
import { ProposalCreateRequest } from '../../requests/model/ProposalCreateRequest';
import { ProposalOptionCreateRequest } from '../../requests/model/ProposalOptionCreateRequest';
import { ModelFactoryInterface } from './ModelFactoryInterface';
import { ProposalCreateParams} from './ModelCreateParams';
import { ConfigurableHasher } from 'omp-lib/dist/hasher/hash';
import { HashMismatchException } from '../../exceptions/HashMismatchException';
import { HashableProposalCreateRequestConfig } from '../hashableconfig/createrequest/HashableProposalCreateRequestConfig';
import { HashableProposalAddField } from '../hashableconfig/HashableField';
import { HashableProposalOptionMessageConfig } from '../hashableconfig/message/HashableProposalOptionMessageConfig';

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
    public async get(params: ProposalCreateParams, proposalMessage: ProposalAddMessage, smsgMessage?: resources.SmsgMessage): Promise<ProposalCreateRequest> {

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

        const optionsList: ProposalOptionCreateRequest[] = this.getOptionCreateRequests(proposalMessage.options);

        const createRequest = {
            // msgid: params.msgid,                 // update this on afterPost()!
            submitter: proposalMessage.submitter,
            category: proposalMessage.category,
            title: proposalMessage.title,
            description: proposalMessage.description,
            item: proposalMessage.item,
            options: optionsList,
            ...smsgData
        } as ProposalCreateRequest;

        // hash the proposal
        let hashableOptions = '';
        for (const option of createRequest.options) {
            hashableOptions = hashableOptions + option.optionId + ':' + option.description + ':';
        }
        createRequest.hash = ConfigurableHasher.hash(createRequest, new HashableProposalCreateRequestConfig([{
            value: hashableOptions,
            to: HashableProposalAddField.PROPOSAL_OPTIONS
        }]));

        // validate that the createRequest.hash should have a matching hash with the incoming or outgoing message
        if (proposalMessage.hash !== createRequest.hash) {
            throw new HashMismatchException('ProposalCreateRequest');
        }

        // add hashes for the options too
        for (const option of optionsList) {
            option.hash = ConfigurableHasher.hash(option, new HashableProposalOptionMessageConfig());
        }

        return createRequest;
    }


    private getOptionCreateRequests(options: resources.ProposalOption[]): ProposalOptionCreateRequest[] {
        const optionsList: ProposalOptionCreateRequest[] = [];

        for (const proposalOption of options) {
            const option = {
                optionId: proposalOption.optionId,
                description: proposalOption.description
            } as ProposalOptionCreateRequest;

            option.hash = ConfigurableHasher.hash(option, new HashableProposalOptionMessageConfig());
            optionsList.push(option);
        }
        optionsList.sort(((a, b) => a.optionId > b.optionId ? 1 : -1));

        return optionsList;
    }
}
