import { generateQRCode } from '../services/qrService';
import { MerchantModel } from '../models/Merchant';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { uploadToCloudinary } from '../utils/cloudinaryUploader';

jest.mock('../../models/Merchant');
jest.mock('jsonwebtoken');
jest.mock('qrcode');
jest.mock('../../utils/cloudinaryUploader');

describe('QR Code Generation', () => {
    let req: any, res: any;

    beforeEach(() => {
        req = {
            user: { id: 1 },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        jest.clearAllMocks();
    });

    it('should generate and upload QR code successfully', async () => {
        const mockMerchant = {
            id: 101,
            name: 'TestBiz',
            account_number: '1234567890',
            bank_name: 'TestBank',
            save: jest.fn()
        };

        (MerchantModel.findOne as jest.Mock).mockResolvedValue(mockMerchant);
        (jwt.sign as jest.Mock).mockReturnValue('mock.jwt.token');
        (QRCode.toBuffer as jest.Mock).mockResolvedValue(Buffer.from('mockQR'));
        (uploadToCloudinary as jest.Mock).mockResolvedValue('https://mock.qr.url/image.png');

        await generateQRCode(req, res);

        expect(MerchantModel.findOne).toHaveBeenCalledWith({ where: { userId: 1 } });
        expect(QRCode.toBuffer).toHaveBeenCalled();
        expect(uploadToCloudinary).toHaveBeenCalled();
        expect(mockMerchant.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ qrUrl: 'https://mock.qr.url/image.png' });
    });

    it('should return 401 if user is unauthorized', async () => {
        req.user = {};

        await generateQRCode(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized user' });
    });

    it('should return 404 if merchant not found', async () => {
        (MerchantModel.findOne as jest.Mock).mockResolvedValue(null);

        await generateQRCode(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Merchant not found' });
    });

    it('should handle internal errors and return 500', async () => {
        (MerchantModel.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

        await generateQRCode(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'QR generation failed' });
    });
});
