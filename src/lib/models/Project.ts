// ... existing code ...
import mongoose, { ObjectId, Schema, model, Document } from 'mongoose';

// Interface for individual design elements on a die-line section
export interface ISectionDesign {
	_id: false; // To prevent Mongoose from creating _id for sub-documents if not needed as top-level
	sectionName: string; // e.g., "frontPanel", "sidePanelLeft", "lidTop"
	designOutputUrl?: string; // URL to the AI-generated image/texture for this section (from Flux)
	isSolidColor: boolean; // If true, this section is a solid color, not AI-generated
	solidColorValue?: string; // Hex color if isSolidColor is true (e.g., "#FFFFFF")
	// Potentially add coordinates/mask info here if needed later for precise programmatic overlays,
	// though initially, we planned to handle overlays in the app logic.
}

// Interface for one complete design variation (composed of multiple section designs)
export interface IDesignVariation {
	_id: false;
	variationId: string; // Unique ID for this variation (e.g., UUID or another ObjectId string)
	sections: ISectionDesign[];
	// previewImageUrl?: string; // Optional: A pre-rendered flat preview of the assembled dieline for this variation
}

// Interface for user-provided inputs
export interface IUserInputs {
	_id: false;
	businessName: string;
	logoUrl: string; // URL to uploaded logo image
	colors: string[]; // Array of brand colors (hex, e.g., ["#FF0000", "#00FF00"])
	tagline?: string;
	styleCue?: string; // e.g., "modern", "vintage", "minimalist"
}

export interface ProjectDocument extends Document { // Extend Mongoose Document
	_id: ObjectId;
	userId: ObjectId; // Reference to the user

	userInputs: IUserInputs;

	packagingType: string; // e.g., "burgerClamshell", "coffeeCup", "frenchFryCarton"
	packagingSize: string; // e.g., "standard", "12oz", "small" - important for dieline selection
	dielineIdentifier: string; // Unique key for the specific dieline, e.g., "coffeeCup-12oz-standard"

	generatedDesignVariations: IDesignVariation[];
	selectedVariationId?: string; // The variationId of the user's chosen design

	// Status & Metadata
	status: 'pending' | 'generating' | 'review' | 'completed' | 'error';
	createdAt: Date;
	updatedAt: Date;
}

// Sub-schema for ISectionDesign
const SectionDesignSchema = new Schema<ISectionDesign>(
	{
		sectionName: { type: String, required: true },
		designOutputUrl: { type: String, required: false },
		isSolidColor: { type: Boolean, required: true, default: false },
		solidColorValue: { type: String, required: false },
	},
	{ _id: false }
);

// Sub-schema for IDesignVariation
const DesignVariationSchema = new Schema<IDesignVariation>(
	{
		variationId: {
			type: String,
			required: true,
			default: () => new mongoose.Types.ObjectId().toHexString(), // Auto-generate a unique ID
		},
		sections: [SectionDesignSchema],
		// previewImageUrl: { type: String, required: false },
	},
	{ _id: false }
);

// Sub-schema for IUserInputs
const UserInputsSchema = new Schema<IUserInputs>(
	{
		businessName: { type: String, required: true },
		logoUrl: { type: String, required: true },
		colors: [{ type: String, required: true }],
		tagline: { type: String, required: false },
		styleCue: { type: String, required: false },
	},
	{ _id: false }
);

const ProjectSchema = new Schema<ProjectDocument>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User', // Assuming you have a User model
			required: true,
		},
		userInputs: { type: UserInputsSchema, required: true },
		packagingType: {
			type: String,
			required: true,
			// enum: ['burgerClamshell', 'coffeeCup', 'frenchFryCarton'], // Add more as you expand
		},
		packagingSize: {
			type: String,
			required: true,
			// enum: ['small', 'medium', 'large', '8oz', '12oz', '16oz'], // Add more as you expand
		},
		dielineIdentifier: {
			// This could be auto-generated based on packagingType and packagingSize
			// or explicitly set if die-lines are more custom.
			type: String,
			required: true,
			unique: true, // If this is the primary key for finding dieline configs
		},
		generatedDesignVariations: [DesignVariationSchema],
		selectedVariationId: { type: String, required: false },
		status: {
			type: String,
			required: true,
			enum: ['pending', 'generating', 'review', 'completed', 'error'],
			default: 'pending',
		},
		// brandedTextureUrl: { type: String, required: false }, // Awaiting clarification
		// modelUrl: { type: String, required: false },         // Awaiting clarification
	},
	{
		timestamps: true, // Automatically adds createdAt and updatedAt
	}
);

// Indexing suggestion (if you frequently query by user and status)
// ProjectSchema.index({ userId: 1, status: 1 });

// Before saving, you might want to auto-generate the dielineIdentifier
// ProjectSchema.pre('save', function(next) {
//   if (this.isModified('packagingType') || this.isModified('packagingSize')) {
//     this.dielineIdentifier = `${this.packagingType}-${this.packagingSize}`; // Basic example
//   }
//   next();
// });

const Project =
	mongoose.models.Project || model<ProjectDocument>('Project', ProjectSchema);

export default Project;
