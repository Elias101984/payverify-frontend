import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';

/**
 * Uploads an image buffer to Cloudinary using a readable stream.
 *
 * @param buffer - The image data as a Node.js Buffer (e.g., a QR code).
 * @param filename - The desired public ID (filename) for the uploaded asset in Cloudinary.
 * @returns A Promise that resolves to the Cloudinary secure URL of the uploaded image.
 *
 * Why:
 * - Cloudinary's Node SDK uses streams for upload efficiency.
 * - `streamifier` allows us to turn a buffer into a readable stream.
 * - We use `public_id` to ensure consistent and unique naming.
 */
export const uploadToCloudinary = (buffer: Buffer, filename: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Create an upload stream to Cloudinary with a target folder and filename
        const stream = cloudinary.uploader.upload_stream(
            {
                public_id: `payverify/qr/${filename}`,  // Folder structure in Cloudinary
                resource_type: 'image'                 // Ensures it's treated as an image asset
            },
            (error, result) => {
                // If Cloudinary returns an error, reject the promise
                if (error) return reject(error);

                // If for any reason result is missing or secure_url is not returned, handle it gracefully
                if (!result?.secure_url) {
                    return reject(new Error('No secure_url returned from Cloudinary'));
                }

                // Upload successful: resolve with the secure URL (https-hosted)
                resolve(result.secure_url);
            }
        );

        // Pipe the buffer into the Cloudinary stream using streamifier
        streamifier.createReadStream(buffer).pipe(stream);
    });
};
