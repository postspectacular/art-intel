# @layerinc/cli

```
█████   │
█████   │ @layerinc/cli v1.0.0
███████ │ Assorted Art Intelligence™ data wrangling tools

Usage: layer <cmd> [opts] input [...]
       layer <cmd> --help
```

## Table of contents

-   [Environment variables](#environment-variables)
-   [Common options](#common-options)
-   [Available commands](#available-commands)
    -   [analyze-colors](#analyze-colors)
    -   [analyze-features](#analyze-features)
    -   [analyze-motion](#analyze-motion)
    -   [blockfs](#blockfs)
    -   [convert-db](#convert-db)
    -   [convert-tsne](#convert-tsne)
    -   [download-thumbs](#download-thumbs)
    -   [extract-frames](#extract-frames)
-   [Usage & workflows](#usage--workflows)
    -   [Database snapshot preparation](#database-snapshot-preparation)
    -   [Asset download](#asset-download)
    -   [Artwork analysis & scoring](#artwork-analysis--scoring)
    -   [Analysis result visualizations](#artwork-analysis--scoring)
        -   [Color analysis results](#color-analysis-results)
        -   [Feature analysis results](#feature-analysis-results)
        -   [Motion analysis results](#motion-analysis-results)

## Environment variables

| **Name**             | **Description**                                                |
| -------------------- | -------------------------------------------------------------- |
| `LAYER_ASSET_DIR`    | Default directory for downloaded thumbnails (images & videos)  |
| `LAYER_ANALYSIS_DIR` | Default directory for analysis results & assets                |
| `LAYER_TMP_DIR`      | Default directory for extracted video frames (image sequences) |
| `LAYER_DB_PATH`      | Default path for database JSON snapshot                        |

## Common options

```text
-q, --quiet                   Disable logging
-v, --verbose                 Display extra information
```

## Available commands

### analyze-colors

Perform color metadata analysis for all or selected artworks

```text
--asset-dir STR               Asset directory containing extracted image sequences. If omitted
                              will use LAYER_TMP_DIR env var
--ext STR                     File type/extension for still frames (default: "png")
--id STR                      [multiple] Asset or variation UUID. If given only these IDs will
                              be processed (otherwise all)
-O STR, --out-dir STR         Output directory (default: "$LAYER_ANALYSIS_DIR")
-s INT, --size INT            Resize image to given size for analysis (default: 256)
--skip INT                    Only process every Nth input frame from the image sequence.
                              (default: 30)
```

### analyze-features

Perform image feature analysis for all or selected artworks

```text
--asset-dir STR               Asset directory containing extracted image sequences. If omitted
                              will use LAYER_TMP_DIR env var
-E STR, --export-dir STR      Export directory for generated debug images
--ext STR                     File type/extension for still frames (default: "png")
--id STR                      [multiple] Asset or variation UUID. If given only these IDs will
                              be processed (otherwise all)
-O STR, --out-dir STR         Output directory (default: "$LAYER_ANALYSIS_DIR")
-s INT, --size INT            Resize image to given size for analysis (default: 128)
--skip INT                    Only process every Nth input frame from the image sequence.
                              (default: 30)
```

### analyze-motion

Perform optical flow analysis for all or selected artworks

```text
Flags:

-d, --delete                  Delete image sequences after use

Main:

--asset-dir STR               Asset directory containing extracted image sequences. If omitted
                              will use LAYER_TMP_DIR env var
--ext STR                     File type/extension for still frames (default: "png")
--id STR                      [multiple] Asset or variation UUID. If given only these IDs will
                              be processed (otherwise all)
-O STR, --out-dir STR         Output directory (default: "$LAYER_ANALYSIS_DIR")
-s INT, --size INT            Resize image to given size for analysis (default: 640)
```

### blockfs

Bundle or list media assets in virtual block file system (currently only used
for [t-SNE visualization generator](../../examples/tsne-viz/))

```text
Flags:

-l, --list                    List files only (no conversion)
-t, --tree                    Tree output (list only)

Main:

-bs BYTES, --block-size BYTES Block size (default: 512)
-e STR, --exclude STR         [multiple] File exclusion regexp
-i STR, --include STR         [multiple] File inclusion regexp
-o STR, --out-file STR        Output file
```

### convert-db

Convert & filter Supabase CSV database snapshot into JSON

```text
Flags:

-a, --all                     Include drafts & unpublished items

Main:

-o STR, --out-file STR        Output file (default: "$LAYER_DB_PATH")
```

### convert-tsne

Convert JSON database and thumbnails for t-SNE visualization

```text
Flags:

--no-bundle                   Disable bundling thumbnails in virtual block file system

Main:

--asset-dir STR               Asset directory containing original thumbnails. If omitted will
                              use $LAYER_ASSET_DIR env var or failing that assumes the same dir
                              as input (JSON database) (default: "$LAYER_ASSET_DIR")
--ext STR                     Thumbnail file type/extension (default: "jpg")
-s PIX, --size PIX            Image size used for t-SNE clustering (default: 8)
-w PIX, --thumb-width PIX     Thumbnail size for visualization (default: 64)
```

### download-thumbs

Download artwork thumbnails (images & videos) from Layer CDN

```text
Flags:

-f, --force                   Force re-download of existing assets
-q, --quiet                   Disable logging
-v, --verbose                 Display extra information

Main:

--cdn-url URL                 Layer CDN base URL (default:
                              "https://video-thumbnail-prod.layer.com")
-O STR, --out-dir STR         Output directory (default: "$LAYER_ASSET_DIR")
-t INT, --throttle INT        Delay (in ms) between asset downloads (default: 1000)
```

### extract-frames

Extract image sequence from given video asset

```text
Flags:

-l, --list-files              Print file paths of extracted frames to stdout

Main:

--asset-dir STR               Asset directory containing extracted image sequences. If omitted
                              will use LAYER_ASSET_DIR env var (default: "$LAYER_ASSET_DIR")
--ext STR                     File type/extension for still frames (default: "png")
--fps INT                     Frame rate (default: 15)
--from INT                    Start time (in seconds) (default: 0)
--id STR                      [multiple] Asset or variation UUID. If given only these IDs will
                              be processed (otherwise all)
-O STR, --out-dir STR         Output directory (default: "$LAYER_TMP_DIR")
--size PIX                    Image size (default: 640)
--to INT                      End time (in seconds) (default: 10)
```

## Usage & workflows

The following example workflows are using these example env variable settings
(e.g. stored in a `.env` file):

```bash
LAYER_ASSET_DIR=20250712-data
LAYER_ANALYSIS_DIR=20250712-analysis
LAYER_TMP_DIR=20250712-tmp
LAYER_DB_PATH=20250712-data/_db.json
```

### Database snapshot preparation

```bash

```

### Asset download

```bash

```

### Artwork analysis & scoring

```bash

```

### Analysis result visualizations

#### Color analysis results

```bash

```

#### Feature analysis results

```bash

```

#### Motion analysis results

```bash

```
