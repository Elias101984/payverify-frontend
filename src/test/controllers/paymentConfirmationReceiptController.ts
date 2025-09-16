import { Request, Response } from 'express';
import PaymentConfirmationReceipt from '../../models/PaymentConfirmationReceipt';
import Payment from '../../models/Payment';
import Transaction from '../../models/Transaction';
import { Merchant } from '../../models/Merchant';
import { User } from '../../models/User';
import { sendConfirmationEmail } from '../../services/emailService';

/**
 * POST /api/receipts
 * Creates a confirmation receipt for a payment and notifies the merchant.
 *
 * SRP: Handles only confirmation creation and email sending logic.
 * DRY: Fetches all needed associations in one query.
 * Loose Coupling: Uses service and model abstraction.
 */
export const createPaymentReceipt = async (req: Request, res: Response) => {
    try {
        const { paymentId } = req.body;

        // Validate input
        if (!paymentId) {
            return res.status(400).json({ message: 'Payment ID is required.' });
        }

        const payment = await Payment.findByPk(paymentId, {
            include: [
                {
                    model: Transaction,
                    as: 'transaction',
                    include: [
                        {
                            model: Merchant,
                            as: 'merchant',
                            include: [
                                {
                                    model: User,
                                    as: 'user'
                                }
                            ]
                        }
                    ]
                }
            ]
        });


        if (!payment || !payment.transaction) {
            return res.status(404).json({ message: 'Payment or transaction not found.' });
        }

        const transaction = payment.transaction;
        const merchant = transaction.merchant;

        // Ensure we have the merchant email from associated User
        const merchantEmail = merchant?.user?.email;
        if (!merchantEmail) {
            return res.status(404).json({ message: 'Merchant email not found.' });
        }

        // Avoid duplicate receipt
        const existing = await PaymentConfirmationReceipt.findOne({
            where: { paymentId }
        });

        if (existing) {
            return res.status(409).json({ message: 'Receipt already exists for this payment.' });
        }

        // Create confirmation receipt
        const baseUrl = process.env.RECEIPT_BASE_URL || 'https://dummy.payverify.io'; // fallback
        const receipt = await PaymentConfirmationReceipt.create({
            paymentId,
            receiptUrl: `${baseUrl}/receipts/${paymentId}`,
            deliveredTo: merchantEmail,
            deliveredAt: new Date()
        });


        // Send email notification
        await sendConfirmationEmail(
            merchantEmail,
            'Your Payment Confirmation Receipt',
            `<p>Hello ${merchant.name},</p>
             <p>Your payment has been confirmed.</p>
             <p><strong>Reference:</strong> ${transaction.reference}</p>
             <p><strong>Amount:</strong> ?${transaction.amount}</p>
             <p><strong>Date:</strong> ${receipt.deliveredAt.toLocaleString()}</p>
             <p>Thank you for using <strong>PayVerify</strong>.</p>`
        );

        return res.status(201).json({
            message: 'Receipt created and email sent successfully.',
            receipt
        });
    } catch (error) {
        console.error('Error creating payment receipt:', error);
        return res.status(500).json({ message: 'Server error.' });
    }
};
