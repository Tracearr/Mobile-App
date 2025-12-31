/**
 * Custom Expo config plugin to create SecureStore backup exclusion rules
 *
 * The expo-secure-store plugin adds references to backup rules in AndroidManifest.xml
 * but doesn't actually create the XML files. This plugin fixes that by creating the
 * necessary XML files to exclude SecureStore SharedPreferences from Android backup.
 *
 * Without these files, Android may backup encrypted tokens but NOT the encryption keys,
 * causing users to be logged out after backup restore (e.g., after app update, device
 * reset, or device transfer).
 *
 * @see https://docs.expo.dev/versions/latest/sdk/securestore/
 */
const { withDangerousMod, withPlugins } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const BACKUP_RULES_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<!-- Backup rules for Android 11 and lower (API <= 30) -->
<!-- Excludes expo-secure-store SharedPreferences from backup because KeyStore is not backed up -->
<full-backup-content>
  <include domain="sharedpref" path="."/>
  <exclude domain="sharedpref" path="SecureStore.xml"/>
</full-backup-content>
`;

const DATA_EXTRACTION_RULES_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<!-- Data extraction rules for Android 12+ (API >= 31) -->
<!-- Excludes expo-secure-store SharedPreferences from cloud backup and device transfer -->
<!-- because KeyStore encryption keys are not backed up, making restored data undecryptable -->
<data-extraction-rules>
  <cloud-backup>
    <include domain="sharedpref" path="."/>
    <exclude domain="sharedpref" path="SecureStore.xml"/>
  </cloud-backup>
  <device-transfer>
    <include domain="sharedpref" path="."/>
    <exclude domain="sharedpref" path="SecureStore.xml"/>
  </device-transfer>
</data-extraction-rules>
`;

const withSecureStoreBackupRules = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const xmlDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      // Create the xml directory if it doesn't exist
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      // Write backup rules for Android 11 and lower
      const backupRulesPath = path.join(xmlDir, 'secure_store_backup_rules.xml');
      fs.writeFileSync(backupRulesPath, BACKUP_RULES_CONTENT);

      // Write data extraction rules for Android 12+
      const extractionRulesPath = path.join(
        xmlDir,
        'secure_store_data_extraction_rules.xml'
      );
      fs.writeFileSync(extractionRulesPath, DATA_EXTRACTION_RULES_CONTENT);

      return config;
    },
  ]);
};

module.exports = withSecureStoreBackupRules;
