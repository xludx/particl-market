// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import * as interfaces from '../../types/interfaces';
import pForever from 'pm-forever';
import delay from 'pm-delay';
import { inject, named } from 'inversify';
import { Core, Targets, Types } from '../../constants';
import { Logger as LoggerType } from '../../core/Logger';
import { DefaultItemCategoryService } from '../services/DefaultItemCategoryService';
import { DefaultProfileService } from '../services/DefaultProfileService';
import { DefaultMarketService } from '../services/DefaultMarketService';
import { EventEmitter } from '../../core/api/events';
import { WaitingMessageService } from '../services/observer/WaitingMessageService';
import { CoreRpcService } from '../services/CoreRpcService';
import { CoreMessageProcessor } from '../messageprocessors/CoreMessageProcessor';
import { ProposalResultRecalcService } from '../services/observer/ProposalResultRecalcService';
import { DefaultSettingService } from '../services/DefaultSettingService';
import { SettingValue } from '../enums/SettingValue';
import { SettingService } from '../services/model/SettingService';
import { CoreCookieService } from '../services/observer/CoreCookieService';
import { SmsgService } from '../services/SmsgService';
import { CoreConnectionStatusService } from '../services/observer/CoreConnectionStatusService';
import { IdentityService } from '../services/model/IdentityService';
import { ExpiredListingItemService } from '../services/observer/ExpiredListingItemService';
import { IdentityType } from '../enums/IdentityType';
import { MarketService } from '../services/model/MarketService';
import { MessageException } from '../exceptions/MessageException';
import { ProfileService } from '../services/model/ProfileService';
import { CoreConnectionStatusServiceStatus } from '../enums/CoreConnectionStatusServiceStatus';
import { ExpiredProposalService } from '../services/observer/ExpiredProposalService';
import { RpcBlockchainInfo } from 'omp-lib/dist/interfaces/rpc';

export class ServerStartedListener implements interfaces.Listener {

    public static Event = Symbol('ServerStartedListenerEvent');

    public log: LoggerType;

    public updated = 0;
    public isStarted = false;       // todo: status enum
    private previousState = false;

    private timeout: any;

    private INTERVAL = 1000;
    private STOP = false;
    private BOOTSTRAPPING = true;

    // tslint:disable:max-line-length
    constructor(
        @inject(Types.MessageProcessor) @named(Targets.MessageProcessor.CoreMessageProcessor) public coreMessageProcessor: CoreMessageProcessor,
        @inject(Types.Service) @named(Targets.Service.DefaultItemCategoryService) public defaultItemCategoryService: DefaultItemCategoryService,
        @inject(Types.Service) @named(Targets.Service.DefaultProfileService) public defaultProfileService: DefaultProfileService,
        @inject(Types.Service) @named(Targets.Service.DefaultMarketService) public defaultMarketService: DefaultMarketService,
        @inject(Types.Service) @named(Targets.Service.DefaultSettingService) public defaultSettingService: DefaultSettingService,
        @inject(Types.Service) @named(Targets.Service.model.IdentityService) public identityService: IdentityService,
        @inject(Types.Service) @named(Targets.Service.model.SettingService) public settingService: SettingService,
        @inject(Types.Service) @named(Targets.Service.model.MarketService) public marketService: MarketService,
        @inject(Types.Service) @named(Targets.Service.model.ProfileService) public profileService: ProfileService,
        @inject(Types.Service) @named(Targets.Service.observer.CoreCookieService) public coreCookieService: CoreCookieService,

        // inject all observers here to make sure they start up
        @inject(Types.Service) @named(Targets.Service.observer.CoreConnectionStatusService) public coreConnectionStatusService: CoreConnectionStatusService,
        @inject(Types.Service) @named(Targets.Service.observer.WaitingMessageService) public waitingMessageService: WaitingMessageService,
        @inject(Types.Service) @named(Targets.Service.observer.ProposalResultRecalcService) public proposalResultRecalcService: ProposalResultRecalcService,
        @inject(Types.Service) @named(Targets.Service.observer.ExpiredListingItemService) public expiredListingItemService: ExpiredListingItemService,
        @inject(Types.Service) @named(Targets.Service.observer.ExpiredProposalService) public expiredProposalService: ExpiredProposalService,

        @inject(Types.Service) @named(Targets.Service.CoreRpcService) public coreRpcService: CoreRpcService,
        @inject(Types.Service) @named(Targets.Service.SmsgService) public smsgService: SmsgService,
        @inject(Types.Core) @named(Core.Events) public eventEmitter: EventEmitter,
        @inject(Types.Core) @named(Core.Logger) Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
    }
    // tslint:enable:max-line-length

    /**
     *
     * @param payload
     * @returns {Promise<void>}
     */
    public async act(payload: any): Promise<any> {
        this.log.info('Received event ServerStartedListenerEvent', payload);
        this.start();
    }

    public async start(): Promise<void> {
        this.log.debug('start(): ');

        await pForever(async (i) => {
            i++;

            // this.log.debug('this.coreCookieService.status: ' + this.coreCookieService.status);
            // this.log.debug('this.coreConnectionStatusService.status: ' + this.coreConnectionStatusService.connectionStatus);
            if (this.BOOTSTRAPPING) {
                this.log.debug('bootstrapping...');
            }

            // keep checking whether we are connected to the core and when we are, call this.bootstrap()
            // then STOP the polling, if bootstrap was successful
            if (this.coreConnectionStatusService.connectionStatus === CoreConnectionStatusServiceStatus.CONNECTED
                && this.BOOTSTRAPPING) {
                this.STOP = await this.bootstrap()
                    .then((started) => {
                        this.isStarted = started;
                        return started;
                    })
                    .catch(reason => {
                        this.log.error('ERROR: marketplace bootstrap failed: ', reason);
                        // stop if there's an error
                        return true;
                    });
                this.BOOTSTRAPPING = false;
            }

            this.updated = Date.now();
            if (this.STOP) {
                this.log.info('Server started!');
                return pForever.end;
            }
            await delay(this.INTERVAL);
            // this.log.debug('ServerStartedListener.start(), i: ', i);

            return i;
        }, 0).catch(async reason => {
            this.log.error('ERROR: ', reason);
            await delay(this.INTERVAL);
            this.start();
        });
    }

    /**
     *  - Default Profile, Market and Identity creation on app startup.
     *    - if updating from previous installation (a market wallet already exists),
     *      - create new Identity (+wallet) for the Profile (Identity for the Market should already exist)
     *      - rename the existing Market to "old market" or something
     *    - on new installation:
     *      - create Profile with new Identity (+wallet)
     *    - create Market with new Identity (+wallet)
     *    - set the new Market as the default one
     */
    public async bootstrap(): Promise<boolean> {
        // all is now ready for bootstrapping the app
        const blockchainInfo: RpcBlockchainInfo = await this.coreRpcService.getBlockchainInfo();
        process.env.CHAIN = blockchainInfo.chain;

        // are we updating from previous installation (a market wallet already exists+no profile identity)
        const isUpgradingFromSingleMarketWallet = await this.isUpgradingFromSingleMarketWallet();
        // this.log.debug('bootstrap(), isUpgradingFromSingleMarketWallet: ', isUpgradingFromSingleMarketWallet);

        let defaultProfile: resources.Profile;
        if (isUpgradingFromSingleMarketWallet) {

            // create new Identity (+wallet) for the default Profile
            defaultProfile = await this.defaultProfileService.upgradeDefaultProfile();
            this.log.debug('bootstrap(), upgraded old default Profile: ', JSON.stringify(defaultProfile, null, 2));

            // renames the existing default Market to oldname + " (OLD)"
            // the new default market will be created later
            const oldMarket: resources.Market = await this.defaultMarketService.upgradeDefaultMarket();
            this.log.debug('bootstrap(), upgraded old default Market: ', JSON.stringify(oldMarket, null, 2));

        } else { // not upgrading...
            // create new Profile with new Identity (+wallet)
            defaultProfile = await this.defaultProfileService.seedDefaultProfile();
        }

        // save/update the default env vars as Settings
        await this.defaultSettingService.saveDefaultSettings(defaultProfile);
        await this.defaultSettingService.upgradeDefaultSettings();

        await this.loadWalletsForProfile(defaultProfile);

        // Seed the default ItemCategories (ItemCategory with no relation to a Market)
        // - ListingItemTemplates are assigned an ItemCategory from the list of default ItemCategories
        // - market ItemCategories are created for Markets as new ListingItems are received
        await this.defaultItemCategoryService.seedDefaultCategories();

        // check whether we have the required default marketplace configuration to continue
        const hasMarketConfiguration = await this.hasMarketConfiguration(defaultProfile);
        this.log.debug('bootstrap(), hasMarketConfiguration: ', hasMarketConfiguration);

        if (hasMarketConfiguration) {
            // marketplace will create the wallet it needs (each Market will have its own Identity linked to it)

            // seed the default Market for default Profile
            const defaultMarket: resources.Market = await this.defaultMarketService.seedDefaultMarketForProfile(defaultProfile)
                .catch(reason => {
                    this.log.error('ERROR: seedDefaultMarketForProfile, ' + reason);
                    throw reason;
                });

            if (process.env.NODE_ENV !== 'test') {
                // request new messages to be pushed through zmq
                await this.smsgService.pushUnreadCoreSmsgMessages();
            }

        } else {
            throw new MessageException('Missing default Market configuration.');
        }

        this.log.info('bootstrap(), done.');

        return true;
    }

    private async hasMarketConfiguration(profile: resources.Profile): Promise<boolean> {

        const allSettings: resources.Setting[] = await this.settingService.findAllByProfileId(profile.id).then(value => value.toJSON());
        const foundSettings: resources.Setting[] = _.filter(allSettings, (value) => {
            return value.key === SettingValue.APP_DEFAULT_MARKETPLACE_NAME
                || value.key === SettingValue.APP_DEFAULT_MARKETPLACE_PRIVATE_KEY;
        });

        if ((!_.isEmpty(process.env[SettingValue.APP_DEFAULT_MARKETPLACE_NAME])
            && !_.isEmpty(process.env[SettingValue.APP_DEFAULT_MARKETPLACE_PRIVATE_KEY]))
            || foundSettings.length === 2) {
            return true;
        }
        return false;
    }

    /**
     * are we updating from single market wallet?
     * ->   a wallet called market exists
     *      && Identity with type PROFILE belonging to default Profile DOES NOT exist
     */
    private async isUpgradingFromSingleMarketWallet(): Promise<boolean> {

        const hasMarketWallet = await this.coreRpcService.walletExists('market');
        // this.log.debug('isUpgradingFromSingleMarketWallet(), hasMarketWallet: ', hasMarketWallet);

        if (!hasMarketWallet) {
            // if we dont have the market wallet, we can't be upgrading it
            return false;
        }

        const defaultProfile: resources.Profile | undefined = await this.defaultProfileService.getDefault(true)
            .catch(reason => {
                return undefined;
            });

        // there is old market wallet, but no Profile -> not updating (we should seed the thing)
        if (!defaultProfile) {
            return false;
        }

        // try to find the Profile Identity
        const profileIdentity: resources.Identity | undefined = _.find(defaultProfile.Identities, identity => {
            return identity.type === IdentityType.PROFILE;
        });
        // this.log.debug('isUpdatingFromSingleMarketWallet(), profileIdentity: ', profileIdentity);

        // there is old market wallet, but no Profile Identity was found -> need to update
        if (hasMarketWallet && _.isEmpty(profileIdentity)) {
            return true;
        }

        return false;
    }

    /**
     * loads wallets for given Profile, returns the names of wallets loaded
     * @param profile
     */
    private async loadWalletsForProfile(profile: resources.Profile): Promise<string[]> {
        const identitiesToLoad: resources.Identity[] = await this.identityService.findAllByProfileId(profile.id).then(value => value.toJSON());

        // make sure the addresses are added as smsg receive addresses
        for (const identity of identitiesToLoad) {
            await this.smsgService.smsgAddLocalAddress(identity.address);
        }

        const walletsToLoad: string[] = identitiesToLoad.map( value => {
            return value.wallet;
        });
        this.log.debug('loadWalletsForProfile(), walletsToLoad: ', JSON.stringify(walletsToLoad, null, 2));
        return await this.coreRpcService.loadWallets(walletsToLoad);
    }

}
