// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { Bookshelf } from '../../config/Database';
import { Collection, Model } from 'bookshelf';
import { Logger as LoggerType } from '../../core/Logger';
import { ItemInformation } from './ItemInformation';
import { PaymentInformation } from './PaymentInformation';
import { MessagingInformation } from './MessagingInformation';
import { ListingItemObject } from './ListingItemObject';
import { ListingItemSearchParams } from '../requests/search/ListingItemSearchParams';
import { FavoriteItem } from './FavoriteItem';
import { ListingItemTemplate } from './ListingItemTemplate';
import { Bid } from './Bid';
import { FlaggedItem } from './FlaggedItem';
import { ShoppingCartItem } from './ShoppingCartItem';
import { Proposal } from './Proposal';

export class ListingItem extends Bookshelf.Model<ListingItem> {

    public static log: LoggerType = new LoggerType(__filename);

    public static RELATIONS = [
        'ItemInformation',
        'ItemInformation.ItemCategory',
        'ItemInformation.ItemCategory.ParentItemCategory',
        'ItemInformation.ItemCategory.ParentItemCategory.ParentItemCategory',
        'ItemInformation.ItemCategory.ParentItemCategory.ParentItemCategory.ParentItemCategory',
        'ItemInformation.ItemCategory.ParentItemCategory.ParentItemCategory.ParentItemCategory.ParentItemCategory',
        'ItemInformation.ItemLocation',
        'ItemInformation.ItemLocation.LocationMarker',
        'ItemInformation.ItemImages',
        'ItemInformation.ItemImages.ItemImageDatas',
        'ItemInformation.ShippingDestinations',
        'PaymentInformation',
        'PaymentInformation.Escrow',
        'PaymentInformation.Escrow.Ratio',
        'PaymentInformation.ItemPrice',
        'PaymentInformation.ItemPrice.ShippingPrice',
        'PaymentInformation.ItemPrice.CryptocurrencyAddress',
        'MessagingInformation',
        'ListingItemObjects',
        'ListingItemObjects.ListingItemObjectDatas',
        'ListingItemTemplate',
        'ListingItemTemplate.Profile',
        'Bids',
        'Bids.BidDatas',
        'Bids.OrderItem',
        'Bids.OrderItem.Order',
        'FlaggedItem',
        'FlaggedItem.Proposal',
        'FlaggedItem.Proposal.ProposalOptions'
        // 'FlaggedItem.Proposal.ProposalResults',
    ];

    public static async fetchAllByHash(hash: string, withRelated: boolean = true): Promise<Collection<ListingItem>> {
        const ListingItemCollection = ListingItem.forge<Model<ListingItem>>()
            .query(qb => {
                qb.where('hash', '=', hash);
            })
            .orderBy('expiry_time', 'ASC');

        if (withRelated) {
            return await ListingItemCollection.fetchAll({
                withRelated: this.RELATIONS
            });
        } else {
            return await ListingItemCollection.fetchAll();
        }
    }

    public static async fetchById(value: number, withRelated: boolean = true): Promise<ListingItem> {
        if (withRelated) {
            return await ListingItem.where<ListingItem>({ id: value }).fetch({
                withRelated: this.RELATIONS
            });
        } else {
            return await ListingItem.where<ListingItem>({ id: value }).fetch();
        }
    }

    public static async fetchByMsgId(value: string, withRelated: boolean = true): Promise<ListingItem> {
        if (withRelated) {
            return await ListingItem.where<ListingItem>({ msgid: value }).fetch({
                withRelated: this.RELATIONS
            });
        } else {
            return await ListingItem.where<ListingItem>({ msgid: value }).fetch();
        }
    }

    public static async fetchByHashAndMarketReceiveAddress(hash: string, marketReceiveAddress: string, withRelated: boolean = true): Promise<ListingItem> {
        if (withRelated) {
            return await ListingItem.where<ListingItem>({ hash, market: marketReceiveAddress }).fetch({
                withRelated: this.RELATIONS
            });
        } else {
            return await ListingItem.where<ListingItem>({ hash, market: marketReceiveAddress }).fetch();
        }
    }

    public static async fetchByCategory(categoryId: number, withRelated: boolean = true): Promise<Collection<ListingItem>> {

        const listingCollection = ListingItem.forge<Model<ListingItem>>()
            .query(qb => {
                qb.innerJoin('item_informations', 'listing_items.id', 'item_informations.listing_item_id');
                qb.where('item_informations.item_category_id', '=', categoryId);
                // ignore expired items
                qb.andWhere('expired_at', '>', Date.now());
                qb.andWhere('item_informations.item_category_id', '>', 0);
            })
            .orderBy('item_informations.title', 'ASC');

        if (withRelated) {
            return await listingCollection.fetchAll({
                withRelated: this.RELATIONS
            });
        } else {
            return await listingCollection.fetchAll();
        }
    }

    public static async fetchExpired(): Promise<Collection<ListingItem>> {
        const listingCollection = ListingItem.forge<Model<ListingItem>>()
            .query(qb => {
                qb.joinRaw(`LEFT JOIN (SELECT listing_item_id, COUNT(*) AS bid_totals FROM bids GROUP BY listing_item_id) bid_totals
                    ON bid_totals.listing_item_id = listing_items.id`);
                qb.where('expired_at', '<=', Date.now());
                qb.andWhereRaw('bid_totals.bid_totals IS NULL');
                qb.groupBy('listing_items.id');
            });
        return await listingCollection.fetchAll();
    }

    public static async searchBy(options: ListingItemSearchParams, withRelated: boolean = false): Promise<Collection<ListingItem>> {
        const listingCollection = ListingItem.forge<Model<ListingItem>>()
            .query(qb => {
                // ignore expired items
                qb.where('expired_at', '>', Date.now());

                // searchBy by itemHash
                if (options.itemHash && typeof options.itemHash === 'string' && options.itemHash !== '*') {
                    qb.innerJoin('listing_item_templates', 'listing_item_templates.id', 'listing_items.listing_item_template_id');
                    qb.where('listing_item_templates.hash', '=', options.itemHash);

                    ListingItem.log.debug('...searchBy by itemHash: ', options.itemHash);
                }

                // searchBy by buyer
                let joinedBids = false;
                if (options.buyer && typeof options.buyer === 'string' && options.buyer !== '*') {
                    if (!joinedBids) {
                        qb.innerJoin('bids', 'bids.listing_item_id', 'listing_items.id');
                        joinedBids = true;
                    }
                    qb.where('bids.bidder', '=', options.buyer);
                    ListingItem.log.debug('...searchBy by buyer: ', options.buyer);
                }

                // searchBy by seller
                if (options.seller && typeof options.seller === 'string' && options.seller !== '*') {
                    qb.where('listing_items.seller', '=', options.seller);
                    ListingItem.log.debug('...searchBy by seller: ', options.seller);
                }

                qb.innerJoin('item_informations', 'item_informations.listing_item_id', 'listing_items.id');

                if (options.category && typeof options.category === 'number') {
                    qb.innerJoin('item_categories', 'item_categories.id', 'item_informations.item_category_id');
                    qb.where('item_categories.id', '=', options.category);
                    ListingItem.log.debug('...searchBy by category.id: ', options.category);
                } else if (options.category && typeof options.category === 'string') {
                    qb.innerJoin('item_categories', 'item_categories.id', 'item_informations.item_category_id');
                    qb.where('item_categories.key', '=', options.category);
                    ListingItem.log.debug('...searchBy by category.key: ', options.category);
                } else if (
                    options.category &&
                    (Object.prototype.toString.call(options.category) === '[object Array]') &&
                    (typeof options.category[0] === 'number')
                ) {
                    qb.innerJoin('item_categories', 'item_categories.id', 'item_informations.item_category_id');
                    qb.whereIn('item_categories.id', options.category as number[]);
                } else if (
                    options.category &&
                    (Object.prototype.toString.call(options.category) === '[object Array]') &&
                    typeof options.category[0] === 'string'
                ) {
                    qb.innerJoin('item_categories', 'item_categories.id', 'item_informations.item_category_id');
                    qb.whereIn('item_categories.key', options.category as string[]);
                }

                // searchBy by profile
                if (typeof options.profileId === 'number') {
                    qb.innerJoin('listing_item_templates', 'listing_item_templates.id', 'listing_items.listing_item_template_id');
                    qb.where('listing_item_templates.profile_id', '=', options.profileId);
                    ListingItem.log.debug('...searchBy by profileId: ', options.profileId);

                } else if (options.profileId === 'OWN') { // ListingItems belonging to any profile
                    qb.innerJoin('listing_item_templates', 'listing_item_templates.id', 'listing_items.listing_item_template_id');
                }

                // searchBy by item price
                if (typeof options.minPrice === 'number' && typeof options.maxPrice === 'number') {
                    qb.innerJoin('payment_informations', 'payment_informations.listing_item_id', 'listing_items.id');
                    qb.innerJoin('item_prices', 'payment_informations.id', 'item_prices.payment_information_id');
                    qb.whereBetween('item_prices.base_price', [options.minPrice, options.maxPrice]);
                    ListingItem.log.debug('...searchBy by price: ', [options.minPrice, options.maxPrice]);
                }

                // searchBy by item location (country)
                if (options.country && typeof options.country === 'string') {
                    qb.innerJoin('item_locations', 'item_informations.id', 'item_locations.item_information_id');
                    qb.where('item_locations.country', options.country);
                    ListingItem.log.debug('...searchBy by location: ', options.country);
                }

                // searchBy by shipping destination
                if (options.shippingDestination && typeof options.shippingDestination === 'string') {
                    qb.innerJoin('shipping_destinations', 'item_informations.id', 'shipping_destinations.item_information_id');
                    qb.where('shipping_destinations.country', options.shippingDestination);
                    ListingItem.log.debug('...searchBy by shippingDestination: ', options.shippingDestination);
                }

                if (options.searchString) {
                    qb.where('item_informations.title', 'LIKE', '%' + options.searchString + '%');
                    ListingItem.log.debug('...searchBy by searchString: ', options.searchString);
                }

                if (options.flagged) {
                    // ListingItems having FlaggedItem
                    qb.innerJoin('flagged_items', 'listing_items.id', 'flagged_items.listing_item_id');
                } else {
                    // Show all listingitems, but dont include the ones having ListingItem.removed
                    qb.where('listing_items.removed', '=', false);
                }

                if (options.market) {
                    qb.where('listing_items.market', '=', options.market);
                }

                if (options.withBids && !joinedBids) { // Don't want to join twice or we'll get errors.
                    qb.innerJoin('bids', 'bids.listing_item_id', 'listing_items.id');
                }
                // qb.groupBy('listing_items.id');

            })
            .orderBy('created_at', options.order)
            .query({
                limit: options.pageLimit,
                offset: options.page * options.pageLimit
            });

        if (withRelated) {
            return await listingCollection.fetchAll({
                withRelated: this.RELATIONS
                // debug: true
            });
        } else {
            return await listingCollection.fetchAll();
        }
    }


    public get tableName(): string { return 'listing_items'; }
    public get hasTimestamps(): boolean { return true; }

    public get Id(): number { return this.get('id'); }
    public set Id(value: number) { this.set('id', value); }

    public get Msgid(): string { return this.get('msgid'); }
    public set Msgid(value: string) { this.set('msgid', value); }

    public get Hash(): string { return this.get('hash'); }
    public set Hash(value: string) { this.set('hash', value); }

    public get Removed(): boolean { return this.get('removed'); }
    public set Removed(value: boolean) { this.set('removed', value); }

    public get Seller(): string { return this.get('seller'); }
    public set Seller(value: string) { this.set('seller', value); }

    public get Market(): string { return this.get('market'); }
    public set Market(value: string) { this.set('market', value); }

    public get ExpiryTime(): number { return this.get('expiryTime'); }
    public set ExpiryTime(value: number) { this.set('expiryTime', value); }

    public get PostedAt(): number { return this.get('postedAt'); }
    public set PostedAt(value: number) { this.set('postedAt', value); }

    public get ExpiredAt(): number { return this.get('expiredAt'); }
    public set ExpiredAt(value: number) { this.set('expiredAt', value); }

    public get ReceivedAt(): number { return this.get('receivedAt'); }
    public set ReceivedAt(value: number) { this.set('receivedAt', value); }

    public get GeneratedAt(): number { return this.get('generatedAt'); }
    public set GeneratedAt(value: number) { this.set('generatedAt', value); }

    public get UpdatedAt(): Date { return this.get('updatedAt'); }
    public set UpdatedAt(value: Date) { this.set('updatedAt', value); }

    public get CreatedAt(): Date { return this.get('createdAt'); }
    public set CreatedAt(value: Date) { this.set('createdAt', value); }

    public ItemInformation(): ItemInformation {
        return this.hasOne(ItemInformation);
    }

    public PaymentInformation(): PaymentInformation {
        return this.hasOne(PaymentInformation);
    }

    public MessagingInformation(): Collection<MessagingInformation> {
        return this.hasMany(MessagingInformation, 'listing_item_id', 'id');
    }

    public ListingItemObjects(): Collection<ListingItemObject> {
        return this.hasMany(ListingItemObject, 'listing_item_id', 'id');
    }

    public FavoriteItems(): Collection<FavoriteItem> {
        return this.hasMany(FavoriteItem, 'listing_item_id', 'id');
    }

    public ListingItemTemplate(): ListingItemTemplate {
        return this.belongsTo(ListingItemTemplate, 'listing_item_template_id', 'id');
    }

    public Bids(): Collection<Bid> {
        return this.hasMany(Bid, 'listing_item_id', 'id');
    }

    public FlaggedItem(): FlaggedItem {
        return this.hasOne(FlaggedItem);
    }

    public ShoppingCartItem(): Collection<ShoppingCartItem> {
        return this.hasMany(ShoppingCartItem, 'listing_item_id', 'id');
    }
}
