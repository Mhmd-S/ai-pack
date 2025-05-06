import mongoose, { ObjectId, Schema, model } from 'mongoose';

export interface ProjectDocument {
	_id: ObjectId; // MongoDB unique ID
	userId: ObjectId; // Reference to the user who owns the project

	// Branding Inputs
	name: string; // Project name/title
	logoUrl: string; // URL to uploaded logo image
	primaryColor: string; // Brand color (hex, e.g. "#ff0000")
	secondaryColor: string; // Brand color (hex, e.g. "#ff0000")

	// Selections
	foodType: string; // "burger" | "fries" | "pizza"
	packagingType: string; // "clamshell" | "pizza_box" | "fry_carton"

	// AI/3D Results
	brandedTextureUrl: string; // (optional) URL to AI-generated texture
	modelUrl: string; // (optional) URL to the 3D model (GLB/GLTF) with branding applied

	// Status & Metadata
	status: string; // "pending" | "processing" | "ready" | "error"
	createdAt: Date;
	updatedAt: Date;
}

const ProjectSchema = new Schema<ProjectDocument>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		logoUrl: {
			type: String,
			required: true,
		},
		primaryColor: {
			type: String,
			required: true,
		},
		secondaryColor: {
			type: String,
			required: true,
		},
		foodType: {
			type: String,
			required: true,
		},
		packagingType: {
			type: String,
			required: true,
		},
		brandedTextureUrl: {
			type: String,
			required: false,
		},
		modelUrl: {
			type: String,
			required: false,
		},
		status: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

const Project =
	mongoose.models.Project || model<ProjectDocument>('Project', ProjectSchema);

export default Project;
