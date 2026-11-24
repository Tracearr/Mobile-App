import { isServerType, type ServerType } from '@tracearr/shared';

const LOGOS: Record<ServerType, number> = {
  plex: require('../../assets/images/servers/plex.png'),
  jellyfin: require('../../assets/images/servers/jellyfin.png'),
  emby: require('../../assets/images/servers/emby.png'),
  tofa: require('../../assets/images/servers/tofa.png'),
  silo: require('../../assets/images/servers/silo.png'),
};

/** The server type's logo as a bundled asset; none for a type newer than this build. */
export function serverLogo(type: string): number | undefined {
  return isServerType(type) ? LOGOS[type] : undefined;
}
