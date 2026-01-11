# Obsidian Snapshot

An Obsidian plugin that exports notes as images (PNG) or PDF files, preserving metadata, titles, and content formatting.

## Features

- **PNG Export**: Convert notes to high-quality PNG images
- **PDF Export**: Generate PDF files using your browser's print functionality
- **Metadata Support**: Include frontmatter properties in exports
- **Title Support**: Add note titles to exports
- **Image Handling**: Automatically convert embedded images for export compatibility
- **Customizable Settings**: Toggle titles and metadata inclusion

## Installation

1. Clone this repository or download the releases
2. Copy the entire folder to your Obsidian vault's `.obsidian/plugins/` directory
3. In Obsidian, go to Settings → Community plugins → Enabled "Obsidian Snapshot"

## Usage

### Export to PNG
- Use the command: **Export current note to Image**
- Or use the ribbon button
- PNG file will be downloaded to your default Downloads folder

### Export to PDF
- Use the command: **Export current note to PDF (Print)**
- Or use the ribbon button
- Browser print dialog will open - select "Save as PDF" option
- Customize print settings as needed (margins, orientation, etc.)

## Settings

Access settings in: Settings → Plugin options → Obsidian Snapshot

- **Include properties**: Toggle frontmatter metadata in exports (default: on)
- **Include title**: Toggle note title in exports (default: on)

## Supported Content

- Text and paragraphs
- Headings (H1-H6)
- Lists (ordered and unordered)
- Code blocks
- Inline code
- Images
- Tables
- Markdown formatting (bold, italic, strikethrough, etc.)

## Technical Details

The plugin uses:
- **HTML-to-Image**: For PNG export (using canvas rendering)
- **Browser Print API**: For PDF export with full control over layout
- **Obsidian Markdown Renderer**: For proper markdown parsing

## Known Limitations

- Some advanced Obsidian markdown extensions may not render perfectly
- Image quality in PNG export depends on the system DPI
- PDF export requires a system that supports the Print API

## Development

### Building
```bash
npm install
npm run build
```

### Project Structure
- `main.ts` - Main plugin code
- `manifest.json` - Plugin metadata
- `esbuild.config.mjs` - Build configuration

## Troubleshooting

**Images not showing in export**:
- Ensure images are embedded in the note
- Check that images are in a supported format (PNG, JPG, GIF, etc.)

**Export creates blank PDF**:
- The print dialog should show a preview - check printer/PDF settings
- Try using a different browser if using Obsidian Web

**Formatting looks wrong**:
- Complex CSS styles from custom Obsidian themes may not export perfectly
- Use standard markdown formatting for best results

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Version**: 1.0.0
**Status**: First fully functional release
