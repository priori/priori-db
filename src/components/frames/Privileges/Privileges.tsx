import { PrivilegesList } from './PrivilegesList';
import { PrivilegesTable } from './PrivilegesTable';

export type PrivilegesProps = {
  // eslint-disable-next-line react/no-unused-prop-types
  entityType: 'domain' | 'table' | 'sequence' | 'schema' | 'function';
  privileges: {
    roleName: string;
    host?: string;
    internal?: boolean;
    privileges: { [k: string]: boolean | undefined };
    highlight?: boolean;
  }[];
  privilegesTypes: string[];
  onUpdate: (update: {
    role: string;
    host?: string;
    newPrivilege: boolean;
    privileges: { [k: string]: boolean | undefined };
  }) => Promise<void>;
};

export type RolePrivilegesProps = {
  // eslint-disable-next-line react/no-unused-prop-types
  entitiesType: 'domain' | 'table' | 'sequence' | 'schema' | 'function';
  privileges: {
    schema?: string;
    entityName: string;
    internal?: boolean;
    privileges: { [k: string]: boolean | undefined };
    highlight?: boolean;
  }[];
  privilegesTypes: string[];
  onUpdate: (update: {
    entityName: string;
    schema?: string;
    newPrivilege: boolean;
    privileges: { [k: string]: boolean | undefined };
  }) => Promise<void>;
};

export function Privileges(props: PrivilegesProps) {
  if (props.privilegesTypes.length === 1) return <PrivilegesList {...props} />;
  return <PrivilegesTable {...props} />;
}

export function RolePrivileges(props: RolePrivilegesProps) {
  if (props.privilegesTypes.length === 1) return <PrivilegesList {...props} />;
  return <PrivilegesTable {...props} />;
}
