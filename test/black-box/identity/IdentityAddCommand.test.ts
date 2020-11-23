// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * from 'jest';
import * as resources from 'resources';
import { BlackBoxTestUtil } from '../lib/BlackBoxTestUtil';
import { Commands } from '../../../src/api/commands/CommandEnumType';
import { Logger as LoggerType } from '../../../src/core/Logger';
import { MissingParamException } from '../../../src/api/exceptions/MissingParamException';
import { ModelNotFoundException } from '../../../src/api/exceptions/ModelNotFoundException';
import { InvalidParamException } from '../../../src/api/exceptions/InvalidParamException';
import { MessageException } from '../../../src/api/exceptions/MessageException';
import { IdentityType } from '../../../src/api/enums/IdentityType';


describe('IdentityAddCommand', () => {

    jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.JASMINE_TIMEOUT;

    const log: LoggerType = new LoggerType(__filename);

    const randomBoolean: boolean = Math.random() >= 0.5;
    const testUtil = new BlackBoxTestUtil(randomBoolean ? 0 : 1);

    const identityCommand = Commands.IDENTITY_ROOT.commandName;
    const identityAddCommand = Commands.IDENTITY_ADD.commandName;
    const identityListCommand = Commands.IDENTITY_LIST.commandName;

    let profile: resources.Profile;
    let market: resources.Market;

    let identities: resources.Identity[];
    let identity: resources.Identity;

    beforeAll(async () => {
        await testUtil.cleanDb();

        profile = await testUtil.getDefaultProfile();
        expect(profile.id).toBeDefined();
        market = await testUtil.getDefaultMarket(profile.id);
        expect(market.id).toBeDefined();

    });


    test('Should have 2 Identities by default, PROFILE and MARKET', async () => {
        const res: any = await testUtil.rpc(identityCommand, [identityListCommand,
            profile.id
        ]);
        res.expectJson();
        res.expectStatusCode(200);

        const results: resources.Identity[] = res.getBody()['result'];

        expect(results).toHaveLength(2);
        expect(results[0].type).toBe(IdentityType.PROFILE);
        expect(results[1].type).toBe(IdentityType.MARKET);
        expect(results[1].Markets).toHaveLength(1);
        expect(results[1].Markets[0].publishAddress).toBe(market.publishAddress);
        expect(results[1].Profile.id).toBe(profile.id);

        identities = results;
    });


    test('Should fail because missing profileId', async () => {
        const res: any = await testUtil.rpc(identityCommand, [identityAddCommand]);
        res.expectJson();
        res.expectStatusCode(404);
        expect(res.error.error.message).toBe(new MissingParamException('profileId').getMessage());
    });

    test('Should fail because missing name', async () => {
        const res: any = await testUtil.rpc(identityCommand, [identityAddCommand,
            profile.id
        ]);
        res.expectJson();
        res.expectStatusCode(404);
        expect(res.error.error.message).toBe(new MissingParamException('name').getMessage());
    });

    test('Should fail because invalid profileId', async () => {
        const res: any = await testUtil.rpc(identityCommand, [identityAddCommand,
            true,
            'name'
        ]);
        res.expectJson();
        res.expectStatusCode(400);
        expect(res.error.error.message).toBe(new InvalidParamException('profileId', 'number').getMessage());
    });


    test('Should fail because invalid name', async () => {
        const res: any = await testUtil.rpc(identityCommand, [identityAddCommand,
            profile.id,
            true
        ]);
        res.expectJson();
        res.expectStatusCode(400);
        expect(res.error.error.message).toBe(new InvalidParamException('name', 'string').getMessage());
    });


    test('Should fail because Profile not found', async () => {
        const res: any = await testUtil.rpc(identityCommand, [identityAddCommand,
            0,
            'particl-market'
        ]);
        res.expectJson();
        res.expectStatusCode(404);
        expect(res.error.error.message).toBe(new ModelNotFoundException('Profile').getMessage());
    });


    test('Should fail because duplicate name', async () => {
        const res: any = await testUtil.rpc(identityCommand, [identityAddCommand,
            profile.id,
            'particl-market'
        ]);
        res.expectJson();
        res.expectStatusCode(404);
        expect(res.error.error.message).toBe(new MessageException('Identity with the name already exists.').getMessage());
    });


    test('Should add a new Market Identity for Profile', async () => {
        const res: any = await testUtil.rpc(identityCommand, [identityAddCommand,
            profile.id,
            'name'
        ]);
        res.expectJson();
        res.expectStatusCode(200);
        const result: resources.Identity = res.getBody()['result'];
        expect(result.name).toBe('name');
        expect(result.address).not.toBe(identities[1].address);

        identity = result;
    });


    test('Should list all 3 Identities', async () => {
        const res: any = await testUtil.rpc(identityCommand, [identityListCommand,
            profile.id
        ]);
        res.expectJson();
        res.expectStatusCode(200);

        const results: resources.Identity[] = res.getBody()['result'];
        log.debug('results:', JSON.stringify(results, null, 2));
        expect(results).toHaveLength(3);
        expect(results[1].address).not.toBe(identity.address);
        expect(results[2].address).toBe(identity.address);

        log.debug('results[1].address:', results[1].address);
        log.debug('results[2].address:', results[2].address);
    });


});
