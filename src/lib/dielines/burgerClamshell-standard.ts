// Example: src/lib/dielines/burgerClamshell-standard.ts

export interface DieLineSectionConfig {
  sectionName: string; // Matches a named element in your SVG or your internal logic
  isAiGenerated: boolean; // Does Flux design this part?
  aspectRatioHint?: { width: number; height: number }; // For Flux, if needed
  // Mask info can be here if complex, or handled in app logic based on sectionName
}

export interface DieLineConfig {
  dielineIdentifier: string;
  sections: DieLineSectionConfig[];
  // You could add SVG path data or references here if your 2D geometry lib needs it directly
  // Or the SVG file itself is loaded separately and sectionNames here map to SVG element IDs
}

export const burgerClamshellStandard: DieLineConfig = {
  dielineIdentifier: "burgerClamshell-standard", // Matches Project.dielineIdentifier
  sections: [
    {
      sectionName: "baseRectangleTop", // The main 200mm x 100mm area
      isAiGenerated: true,
      // Aspect ratio: 200/100 = 2. So, width: 2, height: 1
      aspectRatioHint: { width: 2, height: 1 },
    },
    {
      sectionName: "baseRectangleBottom", // The main 200mm x 100mm area
      isAiGenerated: true,
      // Aspect ratio: 200/100 = 2. So, width: 2, height: 1
      aspectRatioHint: { width: 2, height: 1 },
    },
    {
      sectionName: "supportRectangleBack", // The 200mm x 40mm area
      isAiGenerated: true,
      // Aspect ratio: 200/40 = 5. So, width: 5, height: 1
      aspectRatioHint: { width: 5, height: 1 },
    },
    {
      sectionName: "supportRectangleFront", // The 200mm x 40mm area
      isAiGenerated: true,
      // Aspect ratio: 200/40 = 5. So, width: 5, height: 1
      aspectRatioHint: { width: 5, height: 1 },
    },
    {
      sectionName: "sideTuckInFlapLeft", // One of the 40mm x 100mm
      isAiGenerated: false, // User wants solid color
    },
    {
      sectionName: "sideTuckInFlapRight", // The other 40mm x 100mm
      isAiGenerated: false, // User wants solid color
    },
    {
      sectionName: "frontTuckInFlap", // 100mm x 17.5mm
      isAiGenerated: false,
    },
    {
      sectionName: "supportTuckIn1", // 40mm x 40mm - The tuck ins go clockwise from the top right corner
      isAiGenerated: false,
    },
    {
      sectionName: "supportTuckIn2", // 40mm x 40mm
      isAiGenerated: false,
    },
    {
      sectionName: "supportTuckIn3", // 40mm x 40mm
      isAiGenerated: false,
    },
    {
      sectionName: "supportTuckIn4", // 40mm x 40mm
      isAiGenerated: false,
    },
    // You have "Support Tuck In Inserts: 40mm and 100mm".
    // If there are two, name them uniquely:
    {
      sectionName: "supportTuckInInsertLeft", // 40mm x 100mm
      isAiGenerated: false,
    },
    {
      sectionName: "supportTuckInInsertRight", // 40mm x 100mm
      isAiGenerated: false,
    },
    // Add any other small panels/glue flaps if they might get a color
  ],
};

// You'd have similar files/objects for coffeeCup-12oz.ts, frenchFryCarton-standard.ts etc.