import * as migration_20260827_094616_initial_poc from './20260827_094616_initial_poc';
import * as migration_20260827_144503_r3_catalog_model from './20260827_144503_r3_catalog_model';
import * as migration_20260827_145016_r3_packaging_empty_cells from './20260827_145016_r3_packaging_empty_cells';
import * as migration_20260827_153348_r4_auth_rbac_audit from './20260827_153348_r4_auth_rbac_audit';
import * as migration_20260827_154141_r4_audit_actor_required from './20260827_154141_r4_audit_actor_required';
import * as migration_20260827_230437_r5_review_workflow from './20260827_230437_r5_review_workflow';
import * as migration_20260828_000001_r5_review_fk_integrity from './20260828_000001_r5_review_fk_integrity';
import * as migration_20260916_000001_media_local_upload from './20260916_000001_media_local_upload';
import * as migration_20260920_000001_contact_submissions from './20260920_000001_contact_submissions';
import * as migration_20261011_000001_contact_submissions_locked_documents from './20261011_000001_contact_submissions_locked_documents';
import * as migration_20261011_081958_wordpress_parity from './20261011_081958_wordpress_parity';
import * as migration_20261011_085955_payload_3_90_auth_reset_throttle from './20261011_085955_payload_3_90_auth_reset_throttle';

export const migrations = [
  {
    up: migration_20260827_094616_initial_poc.up,
    down: migration_20260827_094616_initial_poc.down,
    name: '20260827_094616_initial_poc',
  },
  {
    up: migration_20260827_144503_r3_catalog_model.up,
    down: migration_20260827_144503_r3_catalog_model.down,
    name: '20260827_144503_r3_catalog_model',
  },
  {
    up: migration_20260827_145016_r3_packaging_empty_cells.up,
    down: migration_20260827_145016_r3_packaging_empty_cells.down,
    name: '20260827_145016_r3_packaging_empty_cells',
  },
  {
    up: migration_20260827_153348_r4_auth_rbac_audit.up,
    down: migration_20260827_153348_r4_auth_rbac_audit.down,
    name: '20260827_153348_r4_auth_rbac_audit',
  },
  {
    up: migration_20260827_154141_r4_audit_actor_required.up,
    down: migration_20260827_154141_r4_audit_actor_required.down,
    name: '20260827_154141_r4_audit_actor_required',
  },
  {
    up: migration_20260827_230437_r5_review_workflow.up,
    down: migration_20260827_230437_r5_review_workflow.down,
    name: '20260827_230437_r5_review_workflow',
  },
  {
    up: migration_20260828_000001_r5_review_fk_integrity.up,
    down: migration_20260828_000001_r5_review_fk_integrity.down,
    name: '20260828_000001_r5_review_fk_integrity',
  },
  {
    up: migration_20260916_000001_media_local_upload.up,
    down: migration_20260916_000001_media_local_upload.down,
    name: '20260916_000001_media_local_upload',
  },
  {
    up: migration_20260920_000001_contact_submissions.up,
    down: migration_20260920_000001_contact_submissions.down,
    name: '20260920_000001_contact_submissions',
  },
  {
    up: migration_20261011_000001_contact_submissions_locked_documents.up,
    down: migration_20261011_000001_contact_submissions_locked_documents.down,
    name: '20261011_000001_contact_submissions_locked_documents',
  },
  {
    up: migration_20261011_081958_wordpress_parity.up,
    down: migration_20261011_081958_wordpress_parity.down,
    name: '20261011_081958_wordpress_parity',
  },
  {
    up: migration_20261011_085955_payload_3_90_auth_reset_throttle.up,
    down: migration_20261011_085955_payload_3_90_auth_reset_throttle.down,
    name: '20261011_085955_payload_3_90_auth_reset_throttle'
  },
];
