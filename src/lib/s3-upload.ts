import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3Client = new S3Client({
	region: process.env.S3_REGION || 'us-east-1',
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
	},
	endpoint: process.env.S3_LOCATION,
});

export async function uploadToS3(file: File, userId: string): Promise<string> {
	// Generate a unique file name
	const fileExt = file.name.split('.').pop();
	const fileName = `${userId}/${uuidv4()}.${fileExt}`;

	// Convert File to Buffer for upload
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	// Upload to S3
	const params = {
		Bucket: process.env.S3_BUCKET_NAME,
		Key: fileName,
		Body: buffer,
		ContentType: file.type,
	};

	await s3Client.send(new PutObjectCommand(params));

	// Return the URL to the uploaded file
	return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
}
