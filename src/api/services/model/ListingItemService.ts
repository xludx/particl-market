// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as Bookshelf from 'bookshelf';
import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { validate, request } from '../../../core/api/Validate';
import { NotFoundException } from '../../exceptions/NotFoundException';
import { ListingItemRepository } from '../../repositories/ListingItemRepository';
import { ListingItem } from '../../models/ListingItem';
import { ListingItemCreateRequest } from '../../requests/model/ListingItemCreateRequest';
import { ListingItemUpdateRequest } from '../../requests/model/ListingItemUpdateRequest';
import { MessagingInformationService } from './MessagingInformationService';
import { PaymentInformationService } from './PaymentInformationService';
import { ItemInformationService } from './ItemInformationService';
import { ListingItemSearchParams } from '../../requests/search/ListingItemSearchParams';
import { PaymentInformationCreateRequest } from '../../requests/model/PaymentInformationCreateRequest';
import { MessagingInformationCreateRequest } from '../../requests/model/MessagingInformationCreateRequest';
import { MessagingInformationUpdateRequest } from '../../requests/model/MessagingInformationUpdateRequest';
import { ListingItemObjectCreateRequest } from '../../requests/model/ListingItemObjectCreateRequest';
import { ListingItemObjectUpdateRequest } from '../../requests/model/ListingItemObjectUpdateRequest';
import { ListingItemObjectService } from './ListingItemObjectService';
import { CommentService } from './CommentService';
import { CommentCategory } from '../../enums/CommentCategory';
import { ImageService } from './ImageService';
import { ShoppingCartItemService } from './ShoppingCartItemService';
import { ProposalCategory } from '../../enums/ProposalCategory';


export class ListingItemService {

    public log: LoggerType;

    constructor(
        @inject(Types.Service) @named(Targets.Service.model.ItemInformationService) public itemInformationService: ItemInformationService,
        @inject(Types.Service) @named(Targets.Service.model.PaymentInformationService) public paymentInformationService: PaymentInformationService,
        @inject(Types.Service) @named(Targets.Service.model.MessagingInformationService) public messagingInformationService: MessagingInformationService,
        @inject(Types.Service) @named(Targets.Service.model.ImageService) public imageService: ImageService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemObjectService) public listingItemObjectService: ListingItemObjectService,
        @inject(Types.Service) @named(Targets.Service.model.CommentService) public commentService: CommentService,
        @inject(Types.Service) @named(Targets.Service.model.ShoppingCartItemService) public shoppingCartItemService: ShoppingCartItemService,
        @inject(Types.Repository) @named(Targets.Repository.ListingItemRepository) public listingItemRepo: ListingItemRepository,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
    }

    public async findAll(): Promise<Bookshelf.Collection<ListingItem>> {
        return await this.listingItemRepo.findAll();
    }

    public async findAllExpired(): Promise<Bookshelf.Collection<ListingItem>> {
        return await this.listingItemRepo.findAllExpired();
    }

    /**
     *
     * @param {string} hash
     * @param {boolean} withRelated
     * @returns {Promise<ListingItem>}
     */
    public async findAllByHash(hash: string, withRelated: boolean = true): Promise<Bookshelf.Collection<ListingItem>> {
        return await this.listingItemRepo.findAllByHash(hash, withRelated);
    }

    public async findOne(id: number, withRelated: boolean = true): Promise<ListingItem> {
        const listingItem = await this.listingItemRepo.findOne(id, withRelated);
        if (listingItem === null) {
            this.log.warn(`ListingItem with the id=${id} was not found!`);
            throw new NotFoundException(id);
        }
        return listingItem;
    }

    /**
     *
     * @param {string} hash
     * @param marketReceiveAddress
     * @param {boolean} withRelated
     * @returns {Promise<ListingItem>}
     */
    public async findOneByHashAndMarketReceiveAddress(hash: string, marketReceiveAddress: string, withRelated: boolean = true): Promise<ListingItem> {
        const listingItem = await this.listingItemRepo.findOneByHashAndMarketReceiveAddress(hash, marketReceiveAddress, withRelated);
        if (listingItem === null) {
            this.log.warn(`ListingItem with the hash=${hash} and market=${marketReceiveAddress} was not found!`);
            throw new NotFoundException(hash);
        }
        return listingItem;
    }

    public async findOneByMsgId(msgId: string, withRelated: boolean = true): Promise<ListingItem> {
        const listingItem = await this.listingItemRepo.findOneByMsgId(msgId, withRelated);
        if (listingItem === null) {
            this.log.warn(`ListingItem with the msgid=${msgId} was not found!`);
            throw new NotFoundException(msgId);
        }
        return listingItem;
    }

    /**
     * searchBy ListingItems using given ListingItemSearchParams
     *
     * @param {ListingItemSearchParams} options
     * @param {boolean} withRelated
     * @returns {Promise<Bookshelf.Collection<ListingItem>>}
     */
    @validate()
    public async search(@request(ListingItemSearchParams) options: ListingItemSearchParams,
                        withRelated: boolean = true): Promise<Bookshelf.Collection<ListingItem>> {

        // this.log.debug('searchBy(), options: ', JSON.stringify(options, null, 2));
        return await this.listingItemRepo.search(options, withRelated);
    }

    /**
     *
     * @param {ListingItemCreateRequest} data
     * @returns {Promise<ListingItem>}
     */
    @validate()
    public async create( @request(ListingItemCreateRequest) data: ListingItemCreateRequest): Promise<ListingItem> {

        const body: ListingItemCreateRequest = JSON.parse(JSON.stringify(data));
        // this.log.debug('create ListingItem, body: ', JSON.stringify(body, null, 2));

        // extract and remove related models from request
        const itemInformation = body.itemInformation;
        const paymentInformation = body.paymentInformation;
        const messagingInformation = body.messagingInformation || [];
        const listingItemObjects = body.listingItemObjects || [];

        delete body.itemInformation;
        delete body.paymentInformation;
        delete body.messagingInformation;
        delete body.listingItemObjects;

        // this.log.debug('body:', JSON.stringify(body, null, 2));

        // If the request body was valid we will create the listingItem
        const listingItem: resources.ListingItem = await this.listingItemRepo.create(body).then(value => value.toJSON());

        // create related models
        if (!_.isEmpty(itemInformation)) {
            itemInformation.listing_item_id = listingItem.id;
            await this.itemInformationService.create(itemInformation);
        }

        if (!_.isEmpty(paymentInformation)) {
            paymentInformation.listing_item_id = listingItem.id;
            await this.paymentInformationService.create(paymentInformation);
        }

        if (!_.isEmpty(messagingInformation)) {
            for (const msgInfo of messagingInformation) {
                msgInfo.listing_item_id = listingItem.id;
                await this.messagingInformationService.create(msgInfo);
            }
        }

        if (!_.isEmpty(listingItemObjects)) {
            for (const object of listingItemObjects) {
                object.listing_item_id = listingItem.id;
                await this.listingItemObjectService.create(object);
            }
        }

        return await this.findOne(listingItem.id);
    }

    /**
     * TODO: listingitems arent supposed to be updated, remove?
     *
     * @param {number} id
     * @param {ListingItemUpdateRequest} data
     * @returns {Promise<ListingItem>}
     */
    @validate()
    public async update(id: number, @request(ListingItemUpdateRequest) data: ListingItemUpdateRequest): Promise<ListingItem> {

        const body = JSON.parse(JSON.stringify(data));
        // this.log.debug('updating ListingItem, body: ', JSON.stringify(body, null, 2));

        // find the existing one without related
        const listingItem: resources.ListingItem = await this.findOne(id, false).then(value => value.toJSON());

        // set new values
        listingItem.hash = body.hash;
        listingItem.seller = body.seller;
        listingItem.market = body.market;
        listingItem.removed = body.removed;

        // listingItem.expiryTime = body.expiryTime;
        // listingItem.postedAt = body.postedAt;
        // listingItem.expiredAt = body.expiredAt;
        // listingItem.receivedAt = body.receivedAt;
        // listingItem.generatedAt = body.generatedAt;

        // and update the ListingItem record
        const updatedListingItem = await this.listingItemRepo.update(id, listingItem);

        // update related ItemInformation
        // if the related one exists already, then update. if it doesnt exist, create.
        // and if the related one is missing, then remove.
        let itemInformation = updatedListingItem.related('ItemInformation').toJSON();

        if (!_.isEmpty(body.itemInformation)) {
            if (!_.isEmpty(itemInformation)) {
                itemInformation = body.itemInformation;
                itemInformation.listing_item_id = id;
                await this.itemInformationService.update(itemInformation.id, itemInformation);
            } else {
                itemInformation = body.itemInformation;
                itemInformation.listing_item_id = id;
                await this.itemInformationService.create(itemInformation);
            }
        } else if (!_.isEmpty(itemInformation)) {
            await this.itemInformationService.destroy(itemInformation.id);
        }

        // update related PaymentInformation
        // if the related one exists already, then update. if it doesnt exist, create.
        // and if the related one is missing, then remove.
        const paymentInformation = updatedListingItem.related('PaymentInformation').toJSON();

        if (!_.isEmpty(body.paymentInformation)) {
            if (!_.isEmpty(paymentInformation)) {
                const paymentInformationUR = body.paymentInformation as PaymentInformationCreateRequest;
                await this.paymentInformationService.update(paymentInformation.id, paymentInformationUR);
            } else {
                const paymentInformationCR = body.paymentInformation as PaymentInformationCreateRequest;
                paymentInformationCR.listing_item_id = id;
                await this.paymentInformationService.create(paymentInformationCR);
            }
        } else {
            // empty paymentinfo create request
            if (!_.isEmpty(paymentInformation)) {
                await this.paymentInformationService.destroy(paymentInformation.id);
            }
        }

        // MessagingInformation
        const existingMessagingInformations = updatedListingItem.related('MessagingInformation').toJSON() || [];
        const newMessagingInformation = body.messagingInformation || [];

        // delete MessagingInformation if not exist with new params
        for (const msgInfo of existingMessagingInformations) {
            if (!await this.checkExistingObject(newMessagingInformation, 'publicKey', msgInfo.publicKey)) {
                await this.messagingInformationService.destroy(msgInfo.id);
            }
        }

        // update or create MessagingInformation
        for (const msgInfo of newMessagingInformation) {
            msgInfo.listing_item_id = id;
            const message = await this.checkExistingObject(existingMessagingInformations, 'publicKey', msgInfo.publicKey);
            if (message) {
                message.protocol = msgInfo.protocol;
                message.publicKey = msgInfo.publicKey;
                await this.messagingInformationService.update(message.id, msgInfo as MessagingInformationUpdateRequest);
            } else {
                await this.messagingInformationService.create(msgInfo as MessagingInformationCreateRequest);
            }
        }

        const newListingItemObjects = body.listingItemObjects || [];

        // find related listingItemObjects
        const existingListingItemObjects = updatedListingItem.related('ListingItemObjects').toJSON() || [];

        // find highestOrderNumber
        const highestOrderNumber = await this.findHighestOrderNumber(newListingItemObjects);

        const objectsToBeUpdated = [] as any;
        for (const object of existingListingItemObjects) {
            // check if order number is greter than highestOrderNumber then delete
            if (object.order > highestOrderNumber) {
                await this.listingItemObjectService.destroy(object.id);
            } else {
                objectsToBeUpdated.push(object);
            }
        }
        // create or update listingItemObjects
        for (const object of newListingItemObjects) {
            object.listing_item_id = id;
            const itemObject = await this.checkExistingObject(objectsToBeUpdated, 'order', object.order);

            if (itemObject) {
                await this.listingItemObjectService.update(itemObject.id, object as ListingItemObjectUpdateRequest);
            } else {
                await this.listingItemObjectService.create(object as ListingItemObjectCreateRequest);
            }
        }

        // finally find and return the updated listingItem
        return await this.findOne(id);
    }

    /**
     *
     * @param {number} id
     * @returns {Promise<void>}
     */
    public async destroy(id: number): Promise<void> {

        const listingItem: resources.ListingItem = await this.findOne(id, true).then(value => value.toJSON());

        // skip if listingItem has Bids, FavoriteItems or ShoppingCartItems
        if (!_.isEmpty(listingItem.Bids)
            || !_.isEmpty(listingItem.FavoriteItems)
            || !_.isEmpty(listingItem.ShoppingCartItem)) {
            // Prevent ListingItems with associated Bids or FavoriteItems or ShoppingCartItems from being removed
            // todo: is there reason why we aren't throwing here?
            return;
        }

        // Comments dont have a hard link to ListinItems
        // TODO: we might not want to delete Comments just yet since the ListingItem might get relisted
        // TODO: remove comments separately
        /*
        const listingComments = await this.commentService.findAllByTypeAndTarget(CommentCategory.LISTINGITEM_QUESTION_AND_ANSWERS, listingItem.hash);
        listingComments.forEach((comment) => {
            try {
                this.log.debug('destroy(), deleting Comment:', comment.id);
                comment.destroy();
            } catch (error) {
                // Just log the error, we dont want to stop the process if one of these fails.
                this.log.error(error);
            }
        });
        */

        // manually remove Images
        if (!_.isEmpty(listingItem.ItemInformation.Images)) {
            for (const image of listingItem.ItemInformation.Images) {
                await this.imageService.destroy(image.id);
            }
        }

        await this.listingItemRepo.destroy(listingItem.id);
    }

    /**
     *
     * @param listingItem
     * @param listingItemTemplate
     */
    public async updateListingItemAndTemplateRelation(listingItem: resources.ListingItem,
                                                      listingItemTemplate: resources.ListingItemTemplate): Promise<ListingItem> {
        const listingItemModel: ListingItem = await this.findOne(listingItem.id, false);
        listingItemModel.set('listingItemTemplateId', listingItemTemplate.id);
        await this.listingItemRepo.update(listingItem.id, listingItemModel.toJSON());
        return await this.findOne(listingItem.id);
    }

    /**
     * Flag ListingItem as removed
     *
     * @returns {Promise<void>}
     */
    public async setRemovedFlag(id: number, removed: boolean): Promise<void> {
        const listingItem: resources.ListingItem = await this.findOne(id).then(value => value.toJSON());
        await this.listingItemRepo.update(listingItem.id, { removed });
     }

    /**
     * check if object is exist in a array
     * todo: this is utility function, does not belong here
     *
     * @param {string[]} objectArray
     * @param {string} fieldName
     * @param {string | number} value
     * @returns {Promise<any>}
     */
    private async checkExistingObject(objectArray: string[], fieldName: string, value: string | number): Promise<any> {
        return _.find(objectArray, (object) => {
            return ( object[fieldName] === value );
        });
    }

    /**
     * find highest order number from listingItemObjects
     *
     * @param {string[]} listingItemObjects
     * @returns {Promise<any>}
     */
    private async findHighestOrderNumber(listingItemObjects: string[]): Promise<any> {
        const highestOrder = await _.maxBy(listingItemObjects, (itemObject) => {
          return itemObject['order'];
        });
        return highestOrder ? highestOrder['order'] : 0;
    }
}
