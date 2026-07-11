# OKF Integration

The Open Knowledge Format (OKF) is the primary native ingestion format for AKCP. It provides a standardized, vendor-neutral structure consisting of Markdown content and YAML frontmatter.

## Expected Structure

- **Format Accepted**: Markdown (`.md`) files with strict YAML frontmatter enclosed in `---`.
- **Core Files**: `index.md` (mandatory root index) and `log.md` (optional changelog/history).
- **Mapping to AK-IR**:
  - OKF types map 1:1 to AK-IR entity types.
  - Unknown types are tolerated (loaded dynamically or marked as generic).
  - Unknown keys in the frontmatter are preserved in the IR metadata, preventing data loss for custom attributes.

## Diagnostics

The OKF adapter produces detailed diagnostics during import:

- **Error**: Malformed YAML frontmatter, missing required keys for known types.
- **Warning**: Unknown types detected, broken internal links.
- **Info**: Successful normalizations.
