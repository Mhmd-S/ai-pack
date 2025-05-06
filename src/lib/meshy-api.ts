interface TextureGenerationParams {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  packagingType: string;
  foodType: string;
}

interface TextureGenerationResult {
  success: boolean;
  textureUrl?: string;
  error?: string;
}

export async function generateTexture(params: TextureGenerationParams): Promise<TextureGenerationResult> {
  try {
    // Call the Meshy API for texture generation
    const response = await fetch('https://api.meshy.ai/v1/text-to-texture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: `Restaurant packaging texture for ${params.foodType} in a ${params.packagingType} style. 
                Brand colors are ${params.primaryColor} and ${params.secondaryColor}.
                The logo should be prominently featured on the packaging.`,
        logo_url: params.logoUrl,
        style: 'realistic',
        // Additional Meshy parameters as needed
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Texture generation failed');
    }
    
    const data = await response.json();
    
    return {
      success: true,
      textureUrl: data.texture_url || data.result_url,
    };
  } catch (error) {
    console.error('Meshy API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Texture generation failed',
    };
  }
}