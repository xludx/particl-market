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
import { MessageException } from '../../exceptions/MessageException';
import { ListingItemTemplate } from '../../models/ListingItemTemplate';
import { ListingItemTemplateRepository } from '../../repositories/ListingItemTemplateRepository';
import { ListingItemTemplateSearchParams } from '../../requests/search/ListingItemTemplateSearchParams';
import { ListingItemTemplateCreateRequest } from '../../requests/model/ListingItemTemplateCreateRequest';
import { ListingItemTemplateUpdateRequest } from '../../requests/model/ListingItemTemplateUpdateRequest';
import { ItemInformationCreateRequest } from '../../requests/model/ItemInformationCreateRequest';
import { ItemInformationUpdateRequest } from '../../requests/model/ItemInformationUpdateRequest';
import { PaymentInformationCreateRequest } from '../../requests/model/PaymentInformationCreateRequest';
import { PaymentInformationUpdateRequest } from '../../requests/model/PaymentInformationUpdateRequest';
import { MessagingInformationCreateRequest } from '../../requests/model/MessagingInformationCreateRequest';
import { MessagingInformationUpdateRequest } from '../../requests/model/MessagingInformationUpdateRequest';
import { ListingItemObjectCreateRequest } from '../../requests/model/ListingItemObjectCreateRequest';
import { ListingItemObjectUpdateRequest } from '../../requests/model/ListingItemObjectUpdateRequest';
import { ImageVersions } from '../../../core/helpers/ImageVersionEnumType';
import { ImageProcessing } from '../../../core/helpers/ImageProcessing';
import { ListingItemFactory } from '../../factories/model/ListingItemFactory';
import { ImageDataFactory } from '../../factories/model/ImageDataFactory';
import { Image } from '../../models/Image';
import { ItemInformationService } from './ItemInformationService';
import { ImageDataService } from './ImageDataService';
import { ImageService } from './ImageService';
import { PaymentInformationService } from './PaymentInformationService';
import { MessagingInformationService } from './MessagingInformationService';
import { ListingItemObjectService } from './ListingItemObjectService';
import { ModelNotModifiableException } from '../../exceptions/ModelNotModifiableException';
import { ShippingPriceCreateRequest } from '../../requests/model/ShippingPriceCreateRequest';
import { ItemPriceCreateRequest } from '../../requests/model/ItemPriceCreateRequest';
import { EscrowRatioCreateRequest } from '../../requests/model/EscrowRatioCreateRequest';
import { EscrowCreateRequest } from '../../requests/model/EscrowCreateRequest';
import { ShippingDestinationCreateRequest } from '../../requests/model/ShippingDestinationCreateRequest';
import { ImageCreateRequest } from '../../requests/model/ImageCreateRequest';
import { ItemLocationCreateRequest } from '../../requests/model/ItemLocationCreateRequest';
import { LocationMarkerCreateRequest } from '../../requests/model/LocationMarkerCreateRequest';
import { ListingItemObjectDataCreateRequest } from '../../requests/model/ListingItemObjectDataCreateRequest';
import { MessagingInformation } from '../../models/MessagingInformation';
import { ImageFactory } from '../../factories/model/ImageFactory';
import { ImageCreateParams } from '../../factories/ModelCreateParams';
import { BaseImageAddMessage } from '../../messages/action/BaseImageAddMessage';
import { DSN, ProtocolDSN } from 'omp-lib/dist/interfaces/dsn';
import { HashMismatchException } from '../../exceptions/HashMismatchException';
import { CoreMessageVersion } from '../../enums/CoreMessageVersion';
import { ModelServiceInterface } from '../ModelServiceInterface';
import { CryptocurrencyAddressCreateRequest } from '../../requests/model/CryptocurrencyAddressCreateRequest';
import { EscrowType } from 'omp-lib/dist/interfaces/omp-enums';
import { CryptoAddress, CryptoAddressType } from 'omp-lib/dist/interfaces/crypto';
import { NotImplementedException } from '../../exceptions/NotImplementedException';
import { CryptocurrencyAddressService } from './CryptocurrencyAddressService';
import { ItemPriceService } from './ItemPriceService';
import { CoreRpcService } from '../CoreRpcService';


export class ListingItemTemplateService implements ModelServiceInterface<ListingItemTemplate> {

    // todo: move elsewhere?
    private static IMG_BOUNDING_WIDTH = 600;
    private static IMG_BOUNDING_HEIGHT = 600;

    public log: LoggerType;

    constructor(
        @inject(Types.Repository) @named(Targets.Repository.ListingItemTemplateRepository) public listingItemTemplateRepo: ListingItemTemplateRepository,
        @inject(Types.Service) @named(Targets.Service.model.ItemInformationService) public itemInformationService: ItemInformationService,
        @inject(Types.Service) @named(Targets.Service.model.ImageDataService) public imageDataService: ImageDataService,
        @inject(Types.Service) @named(Targets.Service.model.ImageService) public imageService: ImageService,
        @inject(Types.Service) @named(Targets.Service.model.PaymentInformationService) public paymentInformationService: PaymentInformationService,
        @inject(Types.Service) @named(Targets.Service.model.MessagingInformationService) public messagingInformationService: MessagingInformationService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemObjectService) public listingItemObjectService: ListingItemObjectService,
        @inject(Types.Service) @named(Targets.Service.model.CryptocurrencyAddressService) public cryptocurrencyAddressService: CryptocurrencyAddressService,
        @inject(Types.Service) @named(Targets.Service.model.ItemPriceService) public itemPriceService: ItemPriceService,
        @inject(Types.Service) @named(Targets.Service.CoreRpcService) public coreRpcService: CoreRpcService,
        @inject(Types.Factory) @named(Targets.Factory.model.ListingItemFactory) public listingItemFactory: ListingItemFactory,
        @inject(Types.Factory) @named(Targets.Factory.model.ImageDataFactory) public imageDataFactory: ImageDataFactory,
        @inject(Types.Factory) @named(Targets.Factory.model.ImageFactory) public imageFactory: ImageFactory,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
    }

    public async findAll(): Promise<Bookshelf.Collection<ListingItemTemplate>> {
        return this.listingItemTemplateRepo.findAll();
    }

    public async findOne(id: number, withRelated: boolean = true): Promise<ListingItemTemplate> {
        const listingItemTemplate = await this.listingItemTemplateRepo.findOne(id, withRelated);
        if (listingItemTemplate === null) {
            this.log.warn(`ListingItemTemplate with the id=${id} was not found!`);
            throw new NotFoundException(id);
        }
        return listingItemTemplate;
    }

    /**
     *
     * @param {string} hash
     * @param {boolean} withRelated
     * @returns {Promise<ListingItemTemplate>}
     */
    public async findOneByHash(hash: string, withRelated: boolean = true): Promise<ListingItemTemplate> {
        const listingItemTemplate = await this.listingItemTemplateRepo.findOneByHash(hash, withRelated);
        if (listingItemTemplate === null) {
            this.log.warn(`ListingItemTemplate with the hash=${hash} was not found!`);
            throw new NotFoundException(hash);
        }
        return listingItemTemplate;
    }

    /**
     * TODO: test
     * @param templateId
     * @param market
     */
    public async findLatestByParentTemplateAndMarket(templateId: number, market: string): Promise<ListingItemTemplate> {
        const listingItemTemplate = await this.listingItemTemplateRepo.findLatestByParentTemplateAndMarket(templateId, market);
        if (listingItemTemplate === null) {
            this.log.warn(`ListingItemTemplate with the templateId=${templateId} and market=${market} was not found!`);
            throw new NotFoundException(templateId);
        }
        return listingItemTemplate;
    }

    /**
     * TODO: test
     * @param templateId
     * @param market
     */
    public async findAllVersionsByParentTemplateAndMarket(templateId: number, market: string): Promise<Bookshelf.Collection<ListingItemTemplate>> {
        return await this.listingItemTemplateRepo.findAllVersionsByParentTemplateAndMarket(templateId, market);
    }

    /**
     * searchBy ListingItemTemplates using given ListingItemTemplateSearchParams
     *
     * @param options
     * @returns {Promise<Bookshelf.Collection<ListingItemTemplate>>}
     */
    public async search(options: ListingItemTemplateSearchParams): Promise<Bookshelf.Collection<ListingItemTemplate>> {
        return await this.listingItemTemplateRepo.search(options);
    }

    @validate()
    public async create( @request(ListingItemTemplateCreateRequest) data: ListingItemTemplateCreateRequest): Promise<ListingItemTemplate> {
        const body: ListingItemTemplateCreateRequest = JSON.parse(JSON.stringify(data));
        // this.log.debug('create(), body:', JSON.stringify(body, null, 2));

        const itemInformation = body.itemInformation;
        delete body.itemInformation;
        const paymentInformation = body.paymentInformation;
        delete body.paymentInformation;
        const messagingInformation = body.messagingInformation || [];
        delete body.messagingInformation;
        const listingItemObjects = body.listingItemObjects || [];
        delete body.listingItemObjects;

        const listingItemTemplate: resources.ListingItemTemplate = await this.listingItemTemplateRepo.create(body).then(value => value.toJSON());
        // this.log.debug('create(), listingItemTemplate.id:', listingItemTemplate.id);

        if (!_.isEmpty(itemInformation)) {
            itemInformation.listing_item_template_id = listingItemTemplate.id;
            await this.itemInformationService.create(itemInformation).then(value => value.toJSON());
        }

        if (!_.isEmpty(paymentInformation)) {
            paymentInformation.listing_item_template_id = listingItemTemplate.id;
            await this.paymentInformationService.create(paymentInformation).then(value => value.toJSON());
        }

        if (!_.isEmpty(messagingInformation)) {
            for (const msgInfo of messagingInformation) {
                msgInfo.listing_item_template_id = listingItemTemplate.id;
                await this.messagingInformationService.create(msgInfo).then(value => value.toJSON());
            }
        }

        if (!_.isEmpty(listingItemObjects)) {
            for (const object of listingItemObjects) {
                object.listing_item_template_id = listingItemTemplate.id;
                await this.listingItemObjectService.create(object).then(value => value.toJSON());
            }
        }

        return await this.findOne(listingItemTemplate.id);
    }

    /**
     * clone a ListingItemTemplate
     *
     * @param listingItemTemplate: resources.ListingItemTemplate
     * @param targetParentId
     * @param market: resources.Market
     */
    public async clone(listingItemTemplate: resources.ListingItemTemplate, targetParentId?: number, market?: resources.Market): Promise<ListingItemTemplate> {
        // this.log.debug('clone(), listingItemTemplateId: ' + listingItemTemplate.id + ', targetParentId: '
        //    + targetParentId + ', market: ' + (market ? market.id : undefined));
        this.log.debug('clone(), targetParentId: ', targetParentId);
        const createRequest = await this.getCloneCreateRequest(listingItemTemplate, targetParentId, market);

        listingItemTemplate = await this.create(createRequest).then(value => value.toJSON());

        // at minimum we'd need the messageVersion to create the RESIZED version
        // listingItemTemplate = await this.createResizedTemplateImages(listingItemTemplate, messageVersionToFit,
        //    scalingFraction, qualityFraction, maxIterations).then(value => value.toJSON());

        return await this.findOne(listingItemTemplate.id);
    }

    @validate()
    public async update(id: number, @request(ListingItemTemplateUpdateRequest) data: ListingItemTemplateUpdateRequest): Promise<ListingItemTemplate> {
        const body = JSON.parse(JSON.stringify(data));
        const listingItemTemplate = await this.findOne(id, false);

        if (!_.isEmpty(listingItemTemplate.Hash) || !_.isEmpty(listingItemTemplate.ListingItems)) {
            throw new ModelNotModifiableException('ListingItemTemplate');
        }

        const updatedListingItemTemplate = await this.listingItemTemplateRepo.update(id, listingItemTemplate.toJSON());

        // if the related one exists already, then update. if it doesnt exist, create. and if the related one is missing, then remove.
        const itemInformation: resources.ItemInformation = updatedListingItemTemplate.related('ItemInformation').toJSON()
            || {} as resources.ItemInformation;

        if (!_.isEmpty(body.itemInformation)) {
            // we want to add/update
            if (!_.isEmpty(itemInformation)) {
                // already exists
                const updateRequest: ItemInformationUpdateRequest = body.itemInformation;
                //  updateRequest.listing_item_template_id = id;
                // this.log.debug('updateRequest: ', JSON.stringify(updateRequest, null, 2));
                await this.itemInformationService.update(itemInformation.id, updateRequest);
            } else {
                // doesnt exist
                const createRequest: ItemInformationCreateRequest = body.itemInformation;
                createRequest.listing_item_template_id = id;
                // this.log.debug('createRequest: ', JSON.stringify(createRequest, null, 2));
                await this.itemInformationService.create(createRequest);
            }
        } else if (!_.isEmpty(itemInformation)) {
            // we want to remove
            // already exists
            await this.itemInformationService.destroy(itemInformation.id);
        }

        // if the related one exists already, then update. if it doesnt exist, create. and if the related one is missing, then remove.
        const paymentInformation: resources.PaymentInformation = updatedListingItemTemplate.related('PaymentInformation').toJSON()
            || {} as resources.PaymentInformation;

        if (!_.isEmpty(body.paymentInformation)) {
            // we want to add/update
            if (!_.isEmpty(paymentInformation)) {
                // already exists
                const updateRequest: PaymentInformationUpdateRequest = body.paymentInformation;
                await this.paymentInformationService.update(paymentInformation.id, updateRequest);
            } else {
                // doesnt exist
                const createRequest: PaymentInformationCreateRequest = body.paymentInformation;
                createRequest.listing_item_template_id = id;
                await this.paymentInformationService.create(createRequest);
            }
        } else if (!_.isEmpty(paymentInformation)) {
            // we want to remove
            // already exists
            await this.paymentInformationService.destroy(paymentInformation.id);
        }

        // ---
        const existingMessagingInformations: resources.MessagingInformation[] = updatedListingItemTemplate.related('MessagingInformation').toJSON()
            || [] as resources.MessagingInformation[];
        const newMessagingInformations = body.messagingInformation || [];

        // delete existing MessagingInformation if its not included in the newMessagingInformations
        for (const msgInfo of existingMessagingInformations) {
            // is existing part of new ones?
            const found = await this.checkExistingObjectFieldValueExistsInArray<MessagingInformationUpdateRequest>(
                newMessagingInformations, 'id', msgInfo.id);
            if (_.isEmpty(found)) {
                // not found -> delete
                await this.messagingInformationService.destroy(msgInfo.id);
            }
        }

        // create new or update existing MessagingInformations
        for (const newMsgInfo of newMessagingInformations) {

            if (newMsgInfo.id !== undefined) {
                // id exists -> update
                newMsgInfo.listing_item_template_id = id;
                await this.messagingInformationService.update(newMsgInfo.id, newMsgInfo);
            } else {
                newMsgInfo.listing_item_template_id = id;
                await this.messagingInformationService.create(newMsgInfo);
            }
        }

        // ---
        const existingListingItemObjects: resources.ListingItemObject[] = updatedListingItemTemplate.related('ListingItemObjects').toJSON()
            || [] as resources.ListingItemObject[];
        const newListingItemObjects = body.listingItemObjects || [];

        // delete existing ListingItemObject if its not included in the newListingItemObjects
        for (const liObject of existingListingItemObjects) {
            // is existing part of new ones?
            const found = await this.checkExistingObjectFieldValueExistsInArray<ListingItemObjectUpdateRequest>(
                newListingItemObjects, 'id', liObject.id);
            if (_.isEmpty(found)) {
                // not found -> delete
                await this.listingItemObjectService.destroy(liObject.id);
            }
        }

        // create or update listingItemObjects
        for (const newLiObject of newListingItemObjects) {
            if (newLiObject.id !== undefined) {
                newLiObject.listing_item_template_id = id;
                await this.listingItemObjectService.update(newLiObject.id, newLiObject);
            } else {
                newLiObject.listing_item_template_id = id;
                await this.listingItemObjectService.create(newLiObject as ListingItemObjectCreateRequest);
            }
        }

        // finally find and return the updated listingItem
        return await this.findOne(id);
    }

    public async destroy(id: number): Promise<void> {
        const listingItemTemplate: resources.ListingItemTemplate = await this.findOne(id).then(value => value.toJSON());

        if (!_.isEmpty(listingItemTemplate.ListingItems)) {
            throw new MessageException('ListingItemTemplate has ListingItems.');
        }

        // manually remove images
        if (!_.isEmpty(listingItemTemplate.ItemInformation.Images)) {
            for (const image of listingItemTemplate.ItemInformation.Images) {
                await this.imageService.destroy(image.id);
            }
        }

        this.log.debug('deleting listingItemTemplate:', listingItemTemplate.id);
        await this.listingItemTemplateRepo.destroy(id);
    }

    public async updateHash(id: number, hash: string): Promise<ListingItemTemplate> {
        const listingItemTemplate = await this.findOne(id, false);
        listingItemTemplate.Hash = hash;
        const updated = await this.listingItemTemplateRepo.update(id, listingItemTemplate.toJSON());
        this.log.debug('updated ListingItemTemplate ' + id + ' hash to: ' + updated.Hash);
        return updated;
    }

    /**
     * update the paymentaddress for the template to one from the given identity
     */
    public async updatePaymentAddress(identity: resources.Identity, listingItemTemplate: resources.ListingItemTemplate):
        Promise<resources.ListingItemTemplate> {

        const paymentAddress: CryptoAddress = await this.generateCryptoAddressForEscrowType(identity, listingItemTemplate.PaymentInformation.Escrow.type);
        const cryptocurrencyAddress: resources.CryptocurrencyAddress = await this.cryptocurrencyAddressService.create({
            profile_id: listingItemTemplate.Profile.id,
            type: paymentAddress.type,
            address: paymentAddress.address
        } as CryptocurrencyAddressCreateRequest).then(value => value.toJSON());

        await this.itemPriceService.updatePaymentAddress(listingItemTemplate.PaymentInformation.ItemPrice.id, cryptocurrencyAddress.id);
        return await this.findOne(listingItemTemplate.id).then(updatedTemplate => updatedTemplate.toJSON());
    }

    public async isModifiable(id: number): Promise<boolean> {
        const listingItemTemplate: resources.ListingItemTemplate = await this.findOne(id).then(value => value.toJSON());

        // ListingItemTemplates which have a related ListingItems or ChildListingItems can not be modified
        // const isModifiable = (_.isEmpty(listingItemTemplate.ListingItems) && _.isEmpty(listingItemTemplate.ChildListingItemTemplates));

        // template is modifiable if it hasn't been posted, and it hasnt been posted unless it has a hash
        const isModifiable = _.isNil(listingItemTemplate.hash);

        this.log.debug('isModifiable: ' + isModifiable);
        return isModifiable;
    }

    /**
     * creates resized versions of the ListingItemTemplate Images, so that all of them fit in one smsgmessage
     *
     * message sizes:
     *  SMSG_MAX_MSG_BYTES_PAID: 512 * 1024,
     *  SMSG_MAX_AMSG_BYTES: 512,
     *  SMSG_MAX_MSG_BYTES: 24000
     *
     * @param listingItemTemplate
     * @param messageVersionToFit
     * @param scalingFraction
     * @param qualityFraction
     * @param maxIterations
     * @returns {Promise<ListingItemTemplate>}
     */
    public async createResizedTemplateImages(listingItemTemplate: resources.ListingItemTemplate, messageVersionToFit: CoreMessageVersion,
                                             scalingFraction: number = 0.9, qualityFraction: number = 0.95,
                                             maxIterations: number = 10): Promise<ListingItemTemplate> {

        const images: resources.Image[] = listingItemTemplate.ItemInformation.Images;
        for (const image of images) {
            const updatedImage: resources.Image = await this.imageService.createResizedVersion(image.id, messageVersionToFit, scalingFraction,
                qualityFraction, maxIterations).then(value => value.toJSON());
            // this.log.debug('updatedImage: ', JSON.stringify(updatedImage, null, 2));
            // this.log.debug('listingItemTemplate.id: ', JSON.stringify(listingItemTemplate.id, null, 2));
        }
        return await this.findOne(listingItemTemplate.id);
    }

    /**
     * sets the featured image for the ListingItemTemlate
     *
     * @param listingItemTemplate
     * @param imageId
     *
     */
    public async setFeaturedImage(listingItemTemplate: resources.ListingItemTemplate, imageId: number): Promise<Image> {
        if (!_.isEmpty(listingItemTemplate.ItemInformation.Images)) {

            for (const image of listingItemTemplate.ItemInformation.Images) {
                const featured = image.id === imageId;
                await this.imageService.updateFeatured(image.id, featured);
            }
            return await this.imageService.findOne(imageId);
        } else {
            this.log.error('ListingItemTemplate has no Images.');
            throw new MessageException('ListingItemTemplate has no Images.');
        }
    }

    private async generateCryptoAddressForEscrowType(identity: resources.Identity, type: EscrowType): Promise<CryptoAddress> {
        let cryptoAddress: CryptoAddress;
        switch (type) {
            case EscrowType.MULTISIG:
                const address = await this.coreRpcService.getNewAddress(identity.wallet);
                cryptoAddress = {
                    address,
                    type: CryptoAddressType.NORMAL
                };
                break;
            case EscrowType.MAD_CT:
                cryptoAddress = await this.coreRpcService.getNewStealthAddress(identity.wallet);
                break;
            case EscrowType.MAD:
            case EscrowType.FE:
            default:
                throw new NotImplementedException();
        }
        return cryptoAddress;
    }

    private async checkExistingObjectFieldValueExistsInArray<T>(objectArray: T[], fieldName: string, value: string | number): Promise<T | undefined> {
        return _.find<T>(objectArray, (object) => {
            return (object[fieldName] === value);
        });
    }

    // find highest order number from listingItemObjects
    private async findHighestOrderNumber(listingItemObjects: resources.ListingItemObject[]): Promise<number> {
        const highestOrder = await _.maxBy(listingItemObjects, (itemObject) => {
            return itemObject['order'];
        });
        return highestOrder ? highestOrder['order'] : 0;
    }

    /**
     *  Reads ORIGINAL version of an image from file (throws exception if file cannot be read), resizes and reduces quality,
     *  returning the modified image value.
     *
     * @param {string} imageHash
     * @param {boolean} qualityFactor
     * @returns {Promise<string>}
     */
    private async getResizedImage(imageHash: string, qualityFactor: number): Promise<string> {
        if (qualityFactor <= 0) {
            return '';
        }
        const originalImage = await this.imageDataService.loadImageFile(imageHash, ImageVersions.ORIGINAL.propName);

        let compressedImage = await ImageProcessing.resizeImageToFit(
            originalImage,
            ListingItemTemplateService.IMG_BOUNDING_WIDTH,
            ListingItemTemplateService.IMG_BOUNDING_HEIGHT
        );
        compressedImage = await ImageProcessing.downgradeQuality(
            compressedImage,
            qualityFactor
        );
        return compressedImage;
    }

    /**
     *
     * @param templateToClone
     * @param targetParentId
     * @param targetMarket
     */
    private async getCloneCreateRequest(templateToClone: resources.ListingItemTemplate, targetParentId?: number, targetMarket?: resources.Market):
        Promise<ListingItemTemplateCreateRequest> {

        let shippingDestinations: ShippingDestinationCreateRequest[] = [];

        if (!_.isEmpty(templateToClone.ItemInformation.ShippingDestinations)) {
            shippingDestinations = _.map(templateToClone.ItemInformation.ShippingDestinations, (destination) => {
                return _.assign({} as ShippingDestinationCreateRequest, {
                    country: destination.country,
                    shippingAvailability: destination.shippingAvailability
                });
            });
        }

        let images: ImageCreateRequest[] = [];
        if (!_.isEmpty(templateToClone.ItemInformation.Images)) {

            images = await Promise.all(_.map(templateToClone.ItemInformation.Images, async (image) => {

                // for each image, get the data from ORIGINAL and create a new ImageCreateRequest based on that data
                // the other image versions will be created later
                const imageDataOriginal: resources.ImageData = _.find(image.ImageDatas, (imageData) => {
                    return imageData.imageVersion === ImageVersions.ORIGINAL.propName;
                })!;

                // try to load data, if it exists.
                const data = await this.imageDataService.loadImageFile(image.hash, ImageVersions.ORIGINAL.propName)
                    .then(value => value)
                    .catch(reason => undefined);
                imageDataOriginal.data = data ? data : imageDataOriginal.data;

                // this.log.debug('imageDataOriginal: ', JSON.stringify(imageDataOriginal, null, 2));

                const imageCreateRequest: ImageCreateRequest = await this.imageFactory.get({
                    actionMessage: {
                        hash: image.hash,
                        data: [{
                            protocol: ProtocolDSN.FILE,
                            dataId: imageDataOriginal.dataId,
                            encoding: imageDataOriginal.encoding,
                            data: imageDataOriginal.data
                        }] as DSN[],
                        generated: Date.now(),
                        featured: image.featured
                    } as BaseImageAddMessage
                } as ImageCreateParams);

                if (image.hash !== imageCreateRequest.hash) {
                    const exception = new HashMismatchException('ImageCreateRequest', image.hash, imageCreateRequest.hash);
                    this.log.error(exception.getMessage());
                    throw exception;
                }
                return imageCreateRequest;
            }));
        }

        let messagingInformation: MessagingInformationCreateRequest[] = [];
        if (!_.isEmpty(templateToClone.MessagingInformation)) {
            messagingInformation = _.map(templateToClone.MessagingInformation, (msgInfo) => {
                return _.assign({} as MessagingInformationCreateRequest, {
                    protocol: msgInfo.protocol,
                    publicKey: msgInfo.publicKey
                });
            });
        }

        let listingItemObjects: ListingItemObjectCreateRequest[] = [];
        if (!_.isEmpty(templateToClone.MessagingInformation)) {
            listingItemObjects = _.map(templateToClone.ListingItemObjects, (liObject) => {
                // this.log.debug('liObject.ListingItemObjectDatas: ', JSON.stringify(liObject.ListingItemObjectDatas, null, 2));
                const listingItemObjectDatas: ListingItemObjectDataCreateRequest[] = _.map(liObject.ListingItemObjectDatas, (liObjectData) => {
                    // this.log.debug('liObjectData: ', JSON.stringify(liObjectData, null, 2));
                    return _.assign({} as ListingItemObjectCreateRequest, {
                        key: liObjectData.key,
                        value: liObjectData.value
                    } as ListingItemObjectDataCreateRequest);
                });
                // this.log.debug('listingItemObjectDatas: ', JSON.stringify(listingItemObjectDatas, null, 2));

                return _.assign({} as ListingItemObjectCreateRequest, {
                    type: liObject.type,
                    description: liObject.description,
                    order: liObject.order,
                    listingItemObjectDatas
                } as ListingItemObjectCreateRequest);
            });
            // this.log.debug('listingItemObjects: ', JSON.stringify(listingItemObjects, null, 2));
        }

        return {
            parent_listing_item_template_id: targetParentId,
            profile_id: templateToClone.Profile.id,
            market: targetMarket ? targetMarket.receiveAddress : undefined,
            generatedAt: +Date.now(),
            itemInformation: templateToClone.ItemInformation
                ? {
                    title: templateToClone.ItemInformation.title,
                    shortDescription: templateToClone.ItemInformation.shortDescription,
                    longDescription: templateToClone.ItemInformation.longDescription,
                    // for now, we are not cloning the categories
                    // item_category_id: templateToClone.ItemInformation.ItemCategory ? templateToClone.ItemInformation.ItemCategory.id : undefined,
                    shippingDestinations,
                    images,
                    itemLocation: templateToClone.ItemInformation.ItemLocation
                        ? {
                            country: templateToClone.ItemInformation.ItemLocation.country,
                            address: templateToClone.ItemInformation.ItemLocation.address,
                            description: templateToClone.ItemInformation.ItemLocation.description,
                            locationMarker: templateToClone.ItemInformation.ItemLocation.LocationMarker
                                ? {
                                    lat: templateToClone.ItemInformation.ItemLocation.LocationMarker.lat,
                                    lng: templateToClone.ItemInformation.ItemLocation.LocationMarker.lng,
                                    title: templateToClone.ItemInformation.ItemLocation.LocationMarker.title,
                                    description: templateToClone.ItemInformation.ItemLocation.LocationMarker.description
                                } as LocationMarkerCreateRequest
                                : undefined
                        } as ItemLocationCreateRequest
                        : undefined
                } as ItemInformationCreateRequest
                : undefined,
            paymentInformation: templateToClone.PaymentInformation
                ? {
                    type: templateToClone.PaymentInformation.type,
                    itemPrice: templateToClone.PaymentInformation.ItemPrice
                        ? {
                            currency: templateToClone.PaymentInformation.ItemPrice.currency,
                            basePrice: templateToClone.PaymentInformation.ItemPrice.basePrice,
                            shippingPrice: templateToClone.PaymentInformation.ItemPrice.ShippingPrice
                                ? {
                                    domestic: templateToClone.PaymentInformation.ItemPrice.ShippingPrice.domestic,
                                    international: templateToClone.PaymentInformation.ItemPrice.ShippingPrice.international
                                } as ShippingPriceCreateRequest
                                : undefined
                        } as ItemPriceCreateRequest
                        : undefined,
                    escrow: templateToClone.PaymentInformation.Escrow
                        ? {
                            type: templateToClone.PaymentInformation.Escrow.type,
                            releaseType: templateToClone.PaymentInformation.Escrow.releaseType,
                            secondsToLock: templateToClone.PaymentInformation.Escrow.secondsToLock
                                ? templateToClone.PaymentInformation.Escrow.secondsToLock
                                : undefined,
                            ratio: templateToClone.PaymentInformation.Escrow.Ratio
                                ? {
                                    buyer: templateToClone.PaymentInformation.Escrow.Ratio.buyer,
                                    seller: templateToClone.PaymentInformation.Escrow.Ratio.seller
                                } as EscrowRatioCreateRequest
                                : undefined
                        } as EscrowCreateRequest
                        : undefined
                } as PaymentInformationCreateRequest
                : undefined,
            messagingInformation,
            listingItemObjects
        } as ListingItemTemplateCreateRequest;
    }

}
