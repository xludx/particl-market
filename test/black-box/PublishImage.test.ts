// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * from 'jest';
import * as resources from 'resources';
import { api } from './lib/api';
import { BlackBoxTestUtil } from './lib/BlackBoxTestUtil';
import { CreatableModel } from '../../src/api/enums/CreatableModel';
import { ImageProcessing } from '../../src/core/helpers/ImageProcessing';
import { Logger as LoggerType } from '../../src/core/Logger';
import { GenerateListingItemTemplateParams } from '../../src/api/requests/testdata/GenerateListingItemTemplateParams';
import { ImageVersions } from '../../src/core/helpers/ImageVersionEnumType';
import {ApiResponseTest} from "./lib/ApiResponseTest";

describe('/images', () => {

    jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.JASMINE_TIMEOUT;

    const log: LoggerType = new LoggerType(__filename);

    const randomBoolean: boolean = Math.random() >= 0.5;
    const testUtil = new BlackBoxTestUtil(randomBoolean ? 0 : 1);
    const testUtilBuyerNode = new BlackBoxTestUtil(randomBoolean ? 1 : 0);

    let market: resources.Market;
    let profile: resources.Profile;

    let listingItemTemplate: resources.ListingItemTemplate;
    const httpOptions = {
        host: 'http://' + process.env.RPCHOSTNAME,
        port: 45592
    };

    beforeAll(async () => {
        await testUtil.cleanDb();

        profile = await testUtil.getDefaultProfile();
        expect(profile.id).toBeDefined();
        market = await testUtil.getDefaultMarket(profile.id);
        expect(market.id).toBeDefined();

        // generate ListingItemTemplate
        const generateListingItemTemplateParams = new GenerateListingItemTemplateParams([
            true,   // generateItemInformation
            true,   // generateItemLocation
            true,   // generateShippingDestinations
            true,   // generateImages
            true,   // generatePaymentInformation
            true,   // generateEscrow
            true,   // generateItemPrice
            true,   // generateMessagingInformation
            false,  // generateListingItemObjects
            false,  // generateObjectDatas
            profile.id, // profileId
            false,   // generateListingItem
            market.id  // marketId
        ]).toParamsArray();

        const listingItemTemplates = await testUtil.generateData(
            CreatableModel.LISTINGITEMTEMPLATE, // what to generate
            1,                          // how many to generate
            true,                    // return model
            generateListingItemTemplateParams   // what kind of data to generate
        ) as resources.ListingItemTemplate[];
        listingItemTemplate = listingItemTemplates[0];

    });

    test('GET  /images/:itemImageId/:imageVersion        Should load Image, version: LARGE', async () => {
        const itemImageId = listingItemTemplate.ItemInformation.Images[0].id;
        const imageVersion = ImageVersions.LARGE.propName;
        const res: ApiResponseTest = await api('GET', `/api/images/${itemImageId}/${imageVersion}`, httpOptions);

        res.expectStatusCode(200);
    });

    test('GET  /images/:itemImageId/:imageVersion        Should load Image, version: MEDIUM', async () => {
        const itemImageId = listingItemTemplate.ItemInformation.Images[0].id;
        const imageVersion = ImageVersions.MEDIUM.propName;
        log.debug('call:' + `/api/images/${itemImageId}/${imageVersion}`);
        const res: ApiResponseTest = await api('GET', `/api/images/${itemImageId}/${imageVersion}`, httpOptions);
        res.expectStatusCode(200);
    });

    test('GET  /images/:itemImageId/:imageVersion        Should load Image, version: THUMBNAIL', async () => {
        const itemImageId = listingItemTemplate.ItemInformation.Images[0].id;
        const imageVersion = ImageVersions.THUMBNAIL.propName;
        log.debug('call:' + `/api/images/${itemImageId}/${imageVersion}`);
        const res: ApiResponseTest = await api('GET', `/api/images/${itemImageId}/${imageVersion}`, httpOptions);
        res.expectStatusCode(200);
    });

    test('GET  /images/:itemImageId/:imageVersion        Should load Image, version: ORIGINAL', async () => {
        const itemImageId = listingItemTemplate.ItemInformation.Images[0].id;
        const imageVersion = ImageVersions.ORIGINAL.propName;
        log.debug('call:' + `/api/images/${itemImageId}/${imageVersion}`);
        const res: ApiResponseTest = await api('GET', `/api/images/${itemImageId}/${imageVersion}`, httpOptions);
        res.expectStatusCode(200);
    });

    test('GET  /images/:itemImageId/:imageVersion        Should fail to load Image because of invalid itemImageId', async () => {
        const itemImageId = 0;
        const imageVersion = ImageVersions.LARGE.propName;
        log.debug('call:' + `/api/images/${itemImageId}/${imageVersion}`);
        const res: ApiResponseTest = await api('GET', `/api/images/${itemImageId}/${imageVersion}`, httpOptions);
        res.expectStatusCode(404);
        expect(res.error.error.message).toBe('Entity with identifier ' + itemImageId + ' does not exist');
    });

    test('GET  /images/:itemImageId/:imageVersion        Should fail to load Image because of invalid imageVersion', async () => {
        const itemImageId = listingItemTemplate.ItemInformation.Images[0].id;
        const imageVersion = 'INVALID_IMAGE:VERSION';
        const res: ApiResponseTest = await api('GET', `/api/images/${itemImageId}/${imageVersion}`, httpOptions);
        res.expectStatusCode(404);
        expect(res.error.error.message).toBe('Image not found!');
    });

    test('POST  /images/template/:listingItemTemplateId        Should POST new Image', async () => {
        // expect.assertions(14); // 2 [basic expects] + 4 [image types] * 3 [expects in the loop]

        const auth = 'Basic ' + Buffer.from(process.env.RPCUSER + ':' + process.env.RPCPASSWORD).toString('base64');
        const res: ApiResponseTest = await api('POST', `/api/images/template/${listingItemTemplate.id}`, {
            host: httpOptions.host,
            port: httpOptions.port,
            headers: {
                'Authorization': auth,
                'Content-Type': 'multipart/form-data'
            },
            formData: {
                image: {
                    options: {
                        filename: 'image.jpg',
                        contentType: 'image/jpeg'
                    },
                    value: Buffer.from(ImageProcessing.milkcatSmall, 'base64')
                }
            }
        });

        res.expectStatusCode(200);
        const result: resources.Image[] = res.getBody();

        // log.debug('result:', JSON.stringify(result));
        expect(result).toBeDefined();

        // For each created image fetch it and check everything matches
        // (except the image data itself because that's modified during the storage process and therefore difficult to validate)
        for (const itemImage of result) {
            for (const itemImageData of itemImage.ImageDatas) {

                const imageRes = await api('GET', `/api/images/${itemImage.id}/${itemImageData.imageVersion}`);
                imageRes.expectStatusCode(200);
                expect(imageRes.res).toBeDefined();
                expect(imageRes.res.body).toBeDefined();
            }
        }
    });

    test('POST  /images/template/:listingItemTemplateId        Should POST two new Images at the same time', async () => {
        // expect.assertions(26); // 2 [basic expects] + 2 [images] * 4 [image types] * 3 [expects in the loop]

        const auth = 'Basic ' + Buffer.from(process.env.RPCUSER + ':' + process.env.RPCPASSWORD).toString('base64');
        const res: ApiResponseTest = await api('POST', `/api/images/template/${listingItemTemplate.id}`, {
            host: httpOptions.host,
            port: httpOptions.port,
            headers: {
                'Authorization': auth,
                'Content-Type': 'multipart/form-data'
            },
            formData: {
                imageW: {
                    options: {
                        filename: 'imageW.jpg',
                        contentType: 'image/jpeg'
                    },
                    value: Buffer.from(ImageProcessing.milkcatWide, 'base64')
                },
                imageT: {
                    options: {
                        filename: 'imageT.jpg',
                        contentType: 'image/jpeg'
                    },
                    value: Buffer.from(ImageProcessing.milkcatTall, 'base64')
                }
            }
        });

        res.expectStatusCode(200);

        const result: resources.Image[] = res.getBody();
        expect(result).toBeDefined();

        // For each created image fetch it and check everything matches
        // (except the image data itself because that's modified during the storage process and therefore difficult to validate)
        for (const itemImage of result) {
            for (const itemImageData of itemImage.ImageDatas) {

                const imageRes = await api('GET', `/api/images/${itemImage.id}/${itemImageData.imageVersion}`);
                imageRes.expectStatusCode(200);
                expect(imageRes.res).toBeDefined();
                expect(imageRes.res.body).toBeDefined();
            }
        }
    });

});
