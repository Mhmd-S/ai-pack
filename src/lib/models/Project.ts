import mongoose, { ObjectId, Schema, model } from 'mongoose';

// Interface for Face Properties (stored in DB)
export interface IFacePropertiesDB {
	faceName: string;
	isSolidColor: boolean;
	solidColorValue?: string;
	designUrl?: string;
	texture?: string;
	designElements?: {
		type: 'text' | 'image' | 'shape';
		content: {
			text?: string;
			imageUrl?: string;
			shapeType?: 'rectangle' | 'circle' | 'triangle';
		};
		position: {
			x: number;
			y: number;
			z: number;
		};
		scale: {
			x: number;
			y: number;
			z: number;
		};
		style: {
			color?: string;
			backgroundColor?: string;
			opacity?: number;
			fontFamily?: string;
			fontSize?: number;
			fontWeight?: string;
			borderColor?: string;
			borderWidth?: number;
			borderRadius?: number;
		};
		faceName: string;
	}[];
}

// Interface for Scale/Rotation (stored in DB)
export interface IScaleRotation {
	x: number;
	y: number;
	z: number;
}

// Interface for Model Properties (stored in DB)
export interface IModelProperties {
	modelType: string;
	modelPath: string;
	scale: IScaleRotation;
	rotation: IScaleRotation;
	faces: IFacePropertiesDB[];
	version?: number;
	lastConfigEdited?: Date;
}

// Interface for project document
export interface ProjectDocument {
	_id: ObjectId;
	userId: ObjectId;
	model: IModelProperties;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

// Schema for Face Properties
const FacePropertiesSchema = new Schema<IFacePropertiesDB>(
	{
		faceName: { type: String, required: true },
		isSolidColor: { type: Boolean, required: true },
		solidColorValue: { type: String },
		designUrl: { type: String },
		texture: { type: String },
		designElements: [
			{
				type: {
					type: String,
					enum: ['text', 'image', 'shape'],
					required: true,
				},
				content: {
					text: { type: String },
					imageUrl: { type: String },
					shapeType: {
						type: String,
						enum: ['rectangle', 'circle', 'triangle'],
					},
				},
				position: {
					x: { type: Number, required: true },
					y: { type: Number, required: true },
					z: { type: Number, required: true },
				},
				scale: {
					x: { type: Number, required: true },
					y: { type: Number, required: true },
					z: { type: Number, required: true },
				},
				style: {
					color: { type: String },
					backgroundColor: { type: String },
					opacity: { type: Number },
					fontFamily: { type: String },
					fontSize: { type: Number },
					fontWeight: { type: String },
					borderColor: { type: String },
					borderWidth: { type: Number },
					borderRadius: { type: Number },
				},
				faceName: { type: String, required: true },
			},
		],
	},
	{ _id: false }
);

// Schema for Scale/Rotation
const ScaleRotationSchema = new Schema<IScaleRotation>(
	{
		x: { type: Number, required: true },
		y: { type: Number, required: true },
		z: { type: Number, required: true },
	},
	{ _id: false }
);

// Schema for Model Properties
const ModelPropertiesSchema = new Schema<IModelProperties>({
	modelType: { type: String, required: true },
	modelPath: { type: String, required: true },
	scale: { type: ScaleRotationSchema, required: true },
	rotation: { type: ScaleRotationSchema, required: true },
	faces: { type: [FacePropertiesSchema], default: [] },
	version: { type: Number, default: 1 },
	lastConfigEdited: { type: Date, default: Date.now },
});

// Main project schema
const ProjectSchema = new Schema<ProjectDocument>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		model: { type: ModelPropertiesSchema, required: true },
		status: { type: String, required: true, default: 'draft' },
	},
	{
		timestamps: true,
	}
);

const Project =
	mongoose.models.Project || model<ProjectDocument>('Project', ProjectSchema);

export default Project;
