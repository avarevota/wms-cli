# Publishing to GitHub Packages

This guide explains how to publish the WMS CLI to GitHub Packages registry.

## Prerequisites

1. **GitHub Account** - You need a GitHub account
2. **Personal Access Token (PAT)** - With package permissions
3. **Node.js >= 20** - For running npm commands

## Step 1: Create Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Give it a name: `WMS CLI Package Publish`
4. Select scopes:
   - ✅ `read:packages` - Read packages
   - ✅ `write:packages` - Publish packages
   - ✅ `delete:packages` - Delete packages (optional)
5. Click **Generate token**
6. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)

## Step 2: Authenticate with GitHub Packages

Run this command and enter your credentials:

```bash
npm login --scope=@revota --auth-type=legacy --registry=https://npm.pkg.github.com

> Username: YOUR_GITHUB_USERNAME
> Password: YOUR_PERSONAL_ACCESS_TOKEN
```

**Note**: Use your **Personal Access Token** as the password, not your GitHub password.

## Step 3: Verify Authentication

Check that you're authenticated:

```bash
npm whoami --registry=https://npm.pkg.github.com
# Should show your GitHub username
```

## Step 4: Publish the Package

```bash
# Make sure you're in the project directory
cd wms-cli

# Build the project
npm run build

# Publish to GitHub Packages
npm publish
```

## Step 5: Verify Publication

Check that the package was published:

1. Go to: https://github.com/avarevota/wms-cli/packages
2. You should see `@revota/wms-cli` listed

## Installing for Operations Team

Once published, your operations team can install it:

### Method 1: Using .npmrc file (Recommended)

Create a `.npmrc` file in their home directory:

```bash
# ~/.npmrc
@revota:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_PERSONAL_ACCESS_TOKEN
```

Then install:
```bash
npm install -g @revota/wms-cli
```

### Method 2: Using npm login

```bash
npm login --scope=@revota --auth-type=legacy --registry=https://npm.pkg.github.com
# Enter GitHub username and Personal Access Token

npm install -g @revota/wms-cli
```

### Method 3: One-time install with token

```bash
npm install -g @revota/wms-cli \
  --registry=https://npm.pkg.github.com \
  --//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

## Updating the Package

When you release a new version:

1. Update version in `package.json`
2. Build: `npm run build`
3. Publish: `npm publish`

Users can update with:
```bash
npm update -g @revota/wms-cli
```

## Troubleshooting

### "404 Not Found" when installing

**Cause**: Not authenticated or no access to package

**Solution**:
```bash
# Verify authentication
npm whoami --registry=https://npm.pkg.github.com

# If not authenticated, login again
npm login --scope=@revota --auth-type=legacy --registry=https://npm.pkg.github.com
```

### "E403 Forbidden" when publishing

**Cause**: Token doesn't have write permissions

**Solution**: Create a new token with `write:packages` scope

### "Package already exists"

**Cause**: Version already published

**Solution**: Update version in `package.json` before publishing

### "ENOTFOUND npm.pkg.github.com"

**Cause**: Network or DNS issue

**Solution**: Check internet connection and try again

## Security Notes

1. **Never commit your PAT** to the repository
2. **Use fine-grained tokens** when possible (GitHub's new token type)
3. **Rotate tokens regularly** (every 90 days recommended)
4. **Store tokens securely** (password manager, not plain text)
5. **Token scope**: Only grant `read:packages` to operations team members

## Alternative: GitHub Actions (Automated Publishing)

You can automate publishing with GitHub Actions:

```yaml
# .github/workflows/publish.yml
name: Publish Package
on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This automatically publishes when you create a GitHub release.

## Support

For issues with GitHub Packages:
- GitHub Docs: https://docs.github.com/en/packages
- GitHub Support: https://support.github.com
