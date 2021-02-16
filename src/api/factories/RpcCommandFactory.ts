// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { inject, named, multiInject } from 'inversify';
import { Logger as LoggerType } from '../../core/Logger';
import { Types, Core, Targets } from '../../constants';
import { RpcCommandInterface } from '../commands/RpcCommandInterface';
import { Environment, EnvironmentType } from '../../core/helpers/Environment';
import { MessageException } from '../exceptions/MessageException';
import { AddressRootCommand } from '../commands/address/AddressRootCommand';
import { AddressListCommand } from '../commands/address/AddressListCommand';
import { AddressAddCommand } from '../commands/address/AddressAddCommand';
import { AddressUpdateCommand } from '../commands/address/AddressUpdateCommand';
import { AddressRemoveCommand } from '../commands/address/AddressRemoveCommand';
import { BidRootCommand } from '../commands/bid/BidRootCommand';
import { BidSearchCommand } from '../commands/bid/BidSearchCommand';
import { BidGetCommand } from '../commands/bid/BidGetCommand';
import { BidAcceptCommand } from '../commands/bid/BidAcceptCommand';
import { BidCancelCommand } from '../commands/bid/BidCancelCommand';
import { BidRejectCommand } from '../commands/bid/BidRejectCommand';
import { BidSendCommand } from '../commands/bid/BidSendCommand';
import { Command } from '../commands/Command';
import { CurrencyPriceRootCommand } from '../commands/currencyprice/CurrencyPriceRootCommand';
import { DaemonRootCommand } from '../commands/daemon/DaemonRootCommand';
import { DataAddCommand } from '../commands/data/DataAddCommand';
import { DataCleanCommand } from '../commands/data/DataCleanCommand';
import { DataRootCommand } from '../commands/data/DataRootCommand';
import { DataGenerateCommand } from '../commands/data/DataGenerateCommand';
import { AdminCommand } from '../commands/admin/AdminCommand';
import { StatusCommand } from '../commands/admin/StatusCommand';
import { PublishTestDataCommand } from '../commands/admin/PublishTestDataCommand';
import { EscrowRootCommand } from '../commands/escrow/EscrowRootCommand';
import { EscrowCompleteCommand } from '../commands/escrow/EscrowCompleteCommand';
import { EscrowUpdateCommand } from '../commands/escrow/EscrowUpdateCommand';
import { EscrowLockCommand } from '../commands/escrow/EscrowLockCommand';
import { EscrowRefundCommand } from '../commands/escrow/EscrowRefundCommand';
import { EscrowReleaseCommand } from '../commands/escrow/EscrowReleaseCommand';
import { FavoriteRootCommand } from '../commands/favorite/FavoriteRootCommand';
import { FavoriteListCommand } from '../commands/favorite/FavoriteListCommand';
import { FavoriteAddCommand } from '../commands/favorite/FavoriteAddCommand';
import { FavoriteRemoveCommand } from '../commands/favorite/FavoriteRemoveCommand';
import { ItemCategoryListCommand } from '../commands/itemcategory/ItemCategoryListCommand';
import { ItemCategoryAddCommand } from '../commands/itemcategory/ItemCategoryAddCommand';
import { ItemCategorySearchCommand } from '../commands/itemcategory/ItemCategorySearchCommand';
import { ItemCategoryGetCommand } from '../commands/itemcategory/ItemCategoryGetCommand';
import { ItemCategoryRemoveCommand } from '../commands/itemcategory/ItemCategoryRemoveCommand';
import { ItemCategoryUpdateCommand } from '../commands/itemcategory/ItemCategoryUpdateCommand';
import { ItemCategoryRootCommand } from '../commands/itemcategory/ItemCategoryRootCommand';
import { ImageRootCommand } from '../commands/image/ImageRootCommand';
import { ImageAddCommand } from '../commands/image/ImageAddCommand';
import { ImageCompressCommand } from '../commands/image/ImageCompressCommand';
import { ImageListCommand } from '../commands/image/ImageListCommand';
import { ImageRemoveCommand } from '../commands/image/ImageRemoveCommand';
import { ItemInformationGetCommand } from '../commands/iteminformation/ItemInformationGetCommand';
import { ItemInformationUpdateCommand } from '../commands/iteminformation/ItemInformationUpdateCommand';
import { ItemInformationRootCommand } from '../commands/iteminformation/ItemInformationRootCommand';
import { ItemLocationUpdateCommand } from '../commands/itemlocation/ItemLocationUpdateCommand';
import { ItemLocationRootCommand } from '../commands/itemlocation/ItemLocationRootCommand';
import { HelpCommand } from '../commands/HelpCommand';
import { ListingItemGetCommand } from '../commands/listingitem/ListingItemGetCommand';
import { ListingItemSearchCommand } from '../commands/listingitem/ListingItemSearchCommand';
import { ListingItemFlagCommand } from '../commands/listingitem/ListingItemFlagCommand';
import { ListingItemRootCommand } from '../commands/listingitem/ListingItemRootCommand';
import { ListingItemTemplateAddCommand } from '../commands/listingitemtemplate/ListingItemTemplateAddCommand';
import { ListingItemTemplateRemoveCommand } from '../commands/listingitemtemplate/ListingItemTemplateRemoveCommand';
import { ListingItemTemplateGetCommand } from '../commands/listingitemtemplate/ListingItemTemplateGetCommand';
import { ListingItemTemplateSearchCommand } from '../commands/listingitemtemplate/ListingItemTemplateSearchCommand';
import { ListingItemTemplatePostCommand } from '../commands/listingitemtemplate/ListingItemTemplatePostCommand';
import { ListingItemTemplateSizeCommand } from '../commands/listingitemtemplate/ListingItemTemplateSizeCommand';
import { ListingItemTemplateCompressCommand } from '../commands/listingitemtemplate/ListingItemTemplateCompressCommand';
import { ListingItemTemplateFeatureImageCommand } from '../commands/listingitemtemplate/ListingItemTemplateFeatureImageCommand';
import { ListingItemTemplateCloneCommand } from '../commands/listingitemtemplate/ListingItemTemplateCloneCommand';
import { ListingItemTemplateRootCommand } from '../commands/listingitemtemplate/ListingItemTemplateRootCommand';
import { MarketAddCommand } from '../commands/market/MarketAddCommand';
import { MarketRootCommand } from '../commands/market/MarketRootCommand';
import { MarketGetCommand } from '../commands/market/MarketGetCommand';
import { MarketRemoveCommand } from '../commands/market/MarketRemoveCommand';
import { MarketDefaultCommand } from '../commands/market/MarketDefaultCommand';
import { MarketListCommand } from '../commands/market/MarketListCommand';
import { MarketFlagCommand } from '../commands/market/MarketFlagCommand';
import { MarketJoinCommand } from '../commands/market/MarketJoinCommand';
import { MarketPostCommand } from '../commands/market/MarketPostCommand';
import { MarketSearchCommand } from '../commands/market/MarketSearchCommand';
import { MessagingInformationUpdateCommand } from '../commands/messaginginformation/MessagingInformationUpdateCommand';
import { MessagingInformationRootCommand } from '../commands/messaginginformation/MessagingInformationRootCommand';
import { OrderRootCommand } from '../commands/order/OrderRootCommand';
import { OrderSearchCommand } from '../commands/order/OrderSearchCommand';
import { OrderItemRootCommand } from '../commands/orderitem/OrderItemRootCommand';
import { OrderItemHistoryCommand } from '../commands/orderitem/OrderItemHistoryCommand';
import { OrderItemStatusCommand } from '../commands/orderitem/OrderItemStatusCommand';
import { OrderItemShipCommand } from '../commands/orderitem/OrderItemShipCommand';
import { OrderItemSearchCommand } from '../commands/orderitem/OrderItemSearchCommand';
import { PaymentInformationUpdateCommand } from '../commands/paymentinformation/PaymentInformationUpdateCommand';
import { PaymentInformationRootCommand } from '../commands/paymentinformation/PaymentInformationRootCommand';
import { PriceTickerRootCommand } from '../commands/priceticker/PriceTickerRootCommand';
import { ProposalGetCommand } from '../commands/proposal/ProposalGetCommand';
import { ProposalPostCommand } from '../commands/proposal/ProposalPostCommand';
import { ProposalListCommand } from '../commands/proposal/ProposalListCommand';
import { ProposalResultCommand } from '../commands/proposal/ProposalResultCommand';
import { ProposalRootCommand } from '../commands/proposal/ProposalRootCommand';
import { ProfileAddCommand } from '../commands/profile/ProfileAddCommand';
import { ProfileDefaultCommand } from '../commands/profile/ProfileDefaultCommand';
import { ProfileRemoveCommand } from '../commands/profile/ProfileRemoveCommand';
import { ProfileUpdateCommand } from '../commands/profile/ProfileUpdateCommand';
import { ProfileGetCommand } from '../commands/profile/ProfileGetCommand';
import { ProfileListCommand } from '../commands/profile/ProfileListCommand';
import { ProfileMnemonicCommand } from '../commands/profile/ProfileMnemonicCommand';
import { ProfileRootCommand } from '../commands/profile/ProfileRootCommand';
import { ShippingDestinationRootCommand } from '../commands/shippingdestination/ShippingDestinationRootCommand';
import { ShippingDestinationListCommand } from '../commands/shippingdestination/ShippingDestinationListCommand';
import { ShippingDestinationAddCommand } from '../commands/shippingdestination/ShippingDestinationAddCommand';
import { ShippingDestinationRemoveCommand } from '../commands/shippingdestination/ShippingDestinationRemoveCommand';
import { ListingItemObjectRootCommand } from '../commands/listingitemobject/ListingItemObjectRootCommand';
import { ListingItemObjectSearchCommand } from '../commands/listingitemobject/ListingItemObjectSearchCommand';
import { ShoppingCartAddCommand } from '../commands/shoppingcart/ShoppingCartAddCommand';
import { ShoppingCartUpdateCommand } from '../commands/shoppingcart/ShoppingCartUpdateCommand';
import { ShoppingCartRemoveCommand } from '../commands/shoppingcart/ShoppingCartRemoveCommand';
import { ShoppingCartListCommand } from '../commands/shoppingcart/ShoppingCartListCommand';
import { ShoppingCartGetCommand } from '../commands/shoppingcart/ShoppingCartGetCommand';
import { ShoppingCartClearCommand } from '../commands/shoppingcart/ShoppingCartClearCommand';
import { ShoppingCartRootCommand } from '../commands/shoppingcart/ShoppingCartRootCommand';
import { ShoppingCartItemAddCommand } from '../commands/shoppingcartitem/ShoppingCartItemAddCommand';
import { ShoppingCartItemRemoveCommand } from '../commands/shoppingcartitem/ShoppingCartItemRemoveCommand';
import { ShoppingCartItemListCommand } from '../commands/shoppingcartitem/ShoppingCartItemListCommand';
import { ShoppingCartItemRootCommand } from '../commands/shoppingcartitem/ShoppingCartItemRootCommand';
import { VotePostCommand } from '../commands/vote/VotePostCommand';
import { VoteGetCommand } from '../commands/vote/VoteGetCommand';
import { VoteListCommand } from '../commands/vote/VoteListCommand';
import { VoteRootCommand } from '../commands/vote/VoteRootCommand';
import { SmsgSearchCommand } from '../commands/smsg/SmsgSearchCommand';
import { SmsgRemoveCommand } from '../commands/smsg/SmsgRemoveCommand';
import { SmsgResendCommand } from '../commands/smsg/SmsgResendCommand';
import { SmsgRootCommand } from '../commands/smsg/SmsgRootCommand';
import { IdentityAddCommand } from '../commands/identity/IdentityAddCommand';
import { IdentityFundCommand } from '../commands/identity/IdentityFundCommand';
import { IdentityListCommand } from '../commands/identity/IdentityListCommand';
import { IdentityRootCommand } from '../commands/identity/IdentityRootCommand';
import { SettingGetCommand } from '../commands/setting/SettingGetCommand';
import { SettingListCommand } from '../commands/setting/SettingListCommand';
import { SettingRemoveCommand } from '../commands/setting/SettingRemoveCommand';
import { SettingSetCommand } from '../commands/setting/SettingSetCommand';
import { SettingRootCommand } from '../commands/setting/SettingRootCommand';
import { CommentRootCommand } from '../commands/comment/CommentRootCommand';
import { CommentPostCommand } from '../commands/comment/CommentPostCommand';
import { CommentSearchCommand } from '../commands/comment/CommentSearchCommand';
import { CommentGetCommand } from '../commands/comment/CommentGetCommand';
import { CommentCountCommand } from '../commands/comment/CommentCountCommand';
import { BlacklistListCommand } from '../commands/blacklist/BlacklistListCommand';
import { BlacklistRootCommand } from '../commands/blacklist/BlacklistRootCommand';
import { BlacklistAddCommand } from '../commands/blacklist/BlacklistAddCommand';
import { NotificationRootCommand } from '../commands/notification/NotificationRootCommand';
import { NotificationSetReadCommand } from '../commands/notification/NotificationSetReadCommand';
import { NotificationRemoveCommand } from '../commands/notification/NotificationRemoveCommand';
import { NotificationSearchCommand } from '../commands/notification/NotificationSearchCommand';

// tslint:disable:array-type
// tslint:disable:max-line-length
export class RpcCommandFactory {

    public log: LoggerType;
    public commands: Array<RpcCommandInterface<any>> = [];

    constructor(
        @inject(Types.Command) @named(Targets.Command.daemon.DaemonRootCommand) private daemonRootCommand: DaemonRootCommand,

        @inject(Types.Command) @named(Targets.Command.bid.BidSearchCommand) private bidSearchCommand: BidSearchCommand,
        @inject(Types.Command) @named(Targets.Command.bid.BidGetCommand) private bidGetCommand: BidGetCommand,
        @inject(Types.Command) @named(Targets.Command.bid.BidAcceptCommand) private bidAcceptCommand: BidAcceptCommand,
        @inject(Types.Command) @named(Targets.Command.bid.BidCancelCommand) private bidCancelCommand: BidCancelCommand,
        @inject(Types.Command) @named(Targets.Command.bid.BidRejectCommand) private bidRejectCommand: BidRejectCommand,
        @inject(Types.Command) @named(Targets.Command.bid.BidSendCommand) private bidSendCommand: BidSendCommand,
        @inject(Types.Command) @named(Targets.Command.bid.BidRootCommand) private bidRootCommand: BidRootCommand,

        @inject(Types.Command) @named(Targets.Command.comment.CommentRootCommand) private commentRootCommand: CommentRootCommand,
        @inject(Types.Command) @named(Targets.Command.comment.CommentPostCommand) private commentPostCommand: CommentPostCommand,
        @inject(Types.Command) @named(Targets.Command.comment.CommentGetCommand) private commentGetCommand: CommentGetCommand,
        @inject(Types.Command) @named(Targets.Command.comment.CommentSearchCommand) private commentSearchCommand: CommentSearchCommand,
        @inject(Types.Command) @named(Targets.Command.comment.CommentCountCommand) private commentCountCommand: CommentCountCommand,

        @inject(Types.Command) @named(Targets.Command.admin.AdminCommand) private adminCommand: AdminCommand,
        @inject(Types.Command) @named(Targets.Command.admin.StatusCommand) private statusCommand: StatusCommand,
        @inject(Types.Command) @named(Targets.Command.admin.PublishTestDataCommand) private publishTestDataCommand: PublishTestDataCommand,

        @inject(Types.Command) @named(Targets.Command.data.DataAddCommand) private dataAddCommand: DataAddCommand,
        @inject(Types.Command) @named(Targets.Command.data.DataCleanCommand) private dataCleanCommand: DataCleanCommand,
        @inject(Types.Command) @named(Targets.Command.data.DataGenerateCommand) private dataGenerateCommand: DataGenerateCommand,
        @inject(Types.Command) @named(Targets.Command.data.DataRootCommand) private dataRootCommand: DataRootCommand,

        @inject(Types.Command) @named(Targets.Command.escrow.EscrowCompleteCommand) private escrowCompleteCommand: EscrowCompleteCommand,
        @inject(Types.Command) @named(Targets.Command.escrow.EscrowUpdateCommand) private escrowUpdateCommand: EscrowUpdateCommand,
        @inject(Types.Command) @named(Targets.Command.escrow.EscrowLockCommand) private escrowLockCommand: EscrowLockCommand,
        @inject(Types.Command) @named(Targets.Command.escrow.EscrowRefundCommand) private escrowRefundCommand: EscrowRefundCommand,
        @inject(Types.Command) @named(Targets.Command.escrow.EscrowReleaseCommand) private escrowReleaseCommand: EscrowReleaseCommand,
        @inject(Types.Command) @named(Targets.Command.escrow.EscrowRootCommand) private escrowRootCommand: EscrowRootCommand,

        @inject(Types.Command) @named(Targets.Command.favorite.FavoriteListCommand) private favoriteListCommand: FavoriteListCommand,
        @inject(Types.Command) @named(Targets.Command.favorite.FavoriteAddCommand) private favoriteAddCommand: FavoriteAddCommand,
        @inject(Types.Command) @named(Targets.Command.favorite.FavoriteRemoveCommand) private favoriteRemoveCommand: FavoriteRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.favorite.FavoriteRootCommand) private favoriteRootCommand: FavoriteRootCommand,

        @inject(Types.Command) @named(Targets.Command.itemcategory.ItemCategoryListCommand) private itemCategoryListCommand: ItemCategoryListCommand,
        @inject(Types.Command) @named(Targets.Command.itemcategory.ItemCategoryAddCommand) private itemCategoryAddCommand: ItemCategoryAddCommand,
        @inject(Types.Command) @named(Targets.Command.itemcategory.ItemCategorySearchCommand) private itemCategorySearchCommand: ItemCategorySearchCommand,
        @inject(Types.Command) @named(Targets.Command.itemcategory.ItemCategoryGetCommand) private itemCategoryGetCommand: ItemCategoryGetCommand,
        @inject(Types.Command) @named(Targets.Command.itemcategory.ItemCategoryRemoveCommand) private itemCategoryRemoveCommand: ItemCategoryRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.itemcategory.ItemCategoryUpdateCommand) private itemCategoryUpdateCommand: ItemCategoryUpdateCommand,
        @inject(Types.Command) @named(Targets.Command.itemcategory.ItemCategoryRootCommand) private itemCategoryRootCommand: ItemCategoryRootCommand,

        @inject(Types.Command) @named(Targets.Command.image.ImageAddCommand) private imageAddCommand: ImageAddCommand,
        @inject(Types.Command) @named(Targets.Command.image.ImageCompressCommand) private imageCompressCommand: ImageCompressCommand,
        @inject(Types.Command) @named(Targets.Command.image.ImageListCommand) private imageListCommand: ImageListCommand,
        @inject(Types.Command) @named(Targets.Command.image.ImageRemoveCommand) private imageRemoveCommand: ImageRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.image.ImageRootCommand) private imageRootCommand: ImageRootCommand,

        @inject(Types.Command) @named(Targets.Command.iteminformation.ItemInformationGetCommand) private itemInformationGetCommand: ItemInformationGetCommand,
        @inject(Types.Command) @named(Targets.Command.iteminformation.ItemInformationUpdateCommand) private itemInformationUpdateCommand: ItemInformationUpdateCommand,
        @inject(Types.Command) @named(Targets.Command.iteminformation.ItemInformationRootCommand) private itemInformationRootCommand: ItemInformationRootCommand,

        @inject(Types.Command) @named(Targets.Command.itemlocation.ItemLocationUpdateCommand) private itemLocationUpdateCommand: ItemLocationUpdateCommand,
        @inject(Types.Command) @named(Targets.Command.itemlocation.ItemLocationRootCommand) private itemLocationRootCommand: ItemLocationRootCommand,

        @inject(Types.Command) @named(Targets.Command.listingitem.ListingItemGetCommand) private listingItemGetCommand: ListingItemGetCommand,
        @inject(Types.Command) @named(Targets.Command.listingitem.ListingItemFlagCommand) private listingItemFlagCommand: ListingItemFlagCommand,
        @inject(Types.Command) @named(Targets.Command.listingitem.ListingItemSearchCommand) private listingItemSearchCommand: ListingItemSearchCommand,
        @inject(Types.Command) @named(Targets.Command.listingitem.ListingItemRootCommand) private listingItemRootCommand: ListingItemRootCommand,

        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplateAddCommand) private listingItemTemplateAddCommand: ListingItemTemplateAddCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplateRemoveCommand) private listingItemTemplateRemoveCommand: ListingItemTemplateRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplateGetCommand) private listingItemTemplateGetCommand: ListingItemTemplateGetCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplateSearchCommand) private listingItemTemplateSearchCommand: ListingItemTemplateSearchCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplatePostCommand) private listingItemTemplatePostCommand: ListingItemTemplatePostCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplateSizeCommand) private listingItemTemplateSizeCommand: ListingItemTemplateSizeCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplateCompressCommand) private listingItemTemplateCompressCommand: ListingItemTemplateCompressCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplateFeatureImageCommand) private listingItemTemplateFeatureImageCommand: ListingItemTemplateFeatureImageCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplateCloneCommand) private listingItemTemplateCloneCommand: ListingItemTemplateCloneCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemtemplate.ListingItemTemplateRootCommand) private listingItemTemplateRootCommand: ListingItemTemplateRootCommand,

        @inject(Types.Command) @named(Targets.Command.market.MarketAddCommand) private marketAddCommand: MarketAddCommand,
        @inject(Types.Command) @named(Targets.Command.market.MarketFlagCommand) private marketFlagCommand: MarketFlagCommand,
        @inject(Types.Command) @named(Targets.Command.market.MarketGetCommand) private marketGetCommand: MarketGetCommand,
        @inject(Types.Command) @named(Targets.Command.market.MarketListCommand) private marketListCommand: MarketListCommand,
        @inject(Types.Command) @named(Targets.Command.market.MarketRemoveCommand) private marketRemoveCommand: MarketRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.market.MarketDefaultCommand) private marketDefaultCommand: MarketDefaultCommand,
        @inject(Types.Command) @named(Targets.Command.market.MarketJoinCommand) private marketJoinCommand: MarketJoinCommand,
        @inject(Types.Command) @named(Targets.Command.market.MarketPostCommand) private marketPostCommand: MarketPostCommand,
        @inject(Types.Command) @named(Targets.Command.market.MarketSearchCommand) private marketSearchCommand: MarketSearchCommand,
        @inject(Types.Command) @named(Targets.Command.market.MarketRootCommand) private marketRootCommand: MarketRootCommand,

        @inject(Types.Command) @named(Targets.Command.messaginginformation.MessagingInformationUpdateCommand) private messagingInformationUpdateCommand: MessagingInformationUpdateCommand,
        @inject(Types.Command) @named(Targets.Command.messaginginformation.MessagingInformationRootCommand) private messagingInformationRootCommand: MessagingInformationRootCommand,

        @inject(Types.Command) @named(Targets.Command.order.OrderSearchCommand) private orderSearchCommand: OrderSearchCommand,
        @inject(Types.Command) @named(Targets.Command.order.OrderRootCommand) private orderRootCommand: OrderRootCommand,

        @inject(Types.Command) @named(Targets.Command.orderitem.OrderItemHistoryCommand) private orderItemHistoryCommand: OrderItemHistoryCommand,
        @inject(Types.Command) @named(Targets.Command.orderitem.OrderItemStatusCommand) private orderItemStatusCommand: OrderItemStatusCommand,
        @inject(Types.Command) @named(Targets.Command.orderitem.OrderItemShipCommand) private orderItemShipCommand: OrderItemShipCommand,
        @inject(Types.Command) @named(Targets.Command.orderitem.OrderItemSearchCommand) private orderItemSearchCommand: OrderItemSearchCommand,
        @inject(Types.Command) @named(Targets.Command.orderitem.OrderItemRootCommand) private orderItemRootCommand: OrderItemRootCommand,

        @inject(Types.Command) @named(Targets.Command.paymentinformation.PaymentInformationUpdateCommand) private paymentInformationUpdateCommand: PaymentInformationUpdateCommand,
        @inject(Types.Command) @named(Targets.Command.paymentinformation.PaymentInformationRootCommand) private paymentInformationRootCommand: PaymentInformationRootCommand,

        @inject(Types.Command) @named(Targets.Command.address.AddressListCommand) private addressListCommand: AddressListCommand,
        @inject(Types.Command) @named(Targets.Command.address.AddressAddCommand) private addressAddCommand: AddressAddCommand,
        @inject(Types.Command) @named(Targets.Command.address.AddressUpdateCommand) private addressUpdateCommand: AddressUpdateCommand,
        @inject(Types.Command) @named(Targets.Command.address.AddressRemoveCommand) private addressRemoveCommand: AddressRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.address.AddressRootCommand) private addressRootCommand: AddressRootCommand,

        @inject(Types.Command) @named(Targets.Command.profile.ProfileAddCommand) private profileAddCommand: ProfileAddCommand,
        @inject(Types.Command) @named(Targets.Command.profile.ProfileDefaultCommand) private profileDefaultCommand: ProfileDefaultCommand,
        @inject(Types.Command) @named(Targets.Command.profile.ProfileRemoveCommand) private profileRemoveCommand: ProfileRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.profile.ProfileGetCommand) private profileGetCommand: ProfileGetCommand,
        @inject(Types.Command) @named(Targets.Command.profile.ProfileUpdateCommand) private profileUpdateCommand: ProfileUpdateCommand,
        @inject(Types.Command) @named(Targets.Command.profile.ProfileListCommand) private profileListCommand: ProfileListCommand,
        @inject(Types.Command) @named(Targets.Command.profile.ProfileMnemonicCommand) private profileMnemonicCommand: ProfileMnemonicCommand,
        @inject(Types.Command) @named(Targets.Command.profile.ProfileRootCommand) private profileRootCommand: ProfileRootCommand,

        @inject(Types.Command) @named(Targets.Command.shippingdestination.ShippingDestinationListCommand) private shippingDestinationListCommand: ShippingDestinationListCommand,
        @inject(Types.Command) @named(Targets.Command.shippingdestination.ShippingDestinationAddCommand) private shippingDestinationAddCommand: ShippingDestinationAddCommand,
        @inject(Types.Command) @named(Targets.Command.shippingdestination.ShippingDestinationRemoveCommand) private shippingDestinationRemoveCommand: ShippingDestinationRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.shippingdestination.ShippingDestinationRootCommand) private shippingDestinationRootCommand: ShippingDestinationRootCommand,

        @inject(Types.Command) @named(Targets.Command.listingitemobject.ListingItemObjectSearchCommand) private listingItemObjectSearchCommand: ListingItemObjectSearchCommand,
        @inject(Types.Command) @named(Targets.Command.listingitemobject.ListingItemObjectRootCommand) private listingItemObjectRootCommand: ListingItemObjectRootCommand,

        @inject(Types.Command) @named(Targets.Command.setting.SettingGetCommand) private settingGetCommand: SettingGetCommand,
        @inject(Types.Command) @named(Targets.Command.setting.SettingListCommand) private settingListCommand: SettingListCommand,
        @inject(Types.Command) @named(Targets.Command.setting.SettingRemoveCommand) private settingRemoveCommand: SettingRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.setting.SettingSetCommand) private settingSetCommand: SettingSetCommand,
        @inject(Types.Command) @named(Targets.Command.setting.SettingRootCommand) private settingRootCommand: SettingRootCommand,

        @inject(Types.Command) @named(Targets.Command.shoppingcart.ShoppingCartAddCommand) private shoppingCartAddCommand: ShoppingCartAddCommand,
        @inject(Types.Command) @named(Targets.Command.shoppingcart.ShoppingCartUpdateCommand) private shoppingCartUpdateCommand: ShoppingCartUpdateCommand,
        @inject(Types.Command) @named(Targets.Command.shoppingcart.ShoppingCartRemoveCommand) private shoppingCartRemoveCommand: ShoppingCartRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.shoppingcart.ShoppingCartListCommand) private shoppingCartListCommand: ShoppingCartListCommand,
        @inject(Types.Command) @named(Targets.Command.shoppingcart.ShoppingCartGetCommand) private shoppingCartGetCommand: ShoppingCartGetCommand,
        @inject(Types.Command) @named(Targets.Command.shoppingcart.ShoppingCartClearCommand) private shoppingCartClearCommand: ShoppingCartClearCommand,
        @inject(Types.Command) @named(Targets.Command.shoppingcart.ShoppingCartRootCommand) private shoppingCartRootCommand: ShoppingCartRootCommand,

        @inject(Types.Command) @named(Targets.Command.shoppingcartitem.ShoppingCartItemAddCommand) private shoppingCartItemAddCommand: ShoppingCartItemAddCommand,
        @inject(Types.Command) @named(Targets.Command.shoppingcartitem.ShoppingCartItemRemoveCommand) private shoppingCartItemRemoveCommand: ShoppingCartItemRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.shoppingcartitem.ShoppingCartItemListCommand) private shoppingCartItemListCommand: ShoppingCartItemListCommand,
        @inject(Types.Command) @named(Targets.Command.shoppingcartitem.ShoppingCartItemRootCommand) private shoppingCartItemRootCommand: ShoppingCartItemRootCommand,

        @inject(Types.Command) @named(Targets.Command.priceticker.PriceTickerRootCommand) private priceTickerRootCommand: PriceTickerRootCommand,
        @inject(Types.Command) @named(Targets.Command.currencyprice.CurrencyPriceRootCommand) private currencyPriceRootCommand: CurrencyPriceRootCommand,

        @inject(Types.Command) @named(Targets.Command.proposal.ProposalGetCommand) private proposalGetCommand: ProposalGetCommand,
        @inject(Types.Command) @named(Targets.Command.proposal.ProposalPostCommand) private proposalPostCommand: ProposalPostCommand,
        @inject(Types.Command) @named(Targets.Command.proposal.ProposalListCommand) private proposalListCommand: ProposalListCommand,
        @inject(Types.Command) @named(Targets.Command.proposal.ProposalResultCommand) private proposalResultCommand: ProposalResultCommand,
        @inject(Types.Command) @named(Targets.Command.proposal.ProposalRootCommand) private proposalRootCommand: ProposalRootCommand,

        @inject(Types.Command) @named(Targets.Command.vote.VotePostCommand) private votePostCommand: VotePostCommand,
        @inject(Types.Command) @named(Targets.Command.vote.VoteGetCommand) private voteGetCommand: VoteGetCommand,
        @inject(Types.Command) @named(Targets.Command.vote.VoteListCommand) private voteListCommand: VoteListCommand,
        @inject(Types.Command) @named(Targets.Command.vote.VoteRootCommand) private voteRootCommand: VoteRootCommand,

        @inject(Types.Command) @named(Targets.Command.smsg.SmsgSearchCommand) private smsgSearchCommand: SmsgSearchCommand,
        @inject(Types.Command) @named(Targets.Command.smsg.SmsgRemoveCommand) private smsgRemoveCommand: SmsgRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.smsg.SmsgResendCommand) private smsgResendCommand: SmsgResendCommand,
        @inject(Types.Command) @named(Targets.Command.smsg.SmsgRootCommand) private smsgRootCommand: SmsgRootCommand,

        @inject(Types.Command) @named(Targets.Command.identity.IdentityAddCommand) private identityAddCommand: IdentityAddCommand,
        @inject(Types.Command) @named(Targets.Command.identity.IdentityFundCommand) private identityFundCommand: IdentityFundCommand,
        @inject(Types.Command) @named(Targets.Command.identity.IdentityListCommand) private identityListCommand: IdentityListCommand,
        @inject(Types.Command) @named(Targets.Command.identity.IdentityRootCommand) private identityRootCommand: IdentityRootCommand,

        @inject(Types.Command) @named(Targets.Command.blacklist.BlacklistAddCommand) private blacklistAddCommand: BlacklistAddCommand,
        @inject(Types.Command) @named(Targets.Command.blacklist.BlacklistListCommand) private blacklistListCommand: BlacklistListCommand,
        @inject(Types.Command) @named(Targets.Command.blacklist.BlacklistRootCommand) private blacklistRootCommand: BlacklistRootCommand,

        @inject(Types.Command) @named(Targets.Command.notification.NotificationSearchCommand) private notificationSearchCommand: NotificationSearchCommand,
        @inject(Types.Command) @named(Targets.Command.notification.NotificationRemoveCommand) private notificationRemoveCommand: NotificationRemoveCommand,
        @inject(Types.Command) @named(Targets.Command.notification.NotificationSetReadCommand) private notificationSetReadCommand: NotificationSetReadCommand,
        @inject(Types.Command) @named(Targets.Command.notification.NotificationRootCommand) private notificationRootCommand: NotificationRootCommand,

        @inject(Types.Command) @named(Targets.Command.HelpCommand) private helpCommand: HelpCommand,

        //  ---
        // @multiInject(Types.Command) public commands: RpcCommand<any>[],
        // @multiInject(Types.Command) @named(Targets.AllCommands) private commands: Array<RpcCommand<any>>,
        // @multiInject(Types.Command) @named('Command') private commands: Command[],
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);

        this.commands.push(daemonRootCommand);

        this.commands.push(bidRootCommand);
        this.commands.push(bidSearchCommand);
        this.commands.push(bidGetCommand);
        this.commands.push(bidAcceptCommand);
        this.commands.push(bidCancelCommand);
        this.commands.push(bidRejectCommand);
        this.commands.push(bidSendCommand);

        this.commands.push(commentRootCommand);
        this.commands.push(commentPostCommand);
        this.commands.push(commentGetCommand);
        this.commands.push(commentSearchCommand);
        this.commands.push(commentCountCommand);

        this.commands.push(adminCommand);
        this.commands.push(statusCommand);
        this.commands.push(publishTestDataCommand);

        this.commands.push(dataAddCommand);
        this.commands.push(dataCleanCommand);
        this.commands.push(dataGenerateCommand);
        this.commands.push(dataRootCommand);

        this.commands.push(escrowRootCommand);
        this.commands.push(escrowCompleteCommand);
        this.commands.push(escrowUpdateCommand);
        this.commands.push(escrowLockCommand);
        this.commands.push(escrowRefundCommand);
        this.commands.push(escrowReleaseCommand);

        this.commands.push(favoriteRootCommand);
        this.commands.push(favoriteListCommand);
        this.commands.push(favoriteAddCommand);
        this.commands.push(favoriteRemoveCommand);

        this.commands.push(itemCategoryListCommand);
        this.commands.push(itemCategoryAddCommand);
        this.commands.push(itemCategorySearchCommand);
        this.commands.push(itemCategoryGetCommand);
        this.commands.push(itemCategoryRemoveCommand);
        this.commands.push(itemCategoryUpdateCommand);
        this.commands.push(itemCategoryRootCommand);

        this.commands.push(imageRootCommand);
        this.commands.push(imageAddCommand);
        this.commands.push(imageCompressCommand);
        this.commands.push(imageListCommand);
        this.commands.push(imageRemoveCommand);

        this.commands.push(itemInformationGetCommand);
        this.commands.push(itemInformationUpdateCommand);
        this.commands.push(itemInformationRootCommand);

        this.commands.push(itemLocationUpdateCommand);
        this.commands.push(itemLocationRootCommand);

        this.commands.push(listingItemGetCommand);
        this.commands.push(listingItemFlagCommand);
        this.commands.push(listingItemSearchCommand);
        this.commands.push(listingItemRootCommand);

        this.commands.push(listingItemTemplatePostCommand);
        this.commands.push(listingItemTemplateAddCommand);
        this.commands.push(listingItemTemplateRemoveCommand);
        this.commands.push(listingItemTemplateGetCommand);
        this.commands.push(listingItemTemplateSearchCommand);
        this.commands.push(listingItemTemplateSizeCommand);
        this.commands.push(listingItemTemplateCompressCommand);
        this.commands.push(listingItemTemplateCloneCommand);
        this.commands.push(listingItemTemplateFeatureImageCommand);
        this.commands.push(listingItemTemplateRootCommand);

        this.commands.push(marketAddCommand);
        this.commands.push(marketFlagCommand);
        this.commands.push(marketGetCommand);
        this.commands.push(marketListCommand);
        this.commands.push(marketRemoveCommand);
        this.commands.push(marketDefaultCommand);
        this.commands.push(marketJoinCommand);
        this.commands.push(marketPostCommand);
        this.commands.push(marketSearchCommand);
        this.commands.push(marketRootCommand);

        this.commands.push(messagingInformationUpdateCommand);
        this.commands.push(messagingInformationRootCommand);

        this.commands.push(orderRootCommand);
        this.commands.push(orderSearchCommand);

        this.commands.push(orderItemRootCommand);
        this.commands.push(orderItemHistoryCommand);
        this.commands.push(orderItemStatusCommand);
        this.commands.push(orderItemSearchCommand);
        this.commands.push(orderItemShipCommand);

        this.commands.push(paymentInformationUpdateCommand);
        this.commands.push(paymentInformationRootCommand);

        this.commands.push(addressRootCommand);
        this.commands.push(addressListCommand);
        this.commands.push(addressAddCommand);
        this.commands.push(addressUpdateCommand);
        this.commands.push(addressRemoveCommand);

        this.commands.push(profileAddCommand);
        this.commands.push(profileDefaultCommand);
        this.commands.push(profileRemoveCommand);
        this.commands.push(profileGetCommand);
        this.commands.push(profileUpdateCommand);
        this.commands.push(profileListCommand);
        this.commands.push(profileMnemonicCommand);
        this.commands.push(profileRootCommand);

        this.commands.push(shippingDestinationRootCommand);
        this.commands.push(shippingDestinationListCommand);
        this.commands.push(shippingDestinationAddCommand);
        this.commands.push(shippingDestinationRemoveCommand);

        this.commands.push(listingItemObjectRootCommand);
        this.commands.push(listingItemObjectSearchCommand);

        this.commands.push(settingGetCommand);
        this.commands.push(settingListCommand);
        this.commands.push(settingRemoveCommand);
        this.commands.push(settingSetCommand);
        this.commands.push(settingRootCommand);

        this.commands.push(shoppingCartAddCommand);
        this.commands.push(shoppingCartUpdateCommand);
        this.commands.push(shoppingCartRemoveCommand);
        this.commands.push(shoppingCartListCommand);
        this.commands.push(shoppingCartGetCommand);
        this.commands.push(shoppingCartClearCommand);
        this.commands.push(shoppingCartRootCommand);

        this.commands.push(shoppingCartItemAddCommand);
        this.commands.push(shoppingCartItemRemoveCommand);
        this.commands.push(shoppingCartItemListCommand);
        this.commands.push(shoppingCartItemRootCommand);

        this.commands.push(priceTickerRootCommand);

        this.commands.push(proposalGetCommand);
        this.commands.push(proposalPostCommand);
        this.commands.push(proposalListCommand);
        this.commands.push(proposalResultCommand);
        this.commands.push(proposalRootCommand);

        this.commands.push(currencyPriceRootCommand);

        this.commands.push(votePostCommand);
        this.commands.push(voteGetCommand);
        this.commands.push(voteListCommand);
        this.commands.push(voteRootCommand);

        this.commands.push(smsgSearchCommand);
        this.commands.push(smsgRemoveCommand);
        this.commands.push(smsgResendCommand);
        this.commands.push(smsgRootCommand);

        this.commands.push(identityAddCommand);
        this.commands.push(identityFundCommand);
        this.commands.push(identityListCommand);
        this.commands.push(identityRootCommand);

        this.commands.push(blacklistAddCommand);
        this.commands.push(blacklistListCommand);
        this.commands.push(blacklistRootCommand);

        this.commands.push(notificationSearchCommand);
        this.commands.push(notificationRemoveCommand);
        this.commands.push(notificationSetReadCommand);
        this.commands.push(notificationRootCommand);

        this.commands.push(helpCommand);

        this.log.debug(this.commands.length + ' commands initialized.');

    }

    /**
     * todo: if requested commandType is rootCommand, the loop through the rootCommands and match using name.
     * this should allow 'links' from subcommands back to root commands
     *
     * @param commandType
     * @returns {RpcCommandInterface<any>}
     */
    public get(commandType: Command): RpcCommandInterface<any> {
        // this.log.debug('Looking for command <' + commandType.toString() + '>');
        for (const commandInstance of this.commands) {
            if (commandInstance.getCommand().toString() === commandType.toString()) {
                // this.log.debug('Found ' + commandInstance.getCommand().toString());
                if (commandType.commandType === EnvironmentType.ALL || Environment.isDevelopment() || Environment.isTest()) {
                    return commandInstance;
                } else {
                    this.log.debug('Environment not correct to get ' + commandInstance.getCommand().toString());
                }
            }
        }
        throw new MessageException('Couldn\'t find command <' + commandType.toString() + '>\n');
    }
}
// tslint:enable:array-type
// tslint:enable:max-line-length
