const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
    GOOGLE_FONTS_API_KEY: "",
    PUBLIC_FONTS_DIR: path.join(__dirname, '..', '..', 'public', 'fonts'),
    CHARSET_FILE: path.join(__dirname, '..', 'fonts', 'charset.txt'),
    TEMP_DIR: path.join(__dirname, '..', '..', 'temp'),
    PROJECT_ROOT: path.join(__dirname, '..', '..')
};

class FontProcessor {
    constructor() {
        this.ensureDirectories();
    }

    ensureDirectories() {
        const dirs = [CONFIG.PUBLIC_FONTS_DIR, CONFIG.TEMP_DIR];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async fetchPopularFonts() {
        if (!CONFIG.GOOGLE_FONTS_API_KEY) {
            console.error('❌ Set GOOGLE_FONTS_API_KEY environment variable');
            console.log('Get your key from: https://developers.google.com/fonts/docs/developer_api');
            return null;
        }

        try {
            console.log('🔍 Fetching top 50 most popular fonts from Google Fonts API...');
            const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${CONFIG.GOOGLE_FONTS_API_KEY}&sort=popularity`;
            const response = await this.httpsRequest(url);
            const data = JSON.parse(response);
            
            if (!data.items) throw new Error('Invalid API response');
            
            // Get top 50 most popular fonts
            const top50 = data.items.slice(0, 50);
            console.log(`✅ Found ${top50.length} most popular fonts`);
            
            // Log the font names for reference
            console.log('\n📋 Top 50 fonts to be processed:');
            top50.forEach((font, index) => {
                console.log(`${index + 1}. ${font.family} (${font.category})`);
            });
            
            return top50;
        } catch (error) {
            console.error('❌ Error fetching fonts:', error.message);
            return null;
        }
    }

    async downloadFont(font, variant = 'regular') {
        const fontFile = font.files[variant];
        if (!fontFile) {
            throw new Error(`Variant '${variant}' not found for ${font.family}`);
        }

        const fileName = `${font.family.replace(/\s+/g, '-').toLowerCase()}-${variant}.ttf`;
        const filePath = path.join(CONFIG.TEMP_DIR, fileName);

        console.log(`📥 Downloading ${font.family} (${variant})...`);
        await this.downloadFile(fontFile, filePath);
        return filePath;
    }

    async downloadAllVariants(font) {
        // Only download these specific weights
        const desiredWeights = ['300', '400', 'regular', '700'];
        const availableVariants = Object.keys(font.files);
        
        // Filter to only get the weights we want
        const variantsToDownload = availableVariants.filter(variant => 
            desiredWeights.includes(variant)
        );
        
        if (variantsToDownload.length === 0) {
            console.log(`⚠️  No desired weights found for ${font.family}, skipping...`);
            return [];
        }

        const downloadedFonts = [];
        console.log(`📥 Downloading ${font.family} - ${variantsToDownload.length} weights: ${variantsToDownload.join(', ')}`);

        for (const variant of variantsToDownload) {
            try {
                const fontPath = await this.downloadFont(font, variant);
                
                // Normalize variant names for output
                let weightName = variant;
                if (variant === '300') weightName = 'light';
                if (variant === '400' || variant === 'regular') weightName = 'regular';
                if (variant === '700') weightName = 'bold';
                
                downloadedFonts.push({ variant, path: fontPath, weightName });
            } catch (error) {
                console.error(`❌ Failed to download ${font.family} ${variant}:`, error.message);
            }
        }

        return downloadedFonts;
    }

    async downloadFile(url, filePath) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            https.get(url, response => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Download failed: ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
                file.on('error', reject);
            }).on('error', reject);
        });
    }

    async httpsRequest(url) {
        return new Promise((resolve, reject) => {
            https.get(url, response => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    if (response.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}`));
                    }
                });
            }).on('error', reject);
        });
    }

    async removeOverlaps(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const command = 'fontforge';
            const args = [
                '-lang=ff',
                '-c',
                'Open($1); SelectAll(); RemoveOverlap(); Generate($2)',
                inputPath,
                outputPath
            ];

            const child = spawn(command, args, { stdio: 'inherit' });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FontForge exited with code ${code}`));
                }
            });

            child.on('error', reject);
        });
    }

    async convertToMSDF(ttfPath, outputName) {
        try {
            console.log(`🔄 Converting ${outputName} to MSDF...`);
            
            // Create charset file in temp directory
            const charsetFile = path.join(CONFIG.TEMP_DIR, 'charset.txt');
            const charset = fs.existsSync(CONFIG.CHARSET_FILE) 
                ? fs.readFileSync(CONFIG.CHARSET_FILE, 'utf8').trim()
                : ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
            
            fs.writeFileSync(charsetFile, charset);

            const args = [
                'msdf-bmfont',
                '-f', 'json',
                ttfPath,
                '-i', charsetFile,
                '-m', '256,512',
                '-o', path.join(CONFIG.PUBLIC_FONTS_DIR, outputName),
                '-s', '48'
            ];

            await new Promise((resolve, reject) => {
                const child = spawn('npx', args, { stdio: 'inherit' });

                child.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`MSDF conversion exited with code ${code}`));
                    }
                });

                child.on('error', reject);
            });

            console.log(`✅ Generated ${outputName}.png and ${outputName}.json`);
            return true;
        } catch (error) {
            console.error(`❌ Conversion failed: ${error.message}`);
            return false;
        }
    }

    async processFont(fontPath, outputName, variant) {
        try {
            // Step 1: Remove overlaps with FontForge
            console.log(`🔧 Removing overlaps for ${outputName}...`);
            const fixedPath = path.join(CONFIG.TEMP_DIR, `fixed-${outputName}.ttf`);
            await this.removeOverlaps(fontPath, fixedPath);
            
            // Step 2: Convert to MSDF
            const success = await this.convertToMSDF(fixedPath, outputName);
            
            // Cleanup
            if (fs.existsSync(fixedPath)) {
                fs.unlinkSync(fixedPath);
            }
            
            return success;
        } catch (error) {
            console.error(`❌ Error processing ${outputName}:`, error.message);
            return false;
        }
    }

    cleanup() {
        try {
            if (fs.existsSync(CONFIG.TEMP_DIR)) {
                fs.rmSync(CONFIG.TEMP_DIR, { recursive: true });
                fs.mkdirSync(CONFIG.TEMP_DIR);
            }
        } catch (error) {
            console.log('⚠️  Cleanup failed:', error.message);
        }
    }

    async run() {
        console.log('🎨 Font Processor - Top 50 Most Popular Fonts (All Weights)\n');
        
        // Fetch top 50 fonts
        const fonts = await this.fetchPopularFonts();
        if (!fonts) return;
        
        console.log(`\n🎯 Processing ${fonts.length} fonts with all their weights...`);
        
        let successful = 0;
        let failed = 0;
        let totalVariants = 0;
        
        for (let i = 0; i < fonts.length; i++) {
            const font = fonts[i];
            try {
                console.log(`\n--- Processing ${i + 1}/${fonts.length}: ${font.family} ---`);
                
                // Download all variants of the font
                const downloadedFonts = await this.downloadAllVariants(font);
                totalVariants += downloadedFonts.length;
                
                // Process each variant
                for (const { variant, path: fontPath, weightName } of downloadedFonts) {
                    try {
                        const baseName = font.family.replace(/\s+/g, '-').toLowerCase();
                        const outputName = `${baseName}-${weightName}`;
                        
                        console.log(`🔄 Processing ${font.family} ${weightName}...`);
                        const success = await this.processFont(fontPath, outputName, variant);
                        
                        if (success) {
                            successful++;
                            console.log(`✅ ${font.family} ${weightName} completed successfully`);
                        } else {
                            failed++;
                            console.log(`❌ ${font.family} ${weightName} failed to process`);
                        }
                    } catch (error) {
                        failed++;
                        console.error(`❌ Error processing ${font.family} ${weightName}:`, error.message);
                    }
                }
                
            } catch (error) {
                failed++;
                console.error(`❌ Error processing ${font.family}:`, error.message);
            }
        }
        
        console.log(`\n🎉 Processing complete!`);
        console.log(`📊 Processed ${fonts.length} font families with ${totalVariants} total variants`);
        console.log(`✅ Successfully processed: ${successful} font variants`);
        console.log(`❌ Failed: ${failed} font variants`);
        console.log(`📁 Files saved to: ${CONFIG.PUBLIC_FONTS_DIR}`);
        
        this.cleanup();
    }
}

// Run the processor
const processor = new FontProcessor();
processor.run().catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
});

module.exports = FontProcessor;
