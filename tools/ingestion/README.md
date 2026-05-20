# WooCommerce Ingestion Engine

A production-grade CLI utility for importing 25,000+ products from eBay CSV exports into WooCommerce via WP-CLI.

**Zero dependencies** — uses only the Python 3 standard library.

---

## Features

| Feature | Description |
|---|---|
| **Streamed Processing** | Processes CSV row-by-row via `csv.DictReader` — never loads the full file into memory |
| **Peek (Auto-Detect)** | Reads the first 10 rows and scores each column against keyword dictionaries to auto-detect Title, SKU, Price, Category, etc. |
| **Smart Image Matching** | Ignores the `PicURL` column; instead matches images by SKU in the local `images/` subfolder |
| **MD5 Deduplication** | Hashes every image before import; if the hash already exists in the WordPress media library, reuses the existing attachment |
| **Dynamic Taxonomy** | Reads the eBay category, checks if it exists in WordPress via `wp term exists`, and creates it on the fly if missing |
| **10% Price Reduction** | Applies `price × 0.9` using Python `Decimal` to avoid floating-point rounding errors |
| **SKU Resumability** | Checks for existing SKUs before creating — safe to re-run after a crash or interruption |
| **Dry-Run Mode** | Preview every action without executing any WP-CLI commands |
| **Attribute Extraction** | Automatically detects eBay `C:` prefixed columns (e.g., `C:Brand`, `C:Colour`) as product attributes |

---

## Prerequisites

- **Python 3.6+** (pre-installed on Bluehost)
- **WP-CLI** installed and accessible as `wp` on the server
- **SSH access** to the hosting server

---

## Input Folder Structure

```
/path/to/import/
├── products.csv          # Any .csv file (auto-detected)
└── images/               # Subfolder of product images
    ├── SKU001.jpg
    ├── SKU001-1.jpg       # Additional gallery images
    ├── SKU002.png
    └── ...
```

### Image Naming Convention

Images are matched to products by SKU. The engine normalises filenames by stripping trailing suffixes:

| Filename | Matched SKU |
|---|---|
| `ABC123.jpg` | `ABC123` |
| `ABC123-1.png` | `ABC123` |
| `ABC123_front.webp` | `ABC123` |
| `abc123.jpeg` | `ABC123` (case-insensitive) |

---

## Usage

### Basic Import

```bash
python3 engine.py --csv-dir /home/user/import --wp-path /home/user/public_html
```

### Dry Run (Preview Only)

```bash
python3 engine.py --csv-dir /home/user/import --wp-path /home/user/public_html --dry-run
```

### Fully Automated (No Prompts)

```bash
python3 engine.py --csv-dir /home/user/import --wp-path /home/user/public_html --auto --log-file import.log
```

### All Options

| Flag | Required | Default | Description |
|---|---|---|---|
| `--csv-dir` | ✓ | — | Path to the folder containing the CSV and `images/` subfolder |
| `--wp-path` | ✓ | — | Absolute path to the WordPress installation |
| `--dry-run` | | `false` | Preview without executing WP-CLI commands |
| `--auto` | | `false` | Skip the interactive confirmation after Peek |
| `--log-file` | | `None` | Write detailed logs to this file |
| `--version` | | — | Print version and exit |

---

## How It Works

### 1. Peek — Auto-Detect CSV Headers

The engine reads the first 10 rows and scores each column header against keyword dictionaries:

- **Title keywords**: `title`, `name`, `item title`, `product name`, …
- **SKU keywords**: `sku`, `custom label`, `item number`, …
- **Price keywords**: `price`, `start price`, `buy it now price`, …

It prints the detected mapping with sample values and asks for confirmation (unless `--auto` is set).

### 2. Stream — Row-by-Row Processing

Each CSV row is processed independently:
1. Map eBay headers → internal fields
2. Check if SKU already exists (resumability)
3. Find matching images in the `images/` directory
4. Compute MD5 hashes and deduplicate against the media library
5. Resolve/create product categories
6. Apply the 10% price reduction
7. Create the WooCommerce product via `wp wc product create`

### 3. Summary Report

```
============================================================
INGESTION COMPLETE
============================================================
  ✓ Imported:         1,234
  ⊘ Skipped (Dup):      456
  ✗ Failed:               12
  ⏱ Duration:         01:23:45
============================================================
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `WP-CLI not found` | Ensure `wp` is on your PATH: `which wp` |
| `Permission denied` | Run with the correct user: `sudo -u www-data python3 engine.py ...` |
| `CSV encoding errors` | The engine uses `utf-8-sig` which handles BOM-prefixed files. If your CSV uses a different encoding, convert it first: `iconv -f LATIN1 -t UTF-8 input.csv > output.csv` |
| `No images matched` | Ensure image filenames match your SKUs. Run with `--dry-run` to check matching. |
| `Timeout on large images` | WP-CLI has a 120s timeout per command. For very large images, resize them before import. |

---

## Licence

MIT — Free for commercial use.
