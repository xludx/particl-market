// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as Bookshelf from 'bookshelf';
import * as path from 'path';
import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { validate, request } from '../../../core/api/Validate';
import { NotFoundException } from '../../exceptions/NotFoundException';
import { IdentityRepository } from '../../repositories/IdentityRepository';
import { Identity } from '../../models/Identity';
import { IdentityCreateRequest } from '../../requests/model/IdentityCreateRequest';
import { IdentityUpdateRequest } from '../../requests/model/IdentityUpdateRequest';
import { SettingService } from './SettingService';
import { IdentityType } from '../../enums/IdentityType';
import { ModelNotFoundException } from '../../exceptions/ModelNotFoundException';
import { RpcExtKey, RpcExtKeyResult, RpcMnemonic, RpcWallet, RpcWalletInfo } from 'omp-lib/dist/interfaces/rpc';
import { MessageException } from '../../exceptions/MessageException';
import { CoreRpcService } from '../CoreRpcService';
import { SmsgService } from '../SmsgService';
import { ShoppingCartCreateRequest } from '../../requests/model/ShoppingCartCreateRequest';
import { ShoppingCartService } from './ShoppingCartService';


export class IdentityService {

    public log: LoggerType;

    constructor(
        @inject(Types.Repository) @named(Targets.Repository.IdentityRepository) public identityRepository: IdentityRepository,
        @inject(Types.Service) @named(Targets.Service.model.SettingService) public settingService: SettingService,
        @inject(Types.Service) @named(Targets.Service.model.ShoppingCartService) public shoppingCartService: ShoppingCartService,
        @inject(Types.Service) @named(Targets.Service.CoreRpcService) public coreRpcService: CoreRpcService,
        @inject(Types.Service) @named(Targets.Service.SmsgService) public smsgService: SmsgService,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
    }

    public async findAll(): Promise<Bookshelf.Collection<Identity>> {
        return this.identityRepository.findAll();
    }

    public async findAllByProfileId(profileId: number, withRelated: boolean = true): Promise<Bookshelf.Collection<Identity>> {
        return await this.identityRepository.findAllByProfileId(profileId, withRelated);
    }

    public async findAllByProfileIdAndName(profileId: number, name: string, withRelated: boolean = true): Promise<Bookshelf.Collection<Identity>> {
        return await this.identityRepository.findAllByProfileIdAndName(profileId, name, withRelated);
    }

    public async findOne(id: number, withRelated: boolean = true): Promise<Identity> {
        const identity = await this.identityRepository.findOne(id, withRelated);
        if (identity === null) {
            this.log.warn(`Identity with the id=${id} was not found!`);
            throw new NotFoundException(id);
        }
        return identity;
    }

    public async findOneByAddress(address: string, withRelated: boolean = true): Promise<Identity> {
        const identity = await this.identityRepository.findOneByAddress(address, withRelated);
        if (identity === null) {
            this.log.warn(`Identity with the address=${address} was not found!`);
            throw new NotFoundException(address);
        }
        return identity;
    }

    public async findProfileIdentity(profileId: number, withRelated: boolean = true): Promise<Identity> {
        const identities: resources.Identity[] = await this.identityRepository.findAllByProfileId(profileId, withRelated).then(value => value.toJSON());
        const identity: resources.Identity | undefined = _.find(identities, p => {
            return p.type === IdentityType.PROFILE;
        });
        if (!identity) {
            this.log.warn(`Profile with the id=${profileId} has no Identity!`);
            throw new ModelNotFoundException('Identity');
        }
        return await this.identityRepository.findOne(identity.id, withRelated);
    }

    @validate()
    public async create( @request(IdentityCreateRequest) data: IdentityCreateRequest): Promise<Identity> {
        const body = JSON.parse(JSON.stringify(data));
        // this.log.debug('create(), body: ', JSON.stringify(body, null, 2));
        const identity: resources.Identity = await this.identityRepository.create(body).then(value => value.toJSON());

        return await this.findOne(identity.id);
    }

    /**
     * create a new Identity for Market
     *
     * create a Market-wallet from the Profile-wallet named profile1/market1
     *   - on profile1-wallet, create a new wallet
     *     - createwallet "profile1/market1" false true
     *   - create a new market1 wallet account at m/44'/44'/4444446'/0' (market2 would be m/44'/44'/4444446'/1', etc)
     *     - get the master key's (m/44'/44') evkey
     *       - extkey list true
     *     - extkey info master_keys_evkey "4444446'/0'"
     *   - switch to profile1/market1-wallet and import the master key and create the default account
     *     - extkeyaltversion market1_accounts_evkey_from_previous_step
     *     - extkey import ext_key_from_previous_step "master key" true
     *     - extkey setmaster id_from_previous_step
     *     - extkey deriveaccount "market account"
     *     - extkey setdefaultaccount account_from_previous_step
     *
     * @param profile
     * @param name
     * @param isDefault
     */
    public async createMarketIdentityForProfile(profile: resources.Profile, name: string, isDefault: boolean = false): Promise<Identity> {

        // first get the Profile Identity
        const profileIdentity: resources.Identity = await this.findProfileIdentity(profile.id).then(value => value.toJSON());

        this.log.debug('createMarketIdentityForProfile(), profileIdentity.wallet: ', profileIdentity.wallet);

        // extkey list & find the master, we need the evkey
        const masterKey: RpcExtKey = await this.getWalletMasterKey(profileIdentity.wallet);

        // figure out the next keypath: amountOfMarkets, for the default one its 0
        const pathIndex = isDefault ? 0 : profile.Markets.length;

        const keyPath = '4444446\'/' + pathIndex + '\'';
        const keyInfo: RpcExtKeyResult = await this.coreRpcService.extKeyInfo(profileIdentity.wallet, masterKey.evkey, keyPath);
        // this.log.debug('createMarketIdentityForProfile(), keyInfo (' + pathIndex + '): ', JSON.stringify(keyInfo, null, 2));

        // create and load a new blank wallet
        // TODO: encrypt by default?

        const marketWalletName = path.join('profiles', profile.name, name);
        await this.createOrLoadWalletAndReturnCreated(marketWalletName)
            .then(async created => {
                // listwalletdir
                // createwallet
                // loadwallet
            });

        // ext_key encoded with alternate version bytes
        const extKeyAlt: string = await this.coreRpcService.extKeyAltVersion(keyInfo.key_info.result);

        // import the key and set up the market wallet
        await this.coreRpcService.extKeyImport(marketWalletName, extKeyAlt/*masterKey.evkey*/, 'master key', true, true)
            .then(async extKeyImported => {
                // this.log.debug('createMarketIdentityForProfile(), extKeyImported: ', JSON.stringify(extKeyImported, null, 2));
                // Set a private ext key as current master key, adds key_type: Master & current_master: true
                await this.coreRpcService.extKeySetMaster(marketWalletName, extKeyImported.id);

                // Make a new account from the current master key, save to wallet
                const marketAccount: RpcExtKeyResult = await this.coreRpcService.extKeyDeriveAccount(marketWalletName, 'market account');
                // this.log.debug('createMarketIdentityForProfile(), marketAccount: ', JSON.stringify(marketAccount, null, 2));

                // Set the account as the default
                await this.coreRpcService.extKeySetDefaultAccount(marketWalletName, marketAccount.account);

            })
            .catch(reason => {
                if (reason.message.error.message === 'ExtKeyImportLoose failed, Derived key already exists in wallet') {
                    // this.log.warn(reason.message.error.message);
                    this.log.debug('Key has already been imported.');
                } else {
                    this.log.error('ERROR:', reason);
                    throw reason;
                }
            });

        const address = await this.smsgService.getNewAddress(marketWalletName);
        this.log.debug('createMarketIdentityForProfile(), address: ', address);

        this.log.debug('createMarketIdentityForProfile(), walletName: ', marketWalletName);
        const walletInfo: RpcWalletInfo = await this.coreRpcService.getWalletInfo(marketWalletName);
        // this.log.debug('createMarketIdentityForProfile(), walletInfo: ', JSON.stringify(walletInfo, null, 2));

        // todo: IdentityFactory
        const createRequest: IdentityCreateRequest = {
            name,
            profile_id: profile.id,
            wallet: marketWalletName,
            address,
            hdseedid: walletInfo.hdseedid,
            path: keyInfo.key_info.path,
            type: IdentityType.MARKET
        } as IdentityCreateRequest;

        // create Identity for Market, using the created wallet
        const marketIdentity: resources.Identity = await this.create(createRequest).then(value => value.toJSON());

        // create default shoppingCart
        await this.shoppingCartService.create({
            name: address,
            identity_id: marketIdentity.id
        } as ShoppingCartCreateRequest);
        return await this.findOne(marketIdentity.id);
    }

    /**
     * create an Identity for Profile:
     * - create and load a new blank wallet
     * - create a new mnemonic
     * - import master key from bip44 mnemonic root key and derive default account
     *
     * @param profile
     * @param useMnemonicFromEnv
     */
    public async createProfileIdentity(profile: resources.Profile, useMnemonicFromEnv: boolean = false): Promise<Identity> {
        this.log.debug('createProfileIdentity(), creating new Profile Identity: ' + profile.name);
        const walletName = path.join('profiles', profile.name);

        let mnemonic: RpcMnemonic | undefined;
        let passphrase: string | undefined;

        await this.createOrLoadWalletAndReturnCreated(walletName)
            .then(async created => {

                // listwalletdir
                // createwallet
                // loadwallet

                if (created) {
                    // new wallet was created, create a new mnemonic
                    passphrase = useMnemonicFromEnv && process.env['DEFAULT_PROFILE_PASSPHRASE']
                        ? process.env['DEFAULT_PROFILE_PASSPHRASE']
                        : this.createRandom(24, true, true, true, false);
                    mnemonic = useMnemonicFromEnv && process.env['DEFAULT_PROFILE_MNEMONIC']
                        ? { mnemonic: process.env['DEFAULT_PROFILE_MNEMONIC'], master: '' }
                        : await this.coreRpcService.mnemonic(['new', passphrase, 'english', '32', true]);

                    this.log.debug('createProfileIdentity(), walletName: ' + walletName);
                    this.log.debug('createProfileIdentity(), mnemonic: ' + mnemonic.mnemonic);
                    this.log.debug('createProfileIdentity(), passphrase: ' + passphrase);

                    // import master key from bip44 mnemonic root key and derive default account
                    await this.coreRpcService.extKeyGenesisImport(walletName, [
                        mnemonic.mnemonic,
                        passphrase,
                        false,
                        'Master Key',
                        'Default Account',
                        -1                  // skip scan
                    ]);
                    this.log.debug('createProfileIdentity(), new mnemonic imported...');
                } else {
                    // existing wallet was loaded
                }
            });

        // extkey list & find the master
        const masterKey: RpcExtKey = await this.getWalletMasterKey(walletName);

        const address = await this.smsgService.getNewAddress(walletName);
        this.log.debug('createProfileIdentity(), identity.address: ' + address);

        const walletInfo: RpcWalletInfo = await this.coreRpcService.getWalletInfo(walletName);

        // create Identity for Profile, using the created wallet
        return await this.create({
            name: profile.name,
            profile_id: profile.id,
            wallet: walletName,
            address,
            hdseedid: walletInfo.hdseedid,
            path: masterKey.path,
            mnemonic: mnemonic ? mnemonic.mnemonic : undefined,
            passphrase: passphrase ? passphrase : undefined,
            type: IdentityType.PROFILE
        } as IdentityCreateRequest);
    }

    public async getWalletMasterKey(walletName: string): Promise<RpcExtKey> {
        const extKeys: RpcExtKey[] = await this.coreRpcService.extKeyList(walletName, true);
        const masterKey: RpcExtKey | undefined = _.find(extKeys, key => {
            return key.type === 'Loose' && key.key_type === 'Master' && key.label === 'Master Key - bip44 derived.' && key.current_master === 'true';
        });
        if (!masterKey) {
            throw new MessageException('Could not find Profile wallets Master key.');
        }
        return masterKey;
    }

    /**
     * returns whether new wallet was created or not
     *
     * @param walletName
     */
    public async createOrLoadWalletAndReturnCreated(walletName: string): Promise<boolean> {
        const walletExists = await this.coreRpcService.walletExists(walletName);
        if (!walletExists) {
            await this.coreRpcService.createAndLoadWallet(walletName, false, true)
                .catch(async reason => {
                    this.log.error('reason:', JSON.stringify(reason.body.error.message, null, 2));
                    throw new MessageException(reason.body.error.message);
                });
            this.log.debug('Wallet ' + walletName + ' created and loaded!');

        } else {
            this.log.debug('Wallet ' + walletName + ' already exists, loading!');
            // load the wallet unless already loaded
            await this.coreRpcService.loadWallet(walletName);
        }
        return !walletExists;
    }

    @validate()
    public async update(id: number, @request(IdentityUpdateRequest) body: IdentityUpdateRequest): Promise<Identity> {
        const identity = await this.findOne(id, false);
        identity.Wallet = body.wallet;
        identity.Address = body.address;
        identity.Hdseedid = body.hdseedid;
        identity.Path = body.hdseedid;
        identity.Mnemonic = body.mnemonic;
        identity.Passphrase = body.passphrase;
        identity.Type = body.type;
        return await this.identityRepository.update(id, identity.toJSON());
    }

    public async clear(id: number): Promise<Identity> {
        const identity = await this.findOne(id, false);
        identity.set('hdseedid', null);
        identity.set('mnemonic', null);
        identity.set('passphrase', null);
        return await this.identityRepository.update(id, identity.toJSON());
    }

    public async destroy(id: number): Promise<void> {
        await this.identityRepository.destroy(id);
    }

    /**
     * todo: move to some util
     */
    private createRandom(length: number = 24, caps: boolean = true, lower: boolean = true, numbers: boolean = true, unique: boolean = true): string {
        const capsChars = caps ? [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'] : [];
        const lowerChars = lower ? [...'abcdefghijklmnopqrstuvwxyz'] : [];
        const numChars = numbers ? [...'0123456789'] : [];
        const uniqueChars = unique ? [...'~!@#$%^&*()_+-=[]{};:,.<>?'] : [];
        const selectedChars = [...capsChars, ...lowerChars, ...numChars, ...uniqueChars];

        return [...Array(length)]
            .map(i => selectedChars[Math.random() * selectedChars.length | 0])
            .join('');
    }

}
