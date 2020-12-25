// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { RpcRequest } from '../../requests/RpcRequest';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { Commands} from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { CommandParamValidationRules, IdValidationRule, NumberValidationRule, ParamValidationRule } from '../CommandParamValidation';
import * as Faker from 'faker';
import { MarketType } from '../../enums/MarketType';
import { MarketService } from '../../services/model/MarketService';
import { ItemCategoryService } from '../../services/model/ItemCategoryService';
import { TestDataService } from '../../services/TestDataService';
import { ListingItemTemplatePostCommand } from '../listingitemtemplate/ListingItemTemplatePostCommand';
import { Cryptocurrency, OutputType } from 'omp-lib/dist/interfaces/crypto';
import { ListingItemTemplateCreateRequest } from '../../requests/model/ListingItemTemplateCreateRequest';
import { ImageCreateParams, ListingItemTemplateCreateParams } from '../../factories/ModelCreateParams';
import { ListingItemTemplateFactory } from '../../factories/model/ListingItemTemplateFactory';
import { EscrowReleaseType, EscrowType, SaleType } from 'omp-lib/dist/interfaces/omp-enums';
import { toSatoshis } from 'omp-lib/dist/util';
import { ListingItemTemplateService } from '../../services/model/ListingItemTemplateService';
import { ItemCategoryUpdateRequest } from '../../requests/model/ItemCategoryUpdateRequest';
import { ItemInformationUpdateRequest } from '../../requests/model/ItemInformationUpdateRequest';
import { ItemInformationService } from '../../services/model/ItemInformationService';
import { CoreRpcService } from '../../services/CoreRpcService';
import { ImageCreateRequest } from '../../requests/model/ImageCreateRequest';
import { DSN, ProtocolDSN } from 'omp-lib/dist/interfaces/dsn';
import { BaseImageAddMessage } from '../../messages/action/BaseImageAddMessage';
import { ImageFactory } from '../../factories/model/ImageFactory';
import { ImageService } from '../../services/model/ImageService';
import { CoreMessageVersion } from '../../enums/CoreMessageVersion';
import PQueue, {DefaultAddOptions, Options} from 'pm-queue';
import PriorityQueue, {PriorityQueueOptions} from 'pm-queue/dist/priority-queue';
import { SmsgSendCoinControl } from '../../services/SmsgService';
import {RpcBlindSendToOutput} from 'omp-lib/dist/interfaces/rpc';

export interface RpcInput {
    tx: string;     // txid
    n: number;      // vout
}

export interface RpcTransaction {
    amount: number;
    fee: number;
    confirmations: number;
    trusted: boolean;
    blockhash: string;
    blockindex: number;
    blocktime: number;
    txid: string;
    time: number;
    timereceived: number;
    bip125_replaceable: string;
    details: RpcTransactionDetails[];
    hex: string;
}

export interface RpcTransactionDetails {
    address: string;
    category: string;
    amount: number;
    label: string;
    account: string;
    vout: number;
    fee: number;
    abandoned: boolean;
    confirmations: number;
    trusted: boolean;
    blockhash: string;
    blockindex: number;
    blocktime: number;
    txid: string;
    time: number;
    timereceived: number;
    comment: string;
    bip125_replaceable: string;
}

export class PublishTestDataCommand extends BaseCommand implements RpcCommandInterface<boolean> {

    private queue: PQueue;

    constructor(
        // tslint:disable:max-line-length
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplatePostCommand) private listingItemTemplatePostCommand: ListingItemTemplatePostCommand,
        @inject(Types.Service) @named(Targets.Service.CoreRpcService) public coreRpcService: CoreRpcService,
        @inject(Types.Service) @named(Targets.Service.TestDataService) private testDataService: TestDataService,
        @inject(Types.Service) @named(Targets.Service.model.ItemCategoryService) private itemCategoryService: ItemCategoryService,
        @inject(Types.Service) @named(Targets.Service.model.MarketService) private marketService: MarketService,
        @inject(Types.Service) @named(Targets.Service.model.ItemInformationService) private itemInformationService: ItemInformationService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemTemplateService) private listingItemTemplateService: ListingItemTemplateService,
        @inject(Types.Service) @named(Targets.Service.model.ImageService) private imageService: ImageService,
        @inject(Types.Factory) @named(Targets.Factory.model.ListingItemTemplateFactory) public listingItemTemplateFactory: ListingItemTemplateFactory,
        @inject(Types.Factory) @named(Targets.Factory.model.ImageFactory) public imageFactory: ImageFactory
        // tslint:enable:max-line-length
    ) {
        super(Commands.ADMIN_PUBLISH_TEST_DATA);
        this.log = new Logger(__filename);

        const options = {
            concurrency: 1,             // concurrency limit
            autoStart: true,            // auto-execute tasks as soon as they're added
            throwOnTimeout: false       // throw on timeout
        } as Options<PriorityQueue, PriorityQueueOptions>;

        this.queue = new PQueue(options);
        this.queue
            .on('active', () => {
                // emitted as each item is processed in the queue for the purpose of tracking progress.
                this.log.debug(`POSTQUEUE: queue size: ${this.queue.size}, tasks pending: ${this.queue.pending}`);
            })
            .on('idle', () => {
                // emitted every time the queue becomes empty and all promises have completed
                this.log.debug(`POSTQUEUE: idle. queue size: ${this.queue.size}, tasks pending: ${this.queue.pending}`);
            })
            .on('add', () => {
                // emitted every time the add method is called and the number of pending or queued tasks is increased.
            })
            .on('next', () => {
                // emitted every time a task is completed and the number of pending or queued tasks is decreased.
                this.log.debug(`POSTQUEUE: message posted. queue size: ${this.queue.size}, tasks pending: ${this.queue.pending}`);
            })
            .start();

    }

    public getCommandParamValidationRules(): CommandParamValidationRules {
        return {
            params: [
                new IdValidationRule('marketId', true, this.marketService),
                new NumberValidationRule('count', false, 10)
            ] as ParamValidationRule[]
        } as CommandParamValidationRules;
    }

    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<boolean> {
        const market: resources.Market = data.params[0];
        const count: number = data.params[1];

        let randomCategory: resources.ItemCategory = await this.getRandomCategory(market);

        const createRequest: ListingItemTemplateCreateRequest = await this.listingItemTemplateFactory.get({
            profileId: market.Profile.id,
            title: Faker.random.words(3),
            shortDescription: Faker.lorem.paragraph(1),
            longDescription: Faker.lorem.paragraph(5),
            categoryId: randomCategory.id,
            saleType: SaleType.SALE,
            currency: Cryptocurrency.PART,
            basePrice: toSatoshis(+_.random(0.001, 0.05).toFixed(8)),
            domesticShippingPrice: toSatoshis(+_.random(0.001, 0.05).toFixed(8)),
            internationalShippingPrice: toSatoshis(+_.random(0.001, 0.05).toFixed(8)),
            escrowType: EscrowType.MAD_CT,
            buyerRatio: 100,
            sellerRatio: 100,
            escrowReleaseType: EscrowReleaseType.ANON
        } as ListingItemTemplateCreateParams);

        let i = 0;
        i++;

        this.log.debug('create template: ' + i + '/' + count);
        let baseTemplate: resources.ListingItemTemplate = await this.listingItemTemplateService.create(createRequest).then(value => value.toJSON());
        const randomImageData = await this.testDataService.generateRandomImage(10, 10);

        const imageCreateRequest: ImageCreateRequest = await this.imageFactory.get({
            actionMessage: {
                data: [{
                    protocol: ProtocolDSN.REQUEST,
                    encoding: 'BASE64',
                    data: randomImageData
                }] as DSN[],
                featured: true
            } as BaseImageAddMessage,
            listingItemTemplate: baseTemplate
        } as ImageCreateParams);
        await this.imageService.create(imageCreateRequest).then(value => value.toJSON());

        baseTemplate = await this.listingItemTemplateService.findOne(baseTemplate.id).then(value => value.toJSON());
        baseTemplate = await this.listingItemTemplateService.createResizedTemplateImages(baseTemplate, CoreMessageVersion.FREE,
            0.9, 0.9, 10).then(value => value.toJSON());

        this.log.debug('clone template: ' + i + '/' + count);
        let marketTemplate: resources.ListingItemTemplate = await this.listingItemTemplateService.clone(baseTemplate, baseTemplate.id, market)
            .then(value => value.toJSON());

        marketTemplate = await this.listingItemTemplateService.updatePaymentAddress(market.Identity, marketTemplate);

        randomCategory = await this.getRandomCategory(market);
        await this.itemInformationService.update(marketTemplate.ItemInformation.id, {
            title: Faker.random.words(3) + ' [' + Date.now() + ']',
            shortDescription: Faker.lorem.paragraph(1),
            longDescription: Faker.lorem.paragraph(5),
            itemCategory: {
                key: randomCategory.key
            } as ItemCategoryUpdateRequest
        } as ItemInformationUpdateRequest);

        marketTemplate = await this.listingItemTemplateService.findOne(marketTemplate.id).then(value => value.toJSON());

        // this.log.debug('marketTemplate: ', JSON.stringify(marketTemplate, null, 2));
        // 0.00119444

        this.log.debug('post template: ' + i + '/' + count);
        await this.listingItemTemplatePostCommand.execute({
            id: i,
            jsonrpc: '2.0',
            method: 'templatepost',
            params: [
                marketTemplate,     // listingItemTemplate: resources.ListingItemTemplate
                1,                  // daysRetention
                false,              // estimateFee
                false,              // paidImageMessages
                market,             // market: resources.Market
                false               // anonFee: boolean
            ]
        } as RpcRequest);

        const changeAddress = await this.coreRpcService.getNewAddress(market.Identity.wallet);
        const chunkSize = 100;
        const countArray = [...Array(count).keys()];            // [0, 1, 2, ...]
        const chunkedArray = _.chunk(countArray, chunkSize);      // [[0->99], [100->199], ...]

        for (const chunk of chunkedArray) {
            const inputs: RpcInput[] = await this.getInputs(market.Identity.wallet, chunk);
            for (const input of inputs) {
                i++;
                this.queue.add(() => this.cloneAndPost(marketTemplate, market, changeAddress, input.tx, input.n, i), {
                    concurrency: 1
                    // interval: 60 * 1000,
                    // intervalCap: 15
                } as DefaultAddOptions);
            }
        }
        return true;
    }

    public async validate(data: RpcRequest): Promise<RpcRequest> {
        await super.validate(data);
        return data;
    }

    public usage(): string {
        return this.getName() + '';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n';
    }

    public description(): string {
        return '';
    }

    public example(): string {
        return 'admin ' + this.getName();
    }

    public async getRandomCategory(market: resources.Market): Promise<resources.ItemCategory> {
        const rootCategory: resources.ItemCategory = (market && market.type !== MarketType.MARKETPLACE)
            ? await this.itemCategoryService.findRoot(market.receiveAddress).then(value => value.toJSON())
            : await this.itemCategoryService.findDefaultRoot().then(value => value.toJSON());

        const childCat: resources.ItemCategory = rootCategory.ChildItemCategories.length > 0
            ? Faker.random.arrayElement(rootCategory.ChildItemCategories)
            : rootCategory;

        return childCat.ChildItemCategories.length > 0
            ? Faker.random.arrayElement(childCat.ChildItemCategories)
            : childCat;
    }

    private async getInputs(walletFrom: string, chunk: number[]): Promise<RpcInput[]> {
        const address = await this.coreRpcService.getNewAddress(walletFrom);
        const outputs: RpcBlindSendToOutput[] = [];
        for (const index of chunk) {
            outputs.push({
                address,
                amount: 0.003
            } as RpcBlindSendToOutput);
        }
        const txid = await this.coreRpcService.sendTypeTo(walletFrom, OutputType.PART, OutputType.PART, outputs, false);
        const transaction: RpcTransaction = await this.coreRpcService.getTransaction(walletFrom, txid, false, true);
        const txDetails: RpcTransactionDetails[] = _.filter(transaction.details, detail => detail.category === 'receive');
        return _.map(txDetails, txDetail => {
            return {
                tx: txid,
                n: txDetail.vout
            } as RpcInput;
        });
    }

    private async cloneAndPost(marketTemplate: resources.ListingItemTemplate, market: resources.Market,
                               changeAddress: string, tx: string, n: number, i: number): Promise<void> {

        const coinControl = {
            changeaddress: changeAddress,
            inputs: [{
                tx,
                n
            }] as RpcInput[]
        } as SmsgSendCoinControl;

        marketTemplate = await this.listingItemTemplateService.clone(marketTemplate).then(value => value.toJSON());

        const randomCategory = await this.getRandomCategory(market);
        await this.itemInformationService.update(marketTemplate.ItemInformation.id, {
            title: Faker.random.words(3) + ' [' + marketTemplate.id + ']',
            shortDescription: Faker.lorem.paragraph(3),
            longDescription: Faker.lorem.paragraphs(3),
            itemCategory: {
                key: randomCategory.key
            } as ItemCategoryUpdateRequest
        } as ItemInformationUpdateRequest);

        marketTemplate = await this.listingItemTemplateService.updatePaymentAddress(market.Identity, marketTemplate);
        marketTemplate = await this.listingItemTemplateService.findOne(marketTemplate.id).then(value => value.toJSON());

        await this.listingItemTemplatePostCommand.execute({
            id: i,
            jsonrpc: '2.0',
            method: 'templatepost',
            params: [
                marketTemplate,     // listingItemTemplate: resources.ListingItemTemplate
                1,                  // daysRetention
                false,              // estimateFee
                false,              // paidImageMessages
                market,             // market: resources.Market
                false,              // anonFee: boolean
                undefined,          // ringSize: number
                coinControl         // SmsgSendCoinControl
            ]
        } as RpcRequest);
        this.log.debug('===================================================================');
        this.log.debug('coinControl: ', JSON.stringify(coinControl, null, 2));
        this.log.debug('===================================================================');
    }
}
