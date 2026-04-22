# Distribution Guide

This guide covers how to distribute the WMS CLI to your operations team.

## Requirements

- **Node.js >= 20.0.0** (required)
- **npm** (comes with Node.js)
- Access to the WMS backend API

## Distribution Methods

### Method 1: npm Registry (Recommended for Teams)

Publish to a private npm registry (GitHub Packages, npm private, or Verdaccio):

```bash
# Build the package
npm run build

# Publish to registry
npm publish

# Users install globally
npm install -g @revota/wms-cli
```

**Pros:**
- Easy updates (`npm update -g @revota/wms-cli`)
- Version management
- Works on all platforms (Linux, macOS, Windows)

**Cons:**
- Requires npm registry access
- Node.js dependency

### Method 2: Direct tarball Distribution

Build and share the tarball directly:

```bash
# Build the package
npm run build

# Create tarball
npm pack

# Distribute revota-wms-cli-0.1.0.tgz to team
```

**Installation:**
```bash
# Install from tarball
npm install -g ./revota-wms-cli-0.1.0.tgz

# Or using npx (no global install)
npx ./revota-wms-cli-0.1.0.tgz <command>
```

**Pros:**
- No registry needed
- Simple file sharing
- Works offline after install

**Cons:**
- Manual updates
- File management

### Method 3: GitHub Releases

Create a GitHub release with the tarball:

1. Build and pack: `npm run build && npm pack`
2. Create GitHub release
3. Attach `revota-wms-cli-0.1.0.tgz`
4. Users download and install

**Installation:**
```bash
# Download from GitHub releases
wget https://github.com/avarevota/wms-cli/releases/download/v0.1.0/revota-wms-cli-0.1.0.tgz

# Install
npm install -g ./revota-wms-cli-0.1.0.tgz
```

**Pros:**
- Version history
- Release notes
- Easy access

**Cons:**
- Manual download step

### Method 4: Docker Container

For teams that prefer Docker:

```dockerfile
FROM node:20-alpine
RUN npm install -g @revota/wms-cli
ENTRYPOINT ["wms"]
```

**Usage:**
```bash
# Build image
docker build -t wms-cli .

# Run commands
docker run --rm -v ~/.config/revota-wms:/root/.config/revota-wms wms-cli list inbounds
```

**Pros:**
- No Node.js install needed
- Consistent environment
- Easy to distribute

**Cons:**
- Docker required
- Config persistence needs volumes

### Method 5: System Package Managers

Create native packages for each OS:

**Linux (deb/rpm):**
```bash
# Using pkg or nexe to create standalone binary
npx pkg dist/index.js -t node20-linux-x64 -o wms
# Create .deb or .rpm package
```

**macOS (Homebrew):**
```ruby
# Create Homebrew formula
class WmsCli < Formula
  desc "Revota WMS CLI"
  homepage "https://github.com/avarevota/wms-cli"
  url "https://github.com/avarevota/wms-cli/archive/v0.1.0.tar.gz"
  
  depends_on "node"
  
  def install
    system "npm", "install"
    system "npm", "run", "build"
    bin.install "dist/index.js" => "wms"
  end
end
```

**Windows (Chocolatey/Scoop):**
```powershell
# Create package manifest for Chocolatey
# or Scoop manifest
```

**Pros:**
- Native installation experience
- No Node.js knowledge needed
- Auto-updates via package manager

**Cons:**
- More complex setup
- Platform-specific builds

## Quick Start for Operations Team

### Option A: Global Install (Recommended)

```bash
# Install globally
npm install -g @revota/wms-cli

# Verify installation
wms --version

# Login
wms login

# Start using
wms list inbounds --limit 10
```

### Option B: Using npx (No Install)

```bash
# Run without installing
npx @revota/wms-cli list inbounds --limit 10

# Or with login
npx @revota/wms-cli login
```

**Note:** npx is slower as it downloads each time. Use global install for regular use.

## Configuration

After installation, users need to configure the API URL:

```bash
# Set API URL (default is http://localhost:3030)
wms config set apiUrl https://wms.yourcompany.com

# Verify
wms config get apiUrl
```

## Authentication

```bash
# Interactive login
wms login

# Or with credentials
wms login -e user@company.com -p password

# Check current user
wms whoami

# Logout
wms logout
```

## Updating

```bash
# Check current version
wms --version

# Update (if using npm registry)
npm update -g @revota/wms-cli

# Or reinstall
npm install -g @revota/wms-cli@latest
```

## Troubleshooting

### "command not found: wms"

**Solution:** Ensure npm global bin directory is in PATH:

```bash
# Check npm prefix
npm prefix -g

# Add to PATH (Linux/macOS)
export PATH="$PATH:$(npm prefix -g)/bin"

# Or use npx
npx @revota/wms-cli <command>
```

### "Cannot find module"

**Solution:** Reinstall the package:

```bash
npm uninstall -g @revota/wms-cli
npm install -g @revota/wms-cli
```

### Permission Errors

**Solution:** Use proper permissions or npx:

```bash
# Fix permissions (Linux/macOS)
sudo chown -R $(whoami) $(npm prefix -g)/lib/node_modules

# Or use npx (avoids permission issues)
npx @revota/wms-cli <command>
```

## Enterprise Considerations

### Private Registry Setup

For internal teams, set up a private npm registry:

1. **GitHub Packages** (if using GitHub):
   ```bash
   # Publish
   npm publish --registry https://npm.pkg.github.com
   
   # Install
   npm install -g @revota/wms-cli --registry https://npm.pkg.github.com
   ```

2. **Verdaccio** (self-hosted):
   ```bash
   # Install Verdaccio
   npm install -g verdaccio
   verdaccio
   
   # Publish to private registry
   npm publish --registry http://localhost:4873
   ```

### Configuration Management

For teams with multiple environments:

```bash
# Development
wms config set apiUrl https://wms-dev.company.com

# Staging
wms config set apiUrl https://wms-stg.company.com

# Production
wms config set apiUrl https://wms.company.com
```

### Shared Credentials

**Note:** Each user should have their own login credentials. Do not share tokens.

## Recommended Approach

For most teams, we recommend:

1. **Publish to private npm registry** (GitHub Packages or Verdaccio)
2. **Document installation** in team onboarding
3. **Provide credentials** to each team member individually
4. **Use global install** for regular users
5. **Use npx** for CI/CD or one-off scripts

## Support

For issues or questions:
- Check `wms --help` for command reference
- Read `docs/KNOWLEDGE.md` for operational guidance
- Report issues at: https://github.com/avarevota/wms-cli/issues
