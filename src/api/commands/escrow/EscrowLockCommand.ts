// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { Logger as LoggerType } from '../../../core/Logger';
import { inject, named } from 'inversify';
import { request, validate } from '../../../core/api/Validate';
import { Core, Targets, Types } from '../../../constants';
import { RpcRequest } from '../../requests/RpcRequest';
import { Escrow } from '../../models/Escrow';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { OrderItemService } from '../../services/model/OrderItemService';
import { Commands } from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { MessageException } from '../../exceptions/MessageException';
import { OrderItemStatus } from '../../enums/OrderItemStatus';
import { ModelNotFoundException } from '../../exceptions/ModelNotFoundException';
import { EscrowLockActionService } from '../../services/action/EscrowLockActionService';
import { SmsgSendParams } from '../../requests/action/SmsgSendParams';
import { BidService } from '../../services/model/BidService';
import { EscrowLockRequest } from '../../requests/action/EscrowLockRequest';
import { MPAction } from 'omp-lib/dist/interfaces/omp-enums';
import { SmsgSendResponse } from '../../responses/SmsgSendResponse';
import { KVS } from 'omp-lib/dist/interfaces/common';
import { BidDataValue } from '../../enums/BidDataValue';
import { IdentityService } from '../../services/model/IdentityService';
import { CommandParamValidationRules, IdValidationRule, ParamValidationRule } from '../CommandParamValidation';


export class EscrowLockCommand extends BaseCommand implements RpcCommandInterface<SmsgSendResponse> {

    private PARAMS_KEYS: string[] = [
        BidDataValue.DELIVERY_CONTACT_PHONE.toString(),
        BidDataValue.DELIVERY_CONTACT_EMAIL.toString()
    ];

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.action.EscrowLockActionService) private escrowLockActionService: EscrowLockActionService,
        @inject(Types.Service) @named(Targets.Service.model.BidService) private bidService: BidService,
        @inject(Types.Service) @named(Targets.Service.model.IdentityService) private identityService: IdentityService,
        @inject(Types.Service) @named(Targets.Service.model.OrderItemService) private orderItemService: OrderItemService
    ) {
        super(Commands.ESCROW_LOCK);
        this.log = new Logger(__filename);
    }

    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('orderItemId', true, this.orderItemService)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    /**
     * data.params[]:
     * [0]: orderItem, resources.OrderItem
     * [1]: options, KVS[], should contain the phone number for delivery, if given
     * [2]: identity, resources.Identity
     *
     * @param data
     * @returns {Promise<SmsgSendResponse>}
     */
    @validate()
    public async execute(@request(RpcRequest) data: RpcRequest): Promise<SmsgSendResponse> {

        const orderItem: resources.OrderItem = data.params[0];
        const options: KVS[] = data.params[1];
        const identity: resources.Identity = data.params[2];

        const bid: resources.Bid = await this.bidService.findOne(orderItem.Bid.id).then(value => value.toJSON());
        const childBid: resources.Bid | undefined = _.find(bid.ChildBids, (child) => {
            return child.type === MPAction.MPA_ACCEPT;
        });
        if (!childBid) {
            throw new MessageException('No accepted Bid found.');
        }
        const bidAccept = await this.bidService.findOne(childBid.id).then(value => value.toJSON());

        const postRequest = {
            sendParams: {
                wallet: identity.wallet,
                fromAddress: identity.address,
                toAddress: orderItem.Order.seller,
                paid: false,
                daysRetention: parseInt(process.env.FREE_MESSAGE_RETENTION_DAYS, 10),
                estimateFee: false,
                anonFee: false
            } as SmsgSendParams,
            bid,
            bidAccept,
            objects: options
        } as EscrowLockRequest;

        return this.escrowLockActionService.post(postRequest);
    }

    /**
     * data.params[]:
     * [0]: orderItemId
     * [...]: bidDatKey, string, optional
     * [...]: bidDataValue, string, optional
     *
     * @param {RpcRequest} data
     * @returns {Promise<RpcRequest>}
     */
    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data);

        const orderItem: resources.OrderItem = data.params[0];

        if (orderItem.status !== OrderItemStatus.AWAITING_ESCROW) {
            throw new MessageException('Order is in invalid state');
        }

        if (_.isEmpty(orderItem.Bid.ListingItem)) {
            throw new ModelNotFoundException('ListingItem');
        }

        if (_.isEmpty(orderItem.Bid.ListingItem.PaymentInformation)) {
            throw new ModelNotFoundException('PaymentInformation');
        }

        if (_.isEmpty(orderItem.Bid.ListingItem.PaymentInformation.Escrow)) {
            throw new ModelNotFoundException('Escrow');
        }

        if (_.isEmpty(orderItem.Bid.ListingItem.PaymentInformation.Escrow.Ratio)) {
            throw new ModelNotFoundException('Ratio');
        }

        // get the extra delivery contact information, if it exists
        const options: KVS[] = this.additionalParamsToKVS(data);
        if (!_.isEmpty(options)) {
            data.params[1] = options;
        }

        const identity: resources.Identity = await this.identityService.findOneByAddress(orderItem.Order.buyer)
            .then(value => value.toJSON())
            .catch(reason => {
                throw new ModelNotFoundException('Identity');
            });

        data.params[0] = orderItem;
        data.params[2] = identity;

        return data;
    }

    public usage(): string {
        return this.getName() + ' <orderItemId> ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + '\n'
            + '    <orderItemId>            - number, the id of the OrderItem for which we want to lock the Escrow.\n';
    }

    public description(): string {
        return 'Lock an Escrow.';
    }

    public example(): string {
        return '';
    }

    private additionalParamsToKVS(data: RpcRequest): KVS[] {
        const additionalParams: KVS[] = [];

        for (const paramsKey of this.PARAMS_KEYS) {
            for (let j = 0; j < data.params.length - 1; ++j) {
                if (paramsKey === data.params[j]) {
                    additionalParams.push({
                        key:  paramsKey,
                        value: !_.includes(this.PARAMS_KEYS, data.params[j + 1]) ? data.params[j + 1] : ''});
                    break;
                }
            }
        }
        return additionalParams;
    }
}
