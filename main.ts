import {
	App,
	MarkdownRenderer,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	Notice,
	Component
} from 'obsidian';
import { toPng, toJpeg } from 'html-to-image';

interface ExportSettings {
	imageQuality: number;
	includeProperties: boolean;
	includeTitle: boolean;
}

const DEFAULT_SETTINGS: ExportSettings = {
	imageQuality: 1,
	includeProperties: true,
	includeTitle: true
}

export default class ExportPlus extends Plugin {
	settings!: ExportSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'export-to-image',
			name: 'Export current note to Image',
			callback: () => this.exportNote('image')
		});

		this.addCommand({
			id: 'export-to-pdf',
			name: 'Export current note to PDF (Print)',
			callback: () => this.exportNote('pdf')
		});

		this.addSettingTab(new ExportSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async exportNote(type: 'image' | 'pdf') {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active file found');
			return;
		}

		new Notice(`Preparing ${type} export...`);

		try {
			const container = await this.createExportContainer(activeFile);

			// Append to body temporarily to ensure styles are applied
			document.body.appendChild(container);

			// Debug: Log container content
			console.log('Export container created:', container);
			console.log('Container HTML length:', container.innerHTML.length);
			console.log('Container children count:', container.children.length);

			// Wait for images to load
			await this.waitForImages(container);

			if (type === 'image') {
				await this.exportAsImage(container, activeFile.basename);
			} else {
				await this.exportAsPDF(container);
			}

			// Clean up
			document.body.removeChild(container);
			new Notice('Export successful!');
		} catch (error) {
			console.error('Export failed:', error);
			new Notice('Export failed. Check console for details.');
		}
	}

	async createExportContainer(file: TFile): Promise<HTMLElement> {
		const container = document.createElement('div');
		container.addClass('obsidian-export-plus-container');
		container.addClass('markdown-rendered');
		container.addClass('node-insert-event');
		
		// Apply some basic styling for the container
		container.style.backgroundColor = 'var(--background-primary)';
		container.style.color = 'var(--text-normal)';
		
		container.style.position = 'absolute';
		container.style.left = '-100000px';
		container.style.top = '0';
		container.style.width = '900px';
		container.style.maxWidth = '900px';
		container.style.height = 'auto';
		container.style.overflow = 'visible';
		container.style.padding = '40px';
		container.style.boxSizing = 'border-box';

		// 1. Title
		if (this.settings.includeTitle) {
			const titleEl = container.createEl('h1', { text: file.basename });
			titleEl.addClass('export-title');
		}

		// 2. Properties (Frontmatter)
		if (this.settings.includeProperties) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter) {
				const propsContainer = container.createDiv({ cls: 'oep-metadata-container' });
				propsContainer.createEl('div', { text: 'Properties', cls: 'oep-metadata-properties-heading' });

				const propsTable = propsContainer.createDiv({ cls: 'oep-metadata-content' });
				for (const [key, value] of Object.entries(cache.frontmatter)) {
					if (key === 'position') continue;
					const row = propsTable.createDiv({ cls: 'oep-metadata-property' });
					row.createDiv({ text: key, cls: 'oep-metadata-property-key' });
					row.createDiv({ text: String(value), cls: 'oep-metadata-property-value' });
				}
			}
		}

		// 3. Body
		let content = await this.app.vault.read(file);

		// Remove frontmatter from content to avoid duplicate rendering
		// Frontmatter is enclosed between --- at the start of the file
		const frontmatterRegex = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
		content = content.replace(frontmatterRegex, '');

		const bodyContainer = container.createDiv({ cls: 'markdown-preview-view' });

		// Use MarkdownRenderer to render the content
		// We use a dummy component for lifecycle management
		const component = new Component();
		component.load();
		await MarkdownRenderer.renderMarkdown(content, bodyContainer, file.path, component);
		
		return container;
	}

	async waitForImages(el: HTMLElement) {
		const images = Array.from(el.querySelectorAll('img'));
		const promises = images.map(img => {
			if (img.complete) return Promise.resolve();
			return new Promise(resolve => {
				img.onload = resolve;
				img.onerror = resolve; // Continue anyway on error
			});
		});
		await Promise.all(promises);
	}

	async exportAsImage(el: HTMLElement, filename: string) {
		const dataUrl = await toPng(el, {
			quality: this.settings.imageQuality,
			backgroundColor: 'var(--background-primary)',
		});
		
		const link = document.createElement('a');
		link.download = `${filename}.png`;
		link.href = dataUrl;
		link.click();
	}

	async exportAsPDF(el: HTMLElement) {
		// Convert images to data URLs first
		await this.convertImagesToDataUrls(el);

		console.log('PDF Export - Original element HTML length:', el.innerHTML.length);
		console.log('PDF Export - Original element children:', el.children.length);

		// Create an offscreen iframe for printing (invisible to user)
		const iframe = document.createElement('iframe');
		iframe.style.position = 'fixed';
		iframe.style.width = '210mm';  // A4 width
		iframe.style.height = '297mm'; // A4 height
		iframe.style.top = '-10000px';
		iframe.style.left = '-10000px';
		iframe.style.border = 'none';
		iframe.style.visibility = 'hidden';

		document.body.appendChild(iframe);

		const win = iframe.contentWindow ?? null;
		const doc = iframe.contentDocument ?? win?.document ?? null;
		if (!doc || !win) {
			console.error('Failed to create iframe document');
			document.body.removeChild(iframe);
			return;
		}

		doc.open();
		doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
		doc.close();

		// DON'T copy Obsidian stylesheets - they may hide content
		// Instead, we'll use our own comprehensive styles
		console.log('Skipping Obsidian stylesheets to avoid conflicts');

		// Get computed CSS variables from the root element
		const rootStyles = getComputedStyle(document.documentElement);
		const cssVariables: string[] = [];

		// Extract commonly used Obsidian CSS variables
		const importantVars = [
			'--font-interface',
			'--font-text',
			'--line-height-normal',
			'--text-normal',
			'--text-muted',
			'--text-faint',
			'--background-primary',
			'--background-secondary',
			'--background-secondary-alt',
			'--background-modifier-border',
			'--font-text-size',
			'--h1-size',
			'--h2-size',
			'--h3-size',
			'--h4-size',
			'--h5-size',
			'--h6-size'
		];

		for (const varName of importantVars) {
			const value = rootStyles.getPropertyValue(varName);
			if (value) {
				cssVariables.push(`${varName}: ${value};`);
			}
		}

		// Add comprehensive styles
		const overrideStyle = doc.createElement('style');
		overrideStyle.textContent = `
			* {
				box-sizing: border-box;
			}

			:root {
				${cssVariables.join('\n\t\t\t\t')}
			}

			html, body {
				margin: 0;
				padding: 0;
				background: white !important;
				color: black !important;
				width: 100%;
				height: auto;
				overflow: visible;
			}

			body {
				padding: 20mm;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
				font-size: 14px;
				line-height: 1.6;
			}

			.obsidian-export-plus-container {
				display: block !important;
				position: static !important;
				left: auto !important;
				top: auto !important;
				width: 100% !important;
				max-width: 100% !important;
				height: auto !important;
				overflow: visible !important;
				padding: 0 !important;
				margin: 0 !important;
				background: white !important;
				color: black !important;
				visibility: visible !important;
			}

			.obsidian-export-plus-container * {
				visibility: visible !important;
				display: revert !important;
				max-width: 100%;
				color: inherit;
			}

			/* Title styles */
			.export-title {
				display: block !important;
				font-size: 2em !important;
				font-weight: bold !important;
				margin-bottom: 20px !important;
				padding-bottom: 10px !important;
				border-bottom: 1px solid #ddd !important;
				color: black !important;
			}

			/* Properties/Metadata styles */
			.oep-metadata-container {
				display: block !important;
				margin-bottom: 30px !important;
				padding: 15px !important;
				background-color: #f5f5f5 !important;
				border-radius: 4px !important;
				border: 1px solid #ddd !important;
				visibility: visible !important;
			}

			.oep-metadata-properties-heading {
				display: block !important;
				font-weight: bold !important;
				font-size: 0.8em !important;
				color: #666 !important;
				text-transform: uppercase !important;
				margin-bottom: 10px !important;
				letter-spacing: 0.05em !important;
				visibility: visible !important;
			}

			.oep-metadata-content {
				display: flex !important;
				flex-direction: column !important;
				gap: 8px !important;
				visibility: visible !important;
			}

			.oep-metadata-property {
				display: flex !important;
				align-items: center !important;
				font-size: 0.9em !important;
				visibility: visible !important;
			}

			.oep-metadata-property-key {
				display: inline-block !important;
				width: 150px !important;
				color: #666 !important;
				font-weight: 500 !important;
				visibility: visible !important;
			}

			.oep-metadata-property-value {
				display: inline-block !important;
				flex: 1 !important;
				color: black !important;
				visibility: visible !important;
			}

			/* Markdown content styles */
			.markdown-preview-view {
				display: block !important;
				padding: 0 !important;
				background-color: transparent !important;
				color: black !important;
				visibility: visible !important;
			}

			.markdown-preview-view * {
				visibility: visible !important;
			}

			.markdown-preview-view p {
				display: block !important;
				margin: 1em 0 !important;
				color: black !important;
			}

			.markdown-preview-view h1,
			.markdown-preview-view h2,
			.markdown-preview-view h3,
			.markdown-preview-view h4,
			.markdown-preview-view h5,
			.markdown-preview-view h6 {
				display: block !important;
				font-weight: bold !important;
				margin: 1em 0 0.5em !important;
				color: black !important;
			}

			.markdown-preview-view h1 { font-size: 2em !important; }
			.markdown-preview-view h2 { font-size: 1.5em !important; }
			.markdown-preview-view h3 { font-size: 1.3em !important; }
			.markdown-preview-view h4 { font-size: 1.1em !important; }
			.markdown-preview-view h5 { font-size: 1em !important; }
			.markdown-preview-view h6 { font-size: 0.9em !important; }

			.markdown-preview-view ul,
			.markdown-preview-view ol {
				display: block !important;
				padding-left: 2em !important;
				margin: 1em 0 !important;
			}

			.markdown-preview-view li {
				display: list-item !important;
				margin: 0.5em 0 !important;
			}

			.markdown-preview-view code {
				display: inline !important;
				background-color: #f5f5f5 !important;
				padding: 2px 5px !important;
				border-radius: 3px !important;
				font-family: monospace !important;
			}

			.markdown-preview-view pre {
				display: block !important;
				background-color: #f5f5f5 !important;
				padding: 10px !important;
				border-radius: 5px !important;
				overflow-x: auto !important;
				margin: 1em 0 !important;
			}

			img {
				max-width: 100% !important;
				height: auto !important;
				display: block !important;
				margin: 10px 0 !important;
				visibility: visible !important;
			}

			@media print {
				@page {
					margin: 20mm;
					size: A4;
				}

				html, body {
					background: white !important;
					height: auto !important;
					overflow: visible !important;
				}

				body {
					-webkit-print-color-adjust: exact;
					print-color-adjust: exact;
				}

				* {
					visibility: visible !important;
				}
			}
		`;
		doc.head.appendChild(overrideStyle);

		// Instead of cloning, copy the HTML content directly
		const contentClone = doc.createElement('div');
		contentClone.className = el.className;
		contentClone.innerHTML = el.innerHTML;

		// Don't copy the cssText! Set explicit safe styles instead
		contentClone.style.position = 'static';
		contentClone.style.left = '0';
		contentClone.style.top = '0';
		contentClone.style.width = '100%';
		contentClone.style.maxWidth = '100%';
		contentClone.style.height = 'auto';
		contentClone.style.overflow = 'visible';
		contentClone.style.padding = '0';
		contentClone.style.margin = '0';
		contentClone.style.backgroundColor = 'white';
		contentClone.style.color = 'black';
		contentClone.style.visibility = 'visible';
		contentClone.style.display = 'block';

		console.log('PDF Export - Cloned element HTML length:', contentClone.innerHTML.length);
		console.log('PDF Export - Cloned element children:', contentClone.children.length);

		doc.body.appendChild(contentClone);

		// Wait for all resources to load
		await this.waitForImages(doc.body);

		const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
		if (fonts?.ready) {
			await fonts.ready.catch(() => null);
		}

		// Give extra time for rendering
		await new Promise(resolve => setTimeout(resolve, 1000));

		console.log('PDF Export - iframe body HTML:', doc.body.innerHTML.substring(0, 500));

		// Show a notice to user
		new Notice('Print dialog opening. Click outside to cancel, or print/save as PDF.');

		// Focus and print
		win.focus();
		win.print();

		// Clean up iframe after print dialog closes or after timeout
		const cleanup = () => {
			if (document.body.contains(iframe)) {
				document.body.removeChild(iframe);
			}
		};

		// Listen for afterprint event
		win.addEventListener('afterprint', cleanup);

		// Fallback timeout
		setTimeout(cleanup, 60000);
	}

	async convertImagesToDataUrls(container: HTMLElement) {
		const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];

		for (const img of images) {
			try {
				// Skip if already a data URL
				if (img.src.startsWith('data:')) continue;

				// Create a canvas to convert the image to data URL
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth || img.width;
				canvas.height = img.naturalHeight || img.height;

				const ctx = canvas.getContext('2d');
				if (!ctx) continue;

				ctx.drawImage(img, 0, 0);

				try {
					const dataUrl = canvas.toDataURL('image/png');
					img.src = dataUrl;
				} catch (e) {
					console.warn('Failed to convert image to data URL:', e);
					// Keep original src if conversion fails
				}
			} catch (e) {
				console.warn('Failed to process image:', e);
			}
		}
	}
}

class ExportSettingTab extends PluginSettingTab {
	plugin: ExportPlus;

	constructor(app: App, plugin: ExportPlus) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Include properties')
			.setDesc('Include frontmatter properties in the export')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeProperties)
				.onChange(async (value) => {
					this.plugin.settings.includeProperties = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Include title')
			.setDesc('Include file name as title in the export')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeTitle)
				.onChange(async (value) => {
					this.plugin.settings.includeTitle = value;
					await this.plugin.saveSettings();
				}));
	}
}
