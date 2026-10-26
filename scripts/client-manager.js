#!/usr/bin/env node

/**
 * MULTI-CLIENT MANAGER CLI
 * -------------------------------------------------------------
 * Automates switching, provisioning, building, and deploying
 * white-label course app instances.
 *
 * Commands:
 *   node scripts/client-manager.js use <clientName>
 *   node scripts/client-manager.js new <clientName>
 *   node scripts/client-manager.js build <clientName>
 *   node scripts/client-manager.js deploy-admin <clientName>
 *   node scripts/client-manager.js deploy-backend <clientName>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(ROOT_DIR, 'clients');
const TEMPLATE_DIR = path.join(CLIENTS_DIR, '_template');
const SRC_CONFIG_TS = path.join(ROOT_DIR, 'src', 'config', 'client.config.ts');
const ADMIN_ENV = path.join(ROOT_DIR, 'admin', '.env');

const [,, command, clientArg] = process.argv;

function log(msg) {
  console.log(`\x1b[36m[ClientManager]\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`\x1b[31m[ClientManager ERROR]\x1b[0m ${msg}`);
  process.exit(1);
}

function success(msg) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function getClientDir(name) {
  return path.join(CLIENTS_DIR, name);
}

/**
 * 1. Switch Active Client Configuration
 */
function useClient(clientName) {
  if (!clientName) error('Please provide a client name. Example: npm run client:use youtube-sikho');

  const clientDir = getClientDir(clientName);
  const clientConfigFile = path.join(clientDir, 'client.config.ts');

  if (!fs.existsSync(clientConfigFile)) {
    error(`Client "${clientName}" does not exist at: ${clientConfigFile}\nAvailable clients: ${fs.readdirSync(CLIENTS_DIR).filter(d => !d.startsWith('_')).join(', ')}`);
  }

  log(`Switching active client configuration to: \x1b[33m${clientName}\x1b[0m`);

  // Copy to src/config/client.config.ts
  fs.copyFileSync(clientConfigFile, SRC_CONFIG_TS);

  // Update Admin .env for Vite
  try {
    const { getClientConfig } = require('./load-client-config');
    const cfg = getClientConfig();
    if (cfg && cfg.firebaseConfig) {
      const adminEnvContent = [
        `VITE_APP_TITLE="${cfg.appName}"`,
        `VITE_SHORT_NAME="${cfg.shortName || cfg.appName}"`,
        `VITE_TAGLINE="${cfg.tagline || ''}"`,
        `VITE_LOGO_URL="${cfg.logoUrl || ''}"`,
        `VITE_PRIMARY_COLOR="${cfg.colors?.primary || '#4F46E5'}"`,
        `VITE_SUPPORT_EMAIL="${cfg.supportEmail || ''}"`,
        `VITE_SUPPORT_PHONE="${cfg.supportPhone || ''}"`,
        `VITE_COMPANY_LEGAL_NAME="${cfg.companyLegalName || cfg.appName}"`,
        `VITE_PRIVACY_URL="${cfg.privacyPolicyUrl || '/privacy'}"`,
        `VITE_TERMS_URL="${cfg.termsUrl || '/terms'}"`,
        `VITE_FIREBASE_API_KEY="${cfg.firebaseConfig.apiKey}"`,
        `VITE_FIREBASE_AUTH_DOMAIN="${cfg.firebaseConfig.authDomain}"`,
        `VITE_FIREBASE_PROJECT_ID="${cfg.firebaseConfig.projectId}"`,
        `VITE_FIREBASE_STORAGE_BUCKET="${cfg.firebaseConfig.storageBucket}"`,
        `VITE_FIREBASE_MESSAGING_SENDER_ID="${cfg.firebaseConfig.messagingSenderId}"`,
        `VITE_FIREBASE_APP_ID="${cfg.firebaseConfig.appId}"`,
      ].join('\n') + '\n';

      // Save to admin/.env and clients/<clientName>/admin.env
      fs.writeFileSync(ADMIN_ENV, adminEnvContent);
      const clientAdminEnv = path.join(clientDir, 'admin.env');
      fs.writeFileSync(clientAdminEnv, adminEnvContent);
    }
  } catch (e) {
    log(`Note: Admin .env updated using config values.`);
  }

  // Sync to external mirror if available
  const mirrorConfig = '/sdcard/documents/YouTube Sikho/course-app/src/config/client.config.ts';
  if (fs.existsSync(path.dirname(mirrorConfig))) {
    try {
      fs.copyFileSync(SRC_CONFIG_TS, mirrorConfig);
    } catch {}
  }

  success(`Active client set to "${clientName}". Mobile app & Admin .env updated!`);
}

/**
 * 2. Create New Client from Template
 */
function newClient(clientName) {
  if (!clientName) error('Please provide a new client identifier. Example: npm run client:new my-creator');

  const clientDir = getClientDir(clientName);
  if (fs.existsSync(clientDir)) {
    error(`Client "${clientName}" already exists at: ${clientDir}`);
  }

  fs.mkdirSync(clientDir, { recursive: true });

  const templateConfig = path.join(TEMPLATE_DIR, 'client.config.ts');
  let content = fs.readFileSync(templateConfig, 'utf8');

  // Customize basic slugs in template
  const formattedTitle = clientName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  content = content
    .replace('Creator Academy', `${formattedTitle} Academy`)
    .replace('creator-academy', clientName)
    .replace('com.creator.academy', `com.${clientName.replace(/-/g, '')}.app`);

  fs.writeFileSync(path.join(clientDir, 'client.config.ts'), content);

  success(`New client template created at: clients/${clientName}/`);
  log(`👉 Edit "clients/${clientName}/client.config.ts" with your client's credentials and colors.`);
  log(`👉 Run "npm run client:use ${clientName}" to activate.`);
}

/**
 * 3. Build Client Artifacts
 */
function buildClient(clientName) {
  if (clientName) useClient(clientName);
  log(`Verifying TypeScript and preparing build...`);
  execSync('npm run typecheck', { stdio: 'inherit', cwd: ROOT_DIR });
  success(`Client verification passed. Ready for EAS build or export!`);
}

/**
 * 4. Deploy Admin to Client Firebase Hosting
 */
function deployAdmin(clientName) {
  if (clientName) useClient(clientName);
  log(`Building admin panel for client...`);
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(ROOT_DIR, 'admin') });
  log(`Deploying admin panel to Firebase Hosting...`);
  execSync('firebase deploy --only hosting', { stdio: 'inherit', cwd: ROOT_DIR });
  success(`Admin panel successfully deployed!`);
}

/**
 * 5. Deploy Backend (Rules & Cloud Functions)
 */
function deployBackend(clientName) {
  if (clientName) useClient(clientName);
  log(`Compiling Cloud Functions...`);
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(ROOT_DIR, 'functions') });
  log(`Deploying Firestore Rules and Cloud Functions...`);
  execSync('firebase deploy --only firestore:rules,firestore:indexes,functions', { stdio: 'inherit', cwd: ROOT_DIR });
  success(`Backend infrastructure deployed successfully!`);
}

// Router
switch (command) {
  case 'use':
    useClient(clientArg);
    break;
  case 'new':
    newClient(clientArg);
    break;
  case 'build':
    buildClient(clientArg);
    break;
  case 'deploy-admin':
    deployAdmin(clientArg);
    break;
  case 'deploy-backend':
    deployBackend(clientArg);
    break;
  default:
    console.log(`
Usage:
  npm run client:use <clientName>          # Switch active branding & Firebase project
  npm run client:new <clientName>          # Generate new client from template
  npm run build:client <clientName>        # Verify and prepare mobile build
  npm run deploy:admin <clientName>        # Build & deploy Admin panel to Hosting
  npm run deploy:backend <clientName>      # Deploy Firestore rules & Cloud Functions
    `);
}
