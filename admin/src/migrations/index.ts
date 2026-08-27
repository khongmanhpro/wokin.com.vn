import * as migration_20260827_094616_initial_poc from './20260827_094616_initial_poc';
import * as migration_20260827_144503_r3_catalog_model from './20260827_144503_r3_catalog_model';
import * as migration_20260827_145016_r3_packaging_empty_cells from './20260827_145016_r3_packaging_empty_cells';
import * as migration_20260827_153348_r4_auth_rbac_audit from './20260827_153348_r4_auth_rbac_audit';
import * as migration_20260827_154141_r4_audit_actor_required from './20260827_154141_r4_audit_actor_required';

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
    name: '20260827_154141_r4_audit_actor_required'
  },
];
