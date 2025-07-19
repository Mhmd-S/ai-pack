import { useMemo } from 'react';

interface FontResource {
    src: string;
    data: string;
}

interface FontFamily {
    light?: FontResource;
    normal?: FontResource;
    bold?: FontResource;
}

// Updated interface for the new font props structure
interface FontFamilyProps {
    [familyName: string]: {
        light: string;
        normal: string;
        bold: string;
    };
}

const POPULAR_FONTS = [
    'barlow', 'dm-sans', 'fira-sans', 'heebo', 'hind-siliguri', 'ibm-plex-sans',
    'inconsolata', 'inter', 'jost', 'kanit', 'karla', 'lato',
    'manrope', 'material-symbols-outlined', 'merriweather', 'montserrat', 'mukta', 'mulish',
    'noto-sans', 'noto-sans-jp', 'noto-sans-kr', 'noto-sans-tc', 'noto-serif', 'nunito',
    'nunito-sans', 'open-sans', 'oswald', 'outfit', 'poppins', 'prompt',
    'quicksand', 'raleway', 'roboto', 'roboto-condensed', 'roboto-mono', 'roboto-slab',
    'rubik', 'titillium-web', 'ubuntu', 'work-sans'
];

const WEIGHTS = ['light', 'normal', 'bold'] as const;

export function useFonts() {
    const fontProps = useMemo(() => {
        const props: Record<string, Record<string, string>> = {};
        
        // Generate font props organized by family with weights pointing to JSON URLs
        POPULAR_FONTS.forEach(fontFamily => {
            props[fontFamily] = {
                light: `/fonts/fixed-${fontFamily}-light.json`,
                normal: `/fonts/fixed-${fontFamily}-normal.json`,
                bold: `/fonts/fixed-${fontFamily}-bold.json`
            };
        });
        
        return props;
    }, []);

    const fontFamilies = useMemo(() => {
        const families: Record<string, FontFamily> = {};
        
        POPULAR_FONTS.forEach(fontFamily => {
            families[fontFamily] = {
                light: {
                    src: `/fonts/${fontFamily}-light.png`,
                    data: `/fonts/fixed-${fontFamily}-light.json`
                },
                normal: {
                    src: `/fonts/${fontFamily}-normal.png`,
                    data: `/fonts/fixed-${fontFamily}-normal.json`
                },
                bold: {
                    src: `/fonts/${fontFamily}-bold.png`,
                    data: `/fonts/fixed-${fontFamily}-bold.json`
                }
            };
        });
        
        return families;
    }, []);

    // Helper function to get a specific font family
    const getFont = (family: string, weight: 'light' | 'normal' | 'bold' = 'normal') => {
        const fontKey = `${family}-${weight}`;
        return {
            src: `/fonts/${fontKey}.png`,
            data: `/fonts/fixed-${fontKey}.json`
        };
    };

    // Helper function to get all weights for a font family
    const getFontFamily = (family: string) => {
        return fontFamilies[family];
    };

    // Helper function to get available font families
    const getAvailableFamilies = () => {
        return POPULAR_FONTS;
    };

    return {
        fontProps,           // Fonts organized by family with weights pointing to JSON URLs
        fontFamilies,        // Organized by family and weight with full resource objects
        getFont,             // Get specific font by family and weight
        getFontFamily,       // Get all weights for a family
        getAvailableFamilies // Get list of available font families
    };
}

// Type exports for better TypeScript support
export type { FontResource, FontFamily, FontFamilyProps };

// Constants export
export { POPULAR_FONTS, WEIGHTS }; 