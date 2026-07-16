import { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { PurchaseOrderService } from '../services/PurchaseOrderService';
import { PaymentIntentService } from '../services/PaymentIntentService';
import { Invoice } from '../models/Invoice';
import { PaymentIntent } from '../models/PaymentIntent';
import Merchant from '../models/Merchant';

export class PurchaseOrderController {
    private readonly purchaseOrderService: PurchaseOrderService;
    private readonly paymentIntentService: PaymentIntentService;

    constructor(purchaseOrderService: PurchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
        this.paymentIntentService = new PaymentIntentService();
    }

    // =========================================================================
    // RESOLVE AUTHENTICATED MERCHANT
    // =========================================================================
    // Never trust merchantId sent from the frontend.
    // The merchant is always derived from the authenticated JWT user.
    // =========================================================================
    private getAuthenticatedMerchant = async (
        req: Request,
        res: Response
    ): Promise<Merchant | null> => {
        const userId = Number((req as any).user?.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized. User context is missing.',
            });

            return null;
        }

        const merchant = await Merchant.findOne({
            where: { userId },
        });

        if (!merchant) {
            res.status(403).json({
                success: false,
                message: 'No merchant is linked to this user account.',
            });

            return null;
        }

        return merchant;
    };

    // =========================================================================
    // PARSE PURCHASE ORDER ID
    // =========================================================================
    private parsePurchaseOrderId = (
        req: Request,
        res: Response
    ): number | null => {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({
                success: false,
                message: 'Invalid purchase order ID.',
            });

            return null;
        }

        return id;
    };

    // =========================================================================
    // CREATE PURCHASE ORDER
    // =========================================================================
    createPurchaseOrder = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });

                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            // Do not mutate req.body and do not accept merchantId from the client.
            const purchaseOrderPayload = {
                ...req.body,
                merchantId: merchant.id,
            };

            const purchaseOrder =
                await this.purchaseOrderService.createPurchaseOrder(
                    purchaseOrderPayload
                );

            res.status(201).json({
                success: true,
                data: purchaseOrder,
            });
        } catch (error: any) {
            console.error('createPurchaseOrder error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message || 'Failed to create purchase order.',
            });
        }
    };

    // =========================================================================
    // GET AUTHENTICATED MERCHANT'S PURCHASE ORDERS
    // =========================================================================
    getAllPurchaseOrders = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const page = Math.max(Number(req.query.page) || 1, 1);
            const requestedLimit = Number(req.query.limit) || 20;

            // Prevent users from requesting an excessive number of records.
            const limit = Math.min(Math.max(requestedLimit, 1), 100);

            const result =
                await this.purchaseOrderService.getAllPurchaseOrders(
                    { merchantId: merchant.id },
                    page,
                    limit
                );

            res.status(200).json({
                success: true,
                data: result.purchaseOrders,
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit),
            });
        } catch (error: any) {
            console.error('getAllPurchaseOrders error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message || 'Failed to retrieve purchase orders.',
            });
        }
    };

    // =========================================================================
    // GET ONE PURCHASE ORDER
    // =========================================================================
    //
    // CHANGED FOR RESUMABLE PAYMENT
    // -------------------------------------------------------------------------
    // Previously this endpoint returned only the PurchaseOrder, its items and
    // merchant. PurchaseOrderService intentionally does not load payment-domain
    // models, so invoice/paymentIntent were always missing from the response.
    //
    // The controller now:
    // 1. Loads the merchant-owned PurchaseOrder through PurchaseOrderService.
    // 2. Finds the latest PaymentIntent created for that PurchaseOrder.
    // 3. Finds the Invoice linked to that PaymentIntent.
    // 4. Places invoice and paymentIntent INSIDE data so the existing frontend
    //    can read po.invoice and po.paymentIntent without changing API shape.
    //
    // WHY:
    // An approved customer can leave and return later, open the PO details page,
    // and continue the existing invoice payment flow without creating another
    // PurchaseOrder, PaymentIntent or Invoice.
    // =========================================================================
    getPurchaseOrderById = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const purchaseOrder =
                await this.purchaseOrderService.getPurchaseOrderById(
                    id,
                    merchant.id
                );

            if (!purchaseOrder) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            // -----------------------------------------------------------------
            // NEW: Find the existing PaymentIntent for this PurchaseOrder.
            //
            // IMPORTANT:
            // We query the payment model here instead of adding it to
            // DatabaseModels/PurchaseOrderService. This preserves the existing
            // service responsibility and merchant-isolation design.
            // -----------------------------------------------------------------
            const paymentIntent = await PaymentIntent.findOne({
                where: {
                    purchase_order_id: id,
                },
                order: [['createdAt', 'DESC']],
            });

            // -----------------------------------------------------------------
            // NEW: Find the Invoice linked to the PaymentIntent.
            //
            // The invoice is optional because pending/non-approved orders may
            // legitimately have no payment records yet.
            // -----------------------------------------------------------------
            const invoice = paymentIntent
                ? await Invoice.findOne({
                    where: {
                        payment_intent_id: paymentIntent.id,
                        merchant_id: merchant.id,
                    },
                    order: [['createdAt', 'DESC']],
                })
                : null;

            const purchaseOrderJson =
                typeof (purchaseOrder as any).toJSON === 'function'
                    ? (purchaseOrder as any).toJSON()
                    : purchaseOrder;

            // -----------------------------------------------------------------
            // CHANGED RESPONSE:
            //
            // invoice/paymentIntent are included inside data because the
            // frontend currently stores response.data.data as the PO object.
            //
            // The top-level copies are also retained for backwards compatibility
            // with clients that may already read response.data.invoice.
            // -----------------------------------------------------------------
            const enrichedPurchaseOrder = {
                ...purchaseOrderJson,
                invoice,
                paymentIntent,

                // Convenience properties used by the details UI.
                invoiceId: invoice?.id ?? null,
                invoiceStatus: invoice?.status ?? null,
                paymentIntentId: paymentIntent?.id ?? null,
                paymentStatus: paymentIntent?.status ?? null,
            };

            res.status(200).json({
                success: true,
                data: enrichedPurchaseOrder,
                invoice,
                paymentIntent,
            });
        } catch (error: any) {
            console.error('getPurchaseOrderById error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to retrieve purchase order.',
            });
        }
    };

    // =========================================================================
    // CREATE OR REOPEN PAYMENT REQUEST
    // =========================================================================
    //
    // NEW ENDPOINT:
    // POST /api/purchase-orders/:id/payment-request
    //
    // WHAT IT DOES:
    // 1. Validates the authenticated merchant owns the Purchase Order.
    // 2. Requires the order to be APPROVED and not already paid/completed.
    // 3. Creates or reuses the PaymentIntent.
    // 4. Creates or reuses the Invoice.
    // 5. Returns the data required by PaymentRequestModal.
    //
    // WHY:
    // If the user closes the Payment Request modal, the PO remains APPROVED.
    // When the user returns and clicks "Complete Payment", this endpoint safely
    // reopens the same payment request instead of creating duplicates.
    // =========================================================================
    createPaymentRequest = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id =
                this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant =
                await this.getAuthenticatedMerchant(
                    req,
                    res
                );

            if (!merchant) {
                return;
            }

            const purchaseOrder =
                await this.purchaseOrderService.getPurchaseOrderById(
                    id,
                    merchant.id
                );

            if (!purchaseOrder) {
                res.status(404).json({
                    success: false,
                    message:
                        'Purchase order not found.',
                });

                return;
            }

            const status = String(
                purchaseOrder.status || ''
            ).toLowerCase();

            if (
                status === 'paid' ||
                status === 'completed'
            ) {
                res.status(409).json({
                    success: false,
                    message:
                        'This purchase order has already been paid.',
                });

                return;
            }

            if (status !== 'approved') {
                res.status(409).json({
                    success: false,
                    message:
                        'Only an approved purchase order can create a payment request.',
                });

                return;
            }

            const paymentIntent =
                await this.paymentIntentService.createFromPurchaseOrder(
                    purchaseOrder
                );

            // -------------------------------------------------------------
            // FIX:
            // Load the Invoice directly from the Invoice model.
            //
            // WHY:
            // PaymentIntentService does not expose
            // getInvoiceByPaymentIntentId() in the current codebase.
            // The old call caused TS2339 compilation errors.
            // -------------------------------------------------------------
            const invoice = await Invoice.findOne({
                where: {
                    payment_intent_id: paymentIntent.id,
                    merchant_id: merchant.id,
                },
                order: [['createdAt', 'DESC']],
            });

            if (!invoice) {
                throw new Error(
                    'Payment request was created, but its invoice could not be loaded.'
                );
            }

            res.status(200).json({
                success: true,
                message:
                    'Payment request is ready.',

                // The modal consumes paymentIntent directly.
                data: {
                    paymentIntent,
                    invoice,
                },
            });
        } catch (error: any) {
            console.error(
                'createPaymentRequest error:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to create payment request.',
            });
        }
    };


    // =========================================================================
    // UPDATE PURCHASE ORDER
    // =========================================================================
    updatePurchaseOrder = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            // Never allow ownership to be reassigned from the request body.
            const {
                merchantId: ignoredMerchantId,
                userId: ignoredUserId,
                ...safePayload
            } = req.body;

            const updatedPurchaseOrder =
                await this.purchaseOrderService.updatePurchaseOrder(
                    id,
                    merchant.id,
                    safePayload
                );

            if (!updatedPurchaseOrder) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            res.status(200).json({
                success: true,
                data: updatedPurchaseOrder,
            });
        } catch (error: any) {
            console.error('updatePurchaseOrder error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message || 'Failed to update purchase order.',
            });
        }
    };

    // =========================================================================
    // UPDATE PURCHASE ORDER STATUS
    // =========================================================================
    updatePurchaseOrderStatus = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const status = String(req.body.status || '')
                .trim()
                .toLowerCase();

            const allowedStatuses = [
                'pending',
                'approved',
                'rejected',
                'cancelled',
            ];

            if (!allowedStatuses.includes(status)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid status. Allowed values: ${allowedStatuses.join(
                        ', '
                    )}.`,
                });

                return;
            }

            // This service method must use both id and merchantId in its query.
            const purchaseOrder =
                await this.purchaseOrderService.updatePurchaseOrderStatus(
                    id,
                    merchant.id,
                    status
                );

            if (!purchaseOrder) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            let paymentIntent = null;
            let invoice = null;

            if (status === 'approved') {
                // -------------------------------------------------------------
                // CHANGED:
                // PaymentIntentService now creates OR reuses the PaymentIntent
                // and guarantees that its Invoice exists.
                //
                // WHY:
                // The previous controller created another Invoice after calling
                // createFromPurchaseOrder(), which could create duplicates.
                // -------------------------------------------------------------
                paymentIntent =
                    await this.paymentIntentService.createFromPurchaseOrder(
                        purchaseOrder
                    );

                // ---------------------------------------------------------
                // FIX:
                // Query Invoice directly instead of calling a method that
                // does not exist on PaymentIntentService.
                // ---------------------------------------------------------
                invoice = await Invoice.findOne({
                    where: {
                        payment_intent_id: paymentIntent.id,
                        merchant_id: merchant.id,
                    },
                    order: [['createdAt', 'DESC']],
                });
            }

            res.status(200).json({
                success: true,
                data: purchaseOrder,
                paymentIntent,
                invoice,
            });
        } catch (error: any) {
            console.error('updatePurchaseOrderStatus error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to update purchase order status.',
            });
        }
    };

    // =========================================================================
    // DELETE PURCHASE ORDER
    // =========================================================================
    deletePurchaseOrder = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const deleted =
                await this.purchaseOrderService.deletePurchaseOrder(
                    id,
                    merchant.id
                );

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            res.status(200).json({
                success: true,
                message: 'Purchase order deleted successfully.',
            });
        } catch (error: any) {
            console.error('deletePurchaseOrder error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message || 'Failed to delete purchase order.',
            });
        }
    };

    // =========================================================================
    // ADD ITEM TO PURCHASE ORDER
    // =========================================================================
    addItemToPurchaseOrder = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const item =
                await this.purchaseOrderService.addItemToPurchaseOrder(
                    id,
                    merchant.id,
                    req.body
                );

            if (!item) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            res.status(201).json({
                success: true,
                data: item,
            });
        } catch (error: any) {
            console.error('addItemToPurchaseOrder error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to add item to purchase order.',
            });
        }
    };

    // =========================================================================
    // PURCHASE ORDER STATS
    // =========================================================================
    getPurchaseOrderStats = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const stats =
                await this.purchaseOrderService.getPurchaseOrderStats(
                    merchant.id
                );

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error: any) {
            console.error('getPurchaseOrderStats error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to retrieve purchase order statistics.',
            });
        }
    };
}