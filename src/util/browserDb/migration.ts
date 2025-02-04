/* eslint-disable no-console */
import { ConnectionConfiguration } from 'types';
import { Stores } from './entities';

async function migrate2(stores: Stores) {
  const cs = await stores.connectionConfiguration.getAll();
  for (const c of cs) {
    if (!c.type) {
      stores.connectionConfiguration.patch({ id: c.id, type: 'postgres' });
    }
  }
  const conGroups = await stores.connectionGroup.getAll();
  for (const c of conGroups) {
    if (!c.type) {
      stores.connectionGroup.patch({ id: c.id, type: 'postgres' });
    }
  }
  const es = await stores.appExecution.getAll();
  for (const e of es) {
    if (Number.isNaN(e.port))
      stores.appExecution.patch({
        id: e.id,
        port: e.host && e.user ? 5432 : undefined,
      });
    if (e.port === 5432 && !e.host && !e.user)
      stores.appExecution.patch({ id: e.id, port: undefined });
    if (!e.type && e.host && e.user)
      stores.appExecution.patch({ id: e.id, type: 'postgres' });
  }
}

export async function migrate(stores: Stores) {
  const count = await stores.connectionConfiguration.count();
  if (count === 0 && localStorage.getItem('connectionConfigurations')) {
    const cs = JSON.parse(
      localStorage.getItem('connectionConfigurations') || '[]',
    ) as ConnectionConfiguration[];
    for (const c of cs) {
      await stores.connectionConfiguration.add(c);
    }
  }
  await migrate2(stores);
}
