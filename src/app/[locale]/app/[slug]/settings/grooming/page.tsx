import { getGroomingConfig, getGroomingKennels } from "../actions";
import { GroomingSettingsClient } from "./grooming-settings-client";

export default async function GroomingSettingsPage() {
  const [config, kennelData] = await Promise.all([
    getGroomingConfig(),
    getGroomingKennels(),
  ]);
  return <GroomingSettingsClient initialConfig={config} initialKennels={kennelData} />;
}
