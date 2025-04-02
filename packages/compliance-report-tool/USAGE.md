# Compliance Report Tool Usage

## Running Commands with CSV Arguments

All commands now require a CSV file path as an argument. Here's how to run each command:

### Running Plaid Export

```bash
npm run plaid:export -- path/to/your/input.csv
```

### Running Middesk Export

```bash
npm run middesk:export -- path/to/your/input.csv
```

### Running Plaid Process CSV

```bash
npm run plaid:process -- path/to/your/input.csv
```

### Running the Full Report

```bash
npm run report -- path/to/your/input.csv
```

## Important Notes

- The `--` is necessary when passing arguments to npm scripts
- You can use a relative path (e.g., `gen_test.csv`) or an absolute path
- The output files will be generated in an `_output` directory in the current working directory

## Example

```bash
# Using the included test CSV
npm run middesk:export -- gen_test.csv
```

## Building and Packaging

After making changes to the code, you need to rebuild the package:

```bash
# Just build the code
npm run build

# Build and create a distributable package
npm run build-and-package
```

The package will be created at `compliance-report-tool-simple.zip` and will include:
- bundle.cjs (compiled code)
- gen_compliance_report.sh (shell script)
- gen_test.csv (sample data)
- README.txt (usage instructions) 