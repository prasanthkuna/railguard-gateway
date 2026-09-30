import type { EcosystemManifestEntry, EcosystemLogoId } from "./ecosystems.manifest"
import { ECOSYSTEM_MANIFEST } from "./ecosystems.manifest"

export type EcosystemCard = EcosystemManifestEntry & { id: EcosystemLogoId }

export const ECOSYSTEMS: EcosystemCard[] = ECOSYSTEM_MANIFEST

export { ECOSYSTEM_MANIFEST, getEcosystemById } from "./ecosystems.manifest"
